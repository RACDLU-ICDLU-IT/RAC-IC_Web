import { supabase } from '../supabase';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { useTenant } from '../hooks/useTenant';
import { useDues } from '../hooks/useDues';
import SEOHead from '../components/SEOHead';
import { CloudinaryUpload } from '../components/CloudinaryUpload';

// Validation Schema
const joinSchema = z.object({
  name: z.string().min(2, 'Full name is required (min 2 characters)'),
  email: z.string().email('A valid email address is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Please select your gender'),
  bloodGroup: z.string().min(1, 'Please select your blood group'),
  phone: z.string().min(5, 'A valid phone number is required'),
  emergencyContact: z.string().min(3, 'Emergency contact information is required'),
  address: z.string().min(5, 'Residential address is required'),
  referredBy: z.string().optional(),
});

type JoinFormData = z.infer<typeof joinSchema>;

// Payment submission schema
const paymentSchema = z.object({
  senderNumber: z
    .string()
    .min(5, 'Enter the bKash number you sent money from')
    .regex(/^[0-9+ ]+$/, 'Enter a valid phone number'),
  transactionId: z.string().min(4, 'Enter the Transaction ID from your bKash SMS'),
});
type PaymentFormData = z.infer<typeof paymentSchema>;

// Shared "← Go Back" button style used across all steps
const GO_BACK_CLASS =
  'block w-full text-center text-white text-sm transition-opacity mt-2 opacity-100 hover:opacity-70';

type Step =
  | 'eligibility'
  | 'code-check'
  | 'conditions'
  | 'form'
  | 'payment'
  | 'success'
  | 'ineligible'
  | 'status'
  | 'reconsideration-submitted';

// applications.payment_status values
type PaymentStatus = 'unpaid' | 'pending_verification' | 'verified' | 'rejected';

const PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h primary window
const GRACE_WINDOW_MS = 24 * 60 * 60 * 1000; // +24h grace after that (72h total)

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Self-contained countdown for the 48h primary payment window and the
 * following 24h grace period (72h total from application.createdAt),
 * matching the exact same math as the expire_unpaid_applications RPC —
 * both compute off createdAt + fixed hour offsets, so the number shown
 * here and the actual server-side cutoff can never drift apart. Ticks
 * on its own internal interval so only this small block re-renders
 * every second, not the entire Join page.
 *
 * This is purely a DISPLAY. The actual cancellation only ever happens
 * server-side via expire_unpaid_applications (triggered client-side on
 * page load elsewhere in this file, and admin-side in
 * AdminApplications.tsx) — this component doesn't call anything, it
 * just reflects whatever state createdAt implies right now. If the
 * applicant sits on this screen past the 72h mark without reloading,
 * it will locally show "Time's Up" even before the next RPC call
 * actually flips the row — onExpired lets the parent react to that
 * (e.g. prompt a refresh) without this component owning any mutation.
 */
function PaymentCountdown({ createdAt, onExpired }: { createdAt: string; onExpired?: () => void }) {
  const [now, setNow] = useState(() => Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const createdMs = new Date(createdAt).getTime();
  const primaryDeadline = createdMs + PAYMENT_WINDOW_MS;
  const graceDeadline = createdMs + PAYMENT_WINDOW_MS + GRACE_WINDOW_MS;

  const inPrimaryWindow = now < primaryDeadline;
  const inGraceWindow = !inPrimaryWindow && now < graceDeadline;
  const expired = now >= graceDeadline;

  const wasExpiredRef = React.useRef(false);
  React.useEffect(() => {
    if (expired && !wasExpiredRef.current) {
      wasExpiredRef.current = true;
      onExpired?.();
    }
  }, [expired, onExpired]);

  if (expired) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
      >
        <p className="text-sm font-bold" style={{ color: '#dc2626' }}>
          Payment Time Has Expired
        </p>
        <p className="text-xs mt-1" style={{ color: '#991b1b' }}>
          This application has been automatically canceled.
        </p>
      </div>
    );
  }

  const remainingMs = inPrimaryWindow ? primaryDeadline - now : graceDeadline - now;

  return (
    <div
      className="rounded-2xl p-5 text-center"
      style={
        inGraceWindow
          ? { backgroundColor: '#fef3c7', border: '1px solid #fde68a' }
          : { backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }
      }
    >
      <p
        className="text-xs font-bold uppercase tracking-wider mb-1.5"
        style={{ color: inGraceWindow ? '#b45309' : '#1d4ed8' }}
      >
        {inGraceWindow ? 'Grace Period — Pay Now' : 'Time Remaining to Pay'}
      </p>
      <p
        className="text-3xl font-bold font-mono tracking-wider"
        style={{ color: inGraceWindow ? '#92400e' : '#1e3a8a' }}
      >
        {formatCountdown(remainingMs)}
      </p>
      <p className="text-xs mt-1.5" style={{ color: inGraceWindow ? '#b45309' : '#3b82f6' }}>
        {inGraceWindow
          ? 'Your 48-hour window has passed. You have a final 24 hours before this application is automatically canceled.'
          : 'Complete payment within 48 hours of applying, or an additional 24-hour grace period will apply before automatic cancellation.'}
      </p>
    </div>
  );
}

export default function Join() {
  const { tenant } = useTenant();
  const isRotaract = tenant.id === 'racdlu';
  const clubTypeName = isRotaract ? 'Rotaract' : 'Interact';
  const ageRange = isRotaract ? '18 and 30 years old' : '12 and 18 years old';

  const [ineligibleReason, setIneligibleReason] = useState<'under' | 'over' | null>(null);

  const getIneligibleContent = () => {
    if (isRotaract) {
      if (ineligibleReason === 'under') {
        return {
          message:
            'Rotaract is for young adults aged 18–30. If you are under 18, consider joining Interact instead.',
          buttons: [
            {
              label: 'Join Interact',
              href: 'https://www.icdlu.org/join',
              variant: 'secondary' as const,
            },
          ],
        };
      }
      return {
        message:
          'Rotaract is for young adults aged 18–30. If you are over 30, consider joining Rotary Club instead.',
        buttons: [
          {
            label: 'Join Rotary Club',
            href: 'https://rcdlu.org/join-us/',
            variant: 'secondary' as const,
          },
        ],
      };
    } else {
      return {
        message:
          "Interact is specifically for youth aged 12–18. If you're older, consider joining Rotaract (ages 18+) or a local Rotary club.",
        buttons: [
          {
            label: 'Join Rotaract',
            href: 'https://www.racdlu.org/join',
            variant: 'secondary' as const,
          },
        ],
      };
    }
  };

  const [step, setStep] = useState<Step>('eligibility');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState<any>({});
  const { addToast } = useToast();
  const { fetchDuesSettings } = useDues();

  const [inviteCode, setInviteCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPublicId, setPhotoPublicId] = useState('');

  // Reference number pulled from the invitation code's admin-set label
  // (per club policy: Label doubles as the applicant-facing reference
  // number — see check_application_code RPC).
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  // The application row itself, once one exists (either just created
  // by this session, or found on a repeat code-check for an existing
  // applicant). This is the single source of truth for the
  // status / payment views.
  const [application, setApplication] = useState<any>(null);

  // Application fee + bKash number, pulled from admin Dues Settings
  // (useDues) — NOT hardcoded, since the admin can change these.
  const [applicationFee, setApplicationFee] = useState<number | null>(null);
  const [bkashNumber, setBkashNumber] = useState<string>('');
  const [feeLoading, setFeeLoading] = useState(false);

  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [isRequestingReconsideration, setIsRequestingReconsideration] = useState(false);

  // Membership Conditions & Dues gate — shown once, only for first-time
  // applicants, right before the blank form. Text is admin-set per
  // tenant (dues_settings.membership_conditions_text); if it's empty or
  // null, the gate is skipped entirely and the form loads directly, per
  // club policy. Fetched lazily (only when actually needed, i.e. on a
  // first-time code verification) rather than eagerly on mount, since
  // most page loads never reach this step at all (returning applicants
  // go straight to status).
  const [membershipConditionsText, setMembershipConditionsText] = useState<string>('');
  const [agreedToConditions, setAgreedToConditions] = useState(false);

  const isLight = tenant.brand.primaryColor === '#FFFFFF';

  // Compute allowed DOB range based on club type
  const getDobRange = () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (isRotaract) {
      const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      const minDate = new Date(today.getFullYear() - 80, today.getMonth(), today.getDate());
      return { min: fmt(minDate), max: fmt(maxDate) };
    } else {
      const maxDate = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate());
      const minRaw = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      minRaw.setDate(minRaw.getDate() + 1);
      return { min: fmt(minRaw), max: fmt(maxDate) };
    }
  };

  const dobRange = getDobRange();

  // FIX: double-rAF ensures scroll fires after first paint on mobile WebView,
  // solving the sidebar-navigation-lands-at-footer issue
  React.useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
    });
  }, [step]);

  React.useEffect(() => {
    supabase
      .from('page_content')
      .select('data')
      .eq('id', 'pageContent')
      .eq('tenant_id', tenant.id)
      .single()
      .then(({ data }) => {
        if (data && data.data) {
          setContent(data.data);
        }
      });
  }, [tenant.id]);

  // Pull application fee + bKash number from admin Dues Settings.
  // Fetched once eagerly (not lazily on payment step) so the payment
  // step never has to show a loading flash for something this cheap
  // to fetch upfront.
  React.useEffect(() => {
    setFeeLoading(true);
    fetchDuesSettings()
      .then((s: any) => {
        setApplicationFee(typeof s?.application_fee === 'number' ? s.application_fee : 0);
        setBkashNumber(s?.default_bkash_number || '');
      })
      .catch(() => {
        setApplicationFee(0);
        setBkashNumber('');
      })
      .finally(() => setFeeLoading(false));
  }, [tenant.id]);

  const {
    register,
    handleSubmit,
    reset: resetJoinForm,
    formState: { errors },
  } = useForm<JoinFormData>({
    resolver: zodResolver(joinSchema),
  });

  const {
    register: registerPayment,
    handleSubmit: handlePaymentSubmit,
    formState: { errors: paymentErrors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const checkEligibility = (eligible: boolean, reason?: 'under' | 'over') => {
    if (eligible) {
      setStep('code-check');
    } else {
      setIneligibleReason(reason || 'under');
      setStep('ineligible');
    }
  };

  // Whether the existing application's core fields can still be edited.
  // Per club policy: editable while pending, but NEVER once a decision
  // has been made either way — approved is locked in, and rejected is
  // also locked (requesting reconsideration does not reopen editing;
  // it only asks the board to take another look at what's on file).
  const isApplicationEditable = (app: any) => {
    if (!app) return false;
    const status = (app.status || 'pending').toLowerCase();
    return status !== 'approved' && status !== 'rejected';
  };

  const onSubmit = async (data: JoinFormData) => {
    setIsSubmitting(true);
    const trimmedCode = inviteCode.trim().toUpperCase();
    try {
      if (application) {
        // Existing application — update via RPC rather than a raw
        // update, since eligibility to edit (approved/rejected gating)
        // is enforced server-side there too.
        const { data: result, error } = await supabase.rpc('upsert_application', {
          p_code: trimmedCode,
          p_tenant_id: tenant.id,
          p_data: {
            name: data.name,
            email: data.email,
            dob: data.dob,
            gender: data.gender,
            bloodGroup: data.bloodGroup,
            phone: data.phone,
            emergencyContact: data.emergencyContact,
            address: data.address,
            referredBy: data.referredBy || '',
            photo: photoUrl || application.photo,
          },
        });
        if (error) throw error;
        if (!result?.ok) {
          addToast(result?.message || 'Could not update application.', 'error');
          setIsSubmitting(false);
          return;
        }
        setApplication(result.application);
        setStep('status');
        addToast('Application updated.', 'success');
        return;
      }

      // First-time submission
      const { data: inserted, error: insertError } = await supabase
        .from('applications')
        .insert({
          name: data.name,
          email: data.email,
          dob: data.dob,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          phone: data.phone,
          emergencyContact: data.emergencyContact,
          address: data.address,
          referredBy: data.referredBy || '',
          photo: photoUrl,
          codeUsed: trimmedCode,
          tenant_id: tenant.id,
          status: 'pending',
          payment_status: 'unpaid',
          reference_number: referenceNumber || null,
          application_fee: applicationFee,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // Mark the code as used NOW (only after successful submission)
      await supabase.rpc('consume_application_code', {
        p_code: trimmedCode,
        p_tenant_id: tenant.id,
      });

      setApplication(inserted);
      setStep('payment');
    } catch (err: any) {
      console.error('Application submit error:', err);
      addToast('Failed to submit application. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitPayment = async (data: PaymentFormData) => {
    if (!application) return;
    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.rpc('submit_application_payment', {
        p_application_id: application.id,
        p_tenant_id: tenant.id,
        p_sender_number: data.senderNumber.trim(),
        p_transaction_id: data.transactionId.trim(),
      });
      if (error) throw error;
      if (!result?.ok) {
        addToast(result?.message || 'Could not submit payment details.', 'error');
        setIsSubmitting(false);
        return;
      }
      setApplication({
        ...application,
        payment_status: 'pending_verification',
        payment_sender_number: data.senderNumber.trim(),
        payment_transaction_id: data.transactionId.trim(),
      });
      setStep('status');
      addToast('Payment details submitted for verification.', 'success');
    } catch (err: any) {
      console.error('Payment submit error:', err);
      addToast('Failed to submit payment details. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReconsideration = async () => {
    if (!application) return;
    setIsRequestingReconsideration(true);
    try {
      const { data: result, error } = await supabase.rpc('request_reconsideration', {
        p_application_id: application.id,
        p_tenant_id: tenant.id,
      });
      if (error) throw error;
      if (!result?.ok) {
        addToast(result?.message || 'Could not submit request.', 'error');
        return;
      }
      setApplication({ ...application, reconsideration_requested: true });
      setStep('reconsideration-submitted');
    } catch (err) {
      console.error('Reconsideration request error:', err);
      addToast('Failed to submit request. Please try again.', 'error');
    } finally {
      setIsRequestingReconsideration(false);
    }
  };

  // Fetches the tenant's Membership Conditions & Dues text. Returns ''
  // if unset — callers treat that as "no gate needed, skip straight to
  // form" per club policy. Uses the same dues_settings table/RLS path
  // as application fee / bKash number (see fetchDuesSettings), so no
  // separate anon-read policy is needed.
  const fetchMembershipConditions = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('dues_settings')
        .select('membership_conditions_text')
        .eq('tenant_id', tenant.id)
        .maybeSingle();
      if (error) {
        console.warn('[join] membership conditions fetch failed', error);
        return '';
      }
      return (data?.membership_conditions_text || '').trim();
    } catch {
      return '';
    }
  };

  const handleVerifyCode = async () => {
    const trimmed = inviteCode.trim().toUpperCase();
    if (trimmed.length !== 12) {
      setCodeError('Please enter a complete 12-character code.');
      return;
    }
    setIsVerifyingCode(true);
    setCodeError('');
    try {
      // Client-side trigger for the 72h (48h + 24h grace) unpaid-
      // application auto-expiry — see expire_unpaid_applications RPC.
      // Runs before the code check so a returning applicant whose
      // window just lapsed sees the resulting "rejected" status
      // immediately, not a stale "unpaid" state that only catches up
      // next time someone happens to trigger the RPC. Best-effort: a
      // failure here should never block the actual code check.
      try {
        await supabase.rpc('expire_unpaid_applications', { p_tenant_id: tenant.id });
      } catch (expireErr) {
        console.warn('[join] expire_unpaid_applications failed', expireErr);
      }

      const { data, error } = await supabase.rpc('check_application_code', {
        p_code: trimmed,
        p_tenant_id: tenant.id,
      });
      if (error) throw error;

      if (!data || data.valid !== true) {
        setCodeError(
          data?.message || 'Invalid code. Please contact us to receive a valid invitation code.'
        );
        return;
      }

      if (data.has_application && data.application) {
        // Repeat visit with an application already on file — show the
        // status view instead of the blank form. (If the expiry RPC
        // above just flipped this application to rejected, `data`
        // already reflects that, since the RPC ran before this query.)
        setApplication(data.application);
        setReferenceNumber(data.application.reference_number || '');
        setStep('status');
        return;
      }

      // First-time code use — reference number comes from the code's
      // admin-set label. Before loading the blank form, check whether
      // this tenant has Membership Conditions & Dues text configured;
      // if so, gate on that first (shown exactly once, never again on
      // repeat visits since this branch only runs for has_application
      // === false). If unset, skip straight to the form.
      setReferenceNumber(data.reference_number || '');
      resetJoinForm();

      const conditionsText = await fetchMembershipConditions();

      if (conditionsText) {
        setMembershipConditionsText(conditionsText);
        setAgreedToConditions(false);
        setStep('conditions');
      } else {
        setStep('form');
      }
    } catch (err: any) {
      console.error('Code verification error:', err);
      setCodeError('Verification failed. Please try again or contact us.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const ineligibleContent = getIneligibleContent();

  // Human-readable payment status label + color used across the
  // payment and status views.
  const paymentStatusMeta = (status: PaymentStatus | undefined) => {
    switch (status) {
      case 'verified':
        return { label: 'Payment Verified', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
      case 'pending_verification':
        return { label: 'Payment Verification Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
      case 'rejected':
        return { label: 'Payment Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
      default:
        return { label: 'Payment Not Submitted', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' };
    }
  };

  const applicationStatusMeta = (status: string | undefined) => {
    switch ((status || 'pending').toLowerCase()) {
      case 'approved':
        return { label: 'Application Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
      case 'rejected':
        return { label: 'Application Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
      default:
        return { label: 'Application Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return `৳${amount.toLocaleString('en-BD')}`;
  };

  return (
    <div
      className="min-h-screen pt-32 pb-24 text-white relative overflow-hidden"
      style={{ backgroundColor: isLight ? 'var(--color-accent)' : 'var(--color-primary)' }}
    >
      <SEOHead
        title="Join Our Club"
        description={`Apply to join ${tenant.fullName} and become part of a global youth service movement.`}
        canonicalPath="/join"
      />
      {/* Background glow */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] pointer-events-none ${
          isLight ? 'bg-white/10' : 'bg-accent/10'
        }`}
      ></div>

      <div className="max-w-3xl mx-auto px-6 relative z-10 w-full">
        {/* ── ELIGIBILITY STEP ── */}
        {step === 'eligibility' && (
          <div className="text-center animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-heading font-bold mb-8">Join the Movement.</h1>
            <p className="text-xl text-gray-200 max-w-xl mx-auto mb-16 leading-relaxed">
              Before we begin your application, let's make sure {clubTypeName} is the right fit for
              you. Are you between{' '}
              <span className="text-white font-bold border-b border-white/50">{ageRange}</span>?
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Button size="lg" variant="secondary" onClick={() => checkEligibility(true)}>
                Yes, I am
              </Button>
              {isRotaract ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => checkEligibility(false, 'under')}
                  >
                    No, I'm under 18
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => checkEligibility(false, 'over')}
                  >
                    No, I'm over 30
                  </Button>
                </div>
              ) : (
                <Button size="lg" variant="outline" onClick={() => checkEligibility(false, 'under')}>
                  No, I'm not
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── INELIGIBLE STEP ── */}
        {step === 'ineligible' && (
          <div className="text-center bg-white/5 p-12 rounded-3xl border border-white/10 animate-fade-in-up">
            <h2 className="text-3xl font-heading font-bold mb-4">You're still welcome!</h2>
            <p className="text-gray-200 mb-8 max-w-lg mx-auto">{ineligibleContent.message}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
              {ineligibleContent.buttons.map((btn) => (
                <a key={btn.label} href={btn.href} target="_blank" rel="noopener noreferrer">
                  <Button variant={btn.variant} size="lg">
                    {btn.label} →
                  </Button>
                </a>
              ))}
            </div>
            <button onClick={() => setStep('eligibility')} className={GO_BACK_CLASS}>
              ← Go Back
            </button>
          </div>
        )}

        {/* ── CODE CHECK STEP ── */}
        {step === 'code-check' && (
          <div className="text-center animate-fade-in-up max-w-md mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10 space-y-6">
              {/* Lock icon */}
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-3xl font-heading font-bold text-white mb-2">
                  Invitation Required
                </h2>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Applications are by invitation only. Enter the 12-character code you received from
                  the club to continue. If you've already applied, enter the same code to check your
                  application status.
                </p>
              </div>

              <div className="space-y-4">
                {/* Code input */}
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    setCodeError('');
                  }}
                  maxLength={12}
                  placeholder="XXXXXXXXXXXX"
                  className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-xl font-mono tracking-[0.4em] placeholder-white/25 focus:outline-none focus:border-white/60 focus:bg-white/15 transition-all uppercase"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyCode();
                  }}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />

                {/* Error state */}
                {codeError && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 text-left">
                    <p className="text-red-200 text-sm mb-3">{codeError}</p>
                    <a
                      href="/contact"
                      className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors border border-white/20"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Contact Us for a Code
                    </a>
                  </div>
                )}

                {/* ── VERIFY BUTTON ── */}
                <button
                  onClick={handleVerifyCode}
                  disabled={isVerifyingCode || inviteCode.trim().length < 12}
                  className="
                    w-full py-4 px-6 rounded-xl font-bold text-base tracking-wide
                    transition-all duration-200 select-none
                    bg-white text-gray-900
                    hover:bg-gray-100 active:scale-[0.98]
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white
                    flex items-center justify-center gap-2.5
                  "
                >
                  {isVerifyingCode ? (
                    <>
                      <svg className="animate-spin w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Verifying…
                    </>
                  ) : (
                    <>
                      Verify Code & Continue
                      <svg
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setStep('eligibility');
                    setCodeError('');
                    setInviteCode('');
                  }}
                  className={GO_BACK_CLASS}
                >
                  ← Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MEMBERSHIP CONDITIONS & DUES GATE ── */}
        {/* Shown exactly once, only for first-time applicants, right
            before the blank form loads (never on repeat visits/status
            checks — see handleVerifyCode). Skipped entirely if the
            tenant has no membershipConditionsText configured. */}
        {step === 'conditions' && (
          <div
            className="p-6 sm:p-8 md:p-12 rounded-3xl shadow-2xl animate-fade-in-up"
            style={{ backgroundColor: '#ffffff', color: '#111827', colorScheme: 'light' }}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-2" style={{ color: '#111827' }}>
                Membership Conditions & Dues
              </h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Please review the following before continuing to your application.
              </p>
            </div>

            <div
              className="rounded-2xl p-5 sm:p-6 mb-6 max-h-96 overflow-y-auto"
              style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
            >
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                {membershipConditionsText}
              </p>
            </div>

            <label
              className="flex items-start gap-3 mb-6 cursor-pointer select-none rounded-xl p-4"
              style={{ backgroundColor: agreedToConditions ? '#eff6ff' : '#f9fafb', border: `1px solid ${agreedToConditions ? '#bfdbfe' : '#e5e7eb'}` }}
            >
              <input
                type="checkbox"
                checked={agreedToConditions}
                onChange={(e) => setAgreedToConditions(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded shrink-0 cursor-pointer accent-blue-600"
              />
              <span className="text-sm" style={{ color: '#374151' }}>
                I have read and agree to the Membership Conditions & Dues outlined above.
              </span>
            </label>

            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full !rounded-xl"
                disabled={!agreedToConditions}
                onClick={() => setStep('form')}
              >
                Continue to Application →
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep('code-check');
                  setAgreedToConditions(false);
                }}
                className="text-sm text-center transition-opacity opacity-70 hover:opacity-100"
                style={{ color: '#6b7280' }}
              >
                ← Go Back
              </button>
            </div>
          </div>
        )}

        {/* ── APPLICATION FORM STEP ── */}
        {step === 'form' && (
          <div
            className="p-8 md:p-12 rounded-3xl shadow-2xl animate-fade-in-up"
            style={{ backgroundColor: '#ffffff', color: '#111827', colorScheme: 'light' }}
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-heading font-bold mb-2" style={{ color: '#111827' }}>
                {application ? 'Edit Your Application' : 'Application Form'}
              </h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Please fill in all details carefully. We will review and contact you shortly.
              </p>
              {referenceNumber && (
                <p className="text-xs mt-2 font-mono" style={{ color: '#9ca3af' }}>
                  Reference No: <span className="font-bold" style={{ color: '#374151' }}>{referenceNumber}</span>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Formal Picture */}
              <div className="flex flex-col items-center gap-3">
                <label className="text-sm font-bold" style={{ color: '#374151' }}>
                  Formal Picture <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="w-36">
                  <CloudinaryUpload
                    onUpload={(url, publicId) => {
                      setPhotoUrl(url);
                      setPhotoPublicId(publicId);
                    }}
                    currentUrl={photoUrl || application?.photo || ''}
                    currentPublicId={photoPublicId}
                    label="Upload Photo"
                    aspectRatio="portrait"
                  />
                </div>
                <p className="text-xs text-center" style={{ color: '#9ca3af' }}>
                  Upload a clear, formal/passport-style photo
                </p>
              </div>

              <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6" style={{ borderTop: '1px solid #f3f4f6' }}>
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    {...register('name')}
                    defaultValue={application?.name || ''}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', colorScheme: 'light' }}
                    placeholder="Your full name as per official ID"
                  />
                  {errors.name && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.name.message}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                    Date of Birth <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    {...register('dob')}
                    defaultValue={application?.dob || ''}
                    type="date"
                    min={dobRange.min}
                    max={dobRange.max}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', colorScheme: 'light' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                    {isRotaract
                      ? 'Rotaract requires applicants to be 18 years or older.'
                      : 'Interact requires applicants to be between 12 and 17 years old.'}
                  </p>
                  {errors.dob && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.dob.message}</p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                    Gender <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    {...register('gender')}
                    defaultValue={application?.gender || ''}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', colorScheme: 'light' }}
                  >
                    <option value="">Select gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {errors.gender && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.gender.message}</p>
                  )}
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                    Blood Group <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    {...register('bloodGroup')}
                    defaultValue={application?.bloodGroup || ''}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', colorScheme: 'light' }}
                  >
                    <option value="">Select blood group...</option>
                    <option value="A+">A+</option>
                    <option value="A-">A−</option>
                    <option value="B+">B+</option>
                    <option value="B-">B−</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB−</option>
                    <option value="O+">O+</option>
                    <option value="O-">O−</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                  {errors.bloodGroup && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.bloodGroup.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    {...register('email')}
                    defaultValue={application?.email || ''}
                    type="email"
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', colorScheme: 'light' }}
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                    Phone Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    {...register('phone')}
                    defaultValue={application?.phone || ''}
                    type="tel"
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', colorScheme: 'light' }}
                    placeholder="+880 01XXX XXXXXX"
                  />
                  {errors.phone && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.phone.message}</p>
                  )}
                </div>

                {/* Emergency Contact */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                    Emergency Contact <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    {...register('emergencyContact')}
                    defaultValue={application?.emergencyContact || ''}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', colorScheme: 'light' }}
                    placeholder="Parent/Guardian name and phone number"
                  />
                  {errors.emergencyContact && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.emergencyContact.message}</p>
                  )}
                </div>

                {/* Residential Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                    Residential Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    {...register('address')}
                    defaultValue={application?.address || ''}
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all resize-none"
                    style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', colorScheme: 'light' }}
                    placeholder="House/Road/Block, Area, City"
                  />
                  {errors.address && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.address.message}</p>
                  )}
                </div>

                {/* Referred By */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                    Referred By{' '}
                    <span className="font-normal" style={{ color: '#9ca3af' }}>(optional)</span>
                  </label>
                  <input
                    {...register('referredBy')}
                    defaultValue={application?.referredBy || ''}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', colorScheme: 'light' }}
                    placeholder="Name of the member who referred you (if any)"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full !rounded-xl"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? application
                      ? 'Saving Changes...'
                      : 'Submitting Application...'
                    : application
                    ? 'Save Changes →'
                    : 'Submit Application →'}
                </Button>
                {application && (
                  <button
                    type="button"
                    onClick={() => setStep('status')}
                    className="text-sm text-center transition-opacity opacity-70 hover:opacity-100"
                    style={{ color: '#6b7280' }}
                  >
                    ← Back to Status
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ── PAYMENT STEP (part 2 of the form) ── */}
        {step === 'payment' && application && (
          <div
            className="p-6 sm:p-8 md:p-12 rounded-3xl shadow-2xl animate-fade-in-up"
            style={{ backgroundColor: '#ffffff', color: '#111827', colorScheme: 'light' }}
          >
            <div className="text-center mb-6">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: '#eff6ff' }}
              >
                <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="#3b82f6">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a4 4 0 00-8 0v2M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-2" style={{ color: '#111827' }}>
                Application Fee Payment
              </h2>
              <p className="text-sm max-w-md mx-auto" style={{ color: '#6b7280' }}>
                Your application has been received. Complete your payment below to move forward, or
                submit now and pay later from your status page.
              </p>
            </div>

            {application.createdAt && (
              <div className="mb-6">
                <PaymentCountdown
                  createdAt={application.createdAt}
                  onExpired={() => {
                    // Best-effort: trigger the real server-side expiry
                    // check and re-sync local state, so if the applicant
                    // is sitting on this screen when the window actually
                    // lapses, the UI catches up rather than staying on a
                    // stale "unpaid" application indefinitely.
                    (async () => {
                      try {
                        await supabase.rpc('expire_unpaid_applications', { p_tenant_id: tenant.id });
                        const { data } = await supabase.rpc('check_application_code', {
                          p_code: (application.codeUsed || '').toUpperCase(),
                          p_tenant_id: tenant.id,
                        });
                        if (data?.has_application && data.application) {
                          setApplication(data.application);
                          setStep('status');
                        }
                      } catch (err) {
                        console.warn('[join] post-expiry re-sync failed', err);
                      }
                    })();
                  }}
                />
              </div>
            )}

            {/* Payment instructions card — fee amount is the hero figure
                (own row, large), bKash number gets a dedicated highlighted
                block underneath since it's the single most important
                piece of info on this whole step. Previously both sat side
                by side with near-identical label styling, which read as
                flat and made it easy to skim past the actual number to
                send money to. */}
            <div
              className="rounded-2xl p-5 sm:p-6 mb-6"
              style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                  Application Fee
                </span>
                <span className="text-2xl sm:text-3xl font-bold" style={{ color: '#111827' }}>
                  {feeLoading ? '…' : formatCurrency(applicationFee)}
                </span>
              </div>

              <div
                className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
                style={{ backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8' }}
              >
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#be185d' }}>
                  Send Money To
                </span>
                <span className="text-xl sm:text-2xl font-mono font-bold tracking-wider" style={{ color: '#e2136e' }}>
                  {feeLoading ? '…' : bkashNumber || 'Not configured'}
                </span>
              </div>

              <p className="text-xs mt-4 leading-relaxed" style={{ color: '#9ca3af' }}>
                Use bKash's <strong>Send Money</strong> option only — mobile recharge is not
                applicable and cannot be verified. After sending, note the Transaction ID from your
                confirmation SMS and enter it below.
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit(onSubmitPayment)} className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                  Your bKash Number (sender) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  {...registerPayment('senderNumber')}
                  type="tel"
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', colorScheme: 'light' }}
                  placeholder="01XXXXXXXXX"
                />
                {paymentErrors.senderNumber && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{paymentErrors.senderNumber.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                  Transaction ID <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  {...registerPayment('transactionId')}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all font-mono uppercase"
                  style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', colorScheme: 'light' }}
                  placeholder="e.g. 8N7A6BC5D4"
                />
                {paymentErrors.transactionId && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{paymentErrors.transactionId.message}</p>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full !rounded-xl"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting Payment...' : 'Submit Payment Details →'}
                </Button>
                <button
                  type="button"
                  onClick={() => setStep('status')}
                  className="text-sm text-center transition-opacity opacity-70 hover:opacity-100"
                  style={{ color: '#6b7280' }}
                >
                  I'll pay later — take me to my status
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STATUS STEP (repeat-visit landing) ── */}
        {step === 'status' && application && (
          <div className="animate-fade-in-up">
            <div
              className="p-6 sm:p-8 md:p-12 rounded-3xl shadow-2xl"
              style={{ backgroundColor: '#ffffff', color: '#111827', colorScheme: 'light' }}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-2" style={{ color: '#111827' }}>
                  Your Application Status
                </h2>
                {application.reference_number && (
                  <p className="text-xs font-mono" style={{ color: '#9ca3af' }}>
                    Reference No:{' '}
                    <span className="font-bold" style={{ color: '#374151' }}>
                      {application.reference_number}
                    </span>
                  </p>
                )}
              </div>

              {/* Status badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div
                  className="rounded-2xl p-4 sm:p-5 text-center"
                  style={{ backgroundColor: applicationStatusMeta(application.status).bg }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>
                    Application
                  </p>
                  <p className="text-base sm:text-lg font-bold" style={{ color: applicationStatusMeta(application.status).color }}>
                    {applicationStatusMeta(application.status).label}
                  </p>
                </div>
                <div
                  className="rounded-2xl p-4 sm:p-5 text-center"
                  style={{ backgroundColor: paymentStatusMeta(application.payment_status).bg }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>
                    Payment
                  </p>
                  <p className="text-base sm:text-lg font-bold" style={{ color: paymentStatusMeta(application.payment_status).color }}>
                    {paymentStatusMeta(application.payment_status).label}
                  </p>
                </div>
              </div>

              {/* Countdown — only relevant while payment_status is
                  'unpaid', matching expire_unpaid_applications' exact
                  eligibility criteria. Once payment is submitted
                  (pending_verification/verified/rejected-by-admin), the
                  72h auto-cancel no longer applies, so the clock is no
                  longer meaningful and is hidden. */}
              {application.payment_status === 'unpaid' && application.createdAt && (
                <div className="mb-5">
                  <PaymentCountdown
                    createdAt={application.createdAt}
                    onExpired={() => {
                      (async () => {
                        try {
                          await supabase.rpc('expire_unpaid_applications', { p_tenant_id: tenant.id });
                          const { data } = await supabase.rpc('check_application_code', {
                            p_code: (application.codeUsed || '').toUpperCase(),
                            p_tenant_id: tenant.id,
                          });
                          if (data?.has_application && data.application) {
                            setApplication(data.application);
                          }
                        } catch (err) {
                          console.warn('[join] post-expiry re-sync failed', err);
                        }
                      })();
                    }}
                  />
                </div>
              )}

              {/* Conditional notes/banners — space-y only applies BETWEEN
                  blocks that actually render, so an application with no
                  notes and no reconsideration history goes straight from
                  the badges to the buttons instead of leaving a stretch
                  of dead white space where a fixed mb-6/mb-8 would have
                  been reserved regardless of whether anything rendered. */}
              <div className="space-y-3 mb-3 empty:mb-0">
                {/* Admin notes, if any */}
                {application.rejection_note && (application.status || '').toLowerCase() === 'rejected' && (
                  <div
                    className="rounded-xl p-4"
                    style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#dc2626' }}>
                      Note from the Board
                    </p>
                    <p className="text-sm" style={{ color: '#991b1b' }}>{application.rejection_note}</p>
                  </div>
                )}
                {application.payment_note && (
                  <div
                    className="rounded-xl p-4"
                    style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>
                      Payment Note
                    </p>
                    <p className="text-sm" style={{ color: '#374151' }}>{application.payment_note}</p>
                  </div>
                )}

                {/* Reconsideration notice — three distinct states: not
                    requested yet (no banner at all), requested and still
                    open (blue, "someone will contact you"), or requested
                    AND resolved (neutral gray, explains no further
                    requests are possible — this is the state that used to
                    render nothing, leaving the applicant with a banner
                    that never changed even after the board acted on it). */}
                {(application.status || '').toLowerCase() === 'rejected' && application.reconsideration_requested && (
                  <div
                    className="rounded-xl p-4 text-center"
                    style={
                      application.reconsideration_resolved
                        ? { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }
                        : { backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }
                    }
                  >
                    <p
                      className="text-sm font-medium"
                      style={{ color: application.reconsideration_resolved ? '#4b5563' : '#1d4ed8' }}
                    >
                      {application.reconsideration_resolved
                        ? 'Your request has been reviewed. This decision is final.'
                        : "If you're eligible, someone will contact you soon."}
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                {/* Pay / retry payment button */}
                {(application.payment_status === 'unpaid' || application.payment_status === 'rejected') &&
                  (application.status || '').toLowerCase() !== 'rejected' && (
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full !rounded-xl"
                      onClick={() => setStep('payment')}
                    >
                      {application.payment_status === 'rejected' ? 'Resubmit Payment →' : 'Pay Application Fee →'}
                    </Button>
                  )}

                {/* Edit application button — explicit border + background
                    so it reads as a clickable action on its own, not
                    just plain text sitting under the primary button. */}
                {isApplicationEditable(application) && (
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 active:scale-[0.98]"
                    style={{ backgroundColor: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb' }}
                  >
                    Edit Application Details
                  </button>
                )}

                {/* Request reconsideration — only offered once (hidden
                    once already requested), and never again once the
                    board has marked that request resolved. */}
                {(application.status || '').toLowerCase() === 'rejected' &&
                  !application.reconsideration_requested &&
                  !application.reconsideration_resolved && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full !rounded-xl"
                      onClick={handleRequestReconsideration}
                      disabled={isRequestingReconsideration}
                    >
                      {isRequestingReconsideration ? 'Submitting Request...' : 'Request Another Chance'}
                    </Button>
                  )}
              </div>
            </div>

            <button
              onClick={() => {
                setStep('eligibility');
                setApplication(null);
                setInviteCode('');
              }}
              className={GO_BACK_CLASS}
            >
              ← Start Over
            </button>
          </div>
        )}

        {/* ── RECONSIDERATION SUBMITTED ── */}
        {step === 'reconsideration-submitted' && (
          <div className="text-center bg-white/5 p-12 rounded-3xl border border-white/10 animate-fade-in-up">
            <div className="w-20 h-20 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-6l-4 4v-4z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-heading font-bold mb-4 text-white">Request Received</h2>
            <p className="text-gray-100 mb-10 max-w-md mx-auto text-lg">
              If you're eligible, someone will contact you soon.
            </p>
            <Button variant="secondary" onClick={() => setStep('status')}>
              Back to Status
            </Button>
          </div>
        )}

        {/* ── SUCCESS STEP ── */}
        {step === 'success' && (
          <div className="text-center bg-white/5 p-12 rounded-3xl border border-white/10 animate-fade-in-up">
            <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.4)]">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <h2 className="text-4xl font-heading font-bold mb-4 text-white animate-pulse">
              Application Received!
            </h2>
            <p className="text-gray-100 mb-10 max-w-lg mx-auto text-lg whitespace-pre-line">
              {content?.joinSuccessMessage ||
                'Thank you for taking the first step. Our board will review your application and contact you soon via email.'}
            </p>
            <Button variant="secondary" onClick={() => (window.location.href = '/')}>
              Return Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
