import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_ORIGINS = [
  'https://icdlu.org',
  'https://www.icdlu.org',
  'https://racdlu.org',
  'https://www.racdlu.org',
];

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req.headers.get('origin')) })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Internal configuration error' }), {
        status: 500,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      });
    }

    // Step 1: verify the caller has a valid Supabase JWT using the anon key + their Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Step 2: query the users table to confirm caller's role is admin or master_admin — return 403 if not
    const { data: callerProfile, error: profileError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile || !['admin', 'master_admin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      });
    }

    // Step 3: parse the request body and validate that email, password, name, role are all present and that password is at least 8 characters — return 400 with a clear error message if not
    let body;
    try {
      body = await req.json();
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // ICDLU approval path (ADDITIVE — only runs when `application_id` is
    // sent; every other request falls through to the original logic
    // below completely unchanged, so AdminMembers' "Add member" and all
    // RACDLU behaviour are untouched).
    //
    // The applicant's password is decrypted here, server-side, from the
    // default-deny application_credentials table and NEVER returned to
    // the browser. See supabase/migrations/20260920_icdlu_application_flow.sql.
    // ─────────────────────────────────────────────────────────────────
    if (body && typeof body === 'object' && body.application_id) {
      const jsonHeaders = { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' };
      const fail = (status: number, error: string) =>
        new Response(JSON.stringify({ error }), { status, headers: jsonHeaders });

      const applicationId = String(body.application_id);

      const { data: app, error: appErr } = await adminClient
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();
      if (appErr || !app) return fail(404, 'Application not found');

      // Scope: this path exists for ICDLU only.
      if (app.tenant_id !== 'icdlu') return fail(400, 'This approval flow is only available for ICDLU');

      // Regular admins may only act on their own club; master admin may act on either.
      const { data: callerFull } = await adminClient
        .from('users')
        .select('tenant_id, role, role_id')
        .eq('id', user.id)
        .single();
      let callerIsSystem = callerProfile.role === 'master_admin';
      if (!callerIsSystem && callerFull?.role_id) {
        const { data: roleRow } = await adminClient
          .from('roles').select('is_system').eq('id', callerFull.role_id).single();
        callerIsSystem = roleRow?.is_system === true;
      }
      if (!callerIsSystem && callerFull?.tenant_id !== 'icdlu') return fail(403, 'Forbidden');

      // Idempotency: already created → succeed without duplicating.
      if (app.account_created_at && app.created_user_id) {
        return new Response(JSON.stringify({ success: true, uid: app.created_user_id, alreadyCreated: true }), {
          status: 200, headers: jsonHeaders,
        });
      }

      // Server-side enforcement of the payment gate (the UI check alone is not enough).
      if (app.payment_status !== 'verified') {
        return fail(400, 'Payment must be marked Paid before the account can be created');
      }
      if (!app.email || !app.name) return fail(400, 'Application is missing a name or email');

      // Resolve the club's default (protected, non-system) Member role.
      let memberRoleId: string | null = null;
      {
        const { data: protectedRole } = await adminClient
          .from('roles').select('id')
          .eq('tenant_id', 'icdlu').eq('is_protected', true).eq('is_system', false)
          .limit(1).maybeSingle();
        memberRoleId = protectedRole?.id ?? null;
        if (!memberRoleId) {
          const { data: namedRole } = await adminClient
            .from('roles').select('id')
            .eq('tenant_id', 'icdlu').eq('name', 'member').limit(1).maybeSingle();
          memberRoleId = namedRole?.id ?? null;
        }
      }
      if (!memberRoleId) return fail(500, 'Default Member role is not configured for ICDLU');

      const { data: pwRow, error: pwErr } = await adminClient.rpc('icdlu_take_application_password', {
        p_application_id: applicationId,
      });
      if (pwErr || !pwRow || typeof pwRow !== 'string') {
        return fail(400, 'No stored password for this application. Ask the applicant to re-save their application with a password.');
      }

      // Refuse to clobber an existing account with the same email.
      const { data: existing } = await adminClient
        .from('users').select('id').eq('email', app.email).eq('tenant_id', 'icdlu').limit(1).maybeSingle();
      if (existing) return fail(409, 'A member with this email already exists');

      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: app.email,
        password: pwRow,
        email_confirm: true,
        user_metadata: { name: app.name },
      });
      if (createErr || !created?.user) return fail(400, createErr?.message || 'Failed to create auth user');

      const newId = created.user.id;

      // memberId — same {PREFIX}-{YEAR}-{NNN} scheme as AdminMembers.generateMemberId.
      const joiningDate: string = app.joiningDate || new Date().toISOString().split('T')[0];
      const idYear = new Date(`${joiningDate}T00:00:00`).getFullYear();
      const idRange = new Date(`${joiningDate}T00:00:00`) < new Date('2026-07-01T00:00:00')
        ? { min: 1, max: 100 } : { min: 101, max: 999 };
      const { data: siblings } = await adminClient
        .from('users').select('memberId').eq('tenant_id', 'icdlu').like('memberId', `IC-${idYear}-%`);
      let highest = idRange.min - 1;
      for (const s of siblings || []) {
        const m = typeof s.memberId === 'string' ? s.memberId.match(new RegExp(`^IC-${idYear}-(\\d{3})$`)) : null;
        if (!m) continue;
        const n = parseInt(m[1], 10);
        if (n >= idRange.min && n <= idRange.max && n > highest) highest = n;
      }
      if (highest + 1 > idRange.max) {
        await adminClient.auth.admin.deleteUser(newId);
        return fail(500, `Member ID range ${idRange.min}-${idRange.max} for IC-${idYear} is exhausted`);
      }
      const memberId = `IC-${idYear}-${String(highest + 1).padStart(3, '0')}`;

      const { error: userInsertErr } = await adminClient.from('users').insert({
        id: newId,
        tenant_id: 'icdlu',
        email: app.email,
        name: app.name,
        // Legacy text `role` column: the login redirect + several hooks read
        // it. A plain member is 'member' (the column default); it is NOT the
        // role_id uuid. Admin/master_admin are only ever set by admins.
        role: 'member',
        role_id: memberRoleId,
        status: 'active',
        memberId,
        photo: app.photo || null,
        phone: app.phone || null,
        dob: app.dob || null,
        gender: app.gender || null,
        bloodGroup: app.bloodGroup || null,
        school: app.school || null,
        grade: app.grade || null,
        class: app.class || null,
        bio: app.bio || null,
        emergencyContact: app.emergencyContact || null,
        // Member-facing profile page reads emergencyPhone; mirror so the
        // profile-completion % and dashboard aren't left blank.
        emergencyPhone: app.emergencyContact || null,
        joiningDate,
        rotaryYear: app.rotaryYear || null,
        duesPaid: false,
      });
      if (userInsertErr) {
        await adminClient.auth.admin.deleteUser(newId);
        return fail(400, userInsertErr.message);
      }

      await adminClient
        .from('applications')
        .update({ account_created_at: new Date().toISOString(), created_user_id: newId })
        .eq('id', applicationId);
      await adminClient.rpc('icdlu_discard_application_password', { p_application_id: applicationId });

      return new Response(JSON.stringify({ success: true, uid: newId, memberId }), {
        status: 200, headers: jsonHeaders,
      });
    }

    const { email, password, name, role, status, tenant_id, ...rest } = body;
    if (!email || !password || !name || !role || !tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, name, role, tenant_id' }), {
        status: 400,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      });
    }

    if (tenant_id !== 'icdlu' && tenant_id !== 'racdlu') {
      return new Response(JSON.stringify({ error: 'Invalid tenant_id. Must be icdlu or racdlu.' }), {
        status: 400,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      });
    }

    // Step 4: use the service role key (SUPABASE_SERVICE_ROLE_KEY from Deno.env) to call adminClient.auth.admin.createUser with email_confirm: true and user_metadata: { name }
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError || !newUser?.user) {
      return new Response(JSON.stringify({ error: createError?.message || 'Failed to create auth user' }), {
        status: 400,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      });
    }

    // Step 5: insert the new user into the users table with id, email, name, role, status, tenant_id and any other fields from the body
    const { error: insertError } = await adminClient
      .from('users')
      .insert({
        id: newUser.user.id,
        email,
        name,
        role,
        tenant_id,
        status: status || 'active',
        ...rest,
      });

    // Step 6: if the users table insert fails, rollback by deleting the auth user with adminClient.auth.admin.deleteUser, then return the error
    if (insertError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      });
    }

    // Return { success: true, uid: newUser.user.id } on success
    return new Response(JSON.stringify({ success: true, uid: newUser.user.id }), {
      status: 200,
      headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
    });

  } catch (_err) {
    // Catch all errors and return { error: 'Internal server error' } with status 500 — never leak stack traces
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
    });
  }
})
