// api/webhook.js
import { createClient } from '@supabase/supabase-js';

const DEFAULT_PROMPT = `You are an official AI assistant for a youth service club.
Personality: Friendly, helpful, professional.
Help with: club info, Rotary/Rotaract/Interact programs, events, membership.
Rules:
- Never cut off mid-sentence
- Be warm and welcoming
- Never fabricate event dates or member info
- Respond in user's language (Bengali or English)
- Do not mention specific club names unless told in this prompt`;

// llama-3.3-70b-versatile was deprecated by Groq (announced June 17, 2026).
// gpt-oss-120b is the recommended replacement — update here if you migrate again.
const GROQ_MODEL = 'openai/gpt-oss-120b';

const FETCH_TIMEOUT_MS = 10000;

// ── Startup sanity check (warns on cold start, doesn't crash the function) ──
const REQUIRED_ENV = [
  'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'MESSENGER_VERIFY_TOKEN',
  'MESSENGER_PAGE_ACCESS_TOKEN', 'GEMINI_API_KEY', 'GROQ_API_KEY'
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) console.warn(`[Config] Missing env var: ${key}`);
}

// ── Fetch with timeout — prevents a hung upstream call from stalling the function ──
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function getSupabase() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const PAGE_TOKEN_MAP = {
  [process.env.PAGE_ID_1]: process.env.MESSENGER_PAGE_ACCESS_TOKEN,
  [process.env.PAGE_ID_2]: process.env.MESSENGER_PAGE_ACCESS_TOKEN_2,
};

function getPageToken(pageId) {
  return PAGE_TOKEN_MAP[pageId] || process.env.MESSENGER_PAGE_ACCESS_TOKEN;
}

// ── Check if psid is paused + auto-expire ────────────────────────────
async function isPaused(psid, pageId) {
  const sb = getSupabase();
  const { data } = await sb.from('bot_paused').select('auto_resume_at').eq('psid', psid).eq('page_id', pageId).single();
  if (!data) return false;
  if (data.auto_resume_at && new Date(data.auto_resume_at) < new Date()) {
    await sb.from('bot_paused').delete().eq('psid', psid).eq('page_id', pageId);
    return false;
  }
  return true;
}

// ── Fetch system prompt ──────────────────────────────────────────────
async function getSystemPrompt(pageId) {
  try {
    const { data } = await getSupabase().from('bot_config').select('value').eq('page_id', pageId).eq('key', 'system_prompt').single();
    return data?.value || DEFAULT_PROMPT;
  } catch { return DEFAULT_PROMPT; }
}

// ── Fetch conversation history ───────────────────────────────────────
async function getHistory(psid, pageId, limit = 10) {
  try {
    const { data } = await getSupabase()
      .from('bot_conversations')
      .select('role, content')
      .eq('psid', psid).eq('page_id', pageId)
      .order('created_at', { ascending: false }).limit(limit);
    return (data || []).reverse();
  } catch { return []; }
}

// ── Save message ─────────────────────────────────────────────────────
async function saveMessage(psid, pageId, role, content) {
  try {
    await getSupabase().from('bot_conversations').insert({ psid, page_id: pageId, role, content });
  } catch (err) { console.error('[DB]', err.message); }
}

// ── RAG: embed query + search knowledge base ─────────────────────────
// Returns dynamic context only — kept OUT of the system prompt so the
// system message stays identical across calls (required for prompt caching).
async function ragSearch(pageId, userMessage) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const embRes = await fetchWithTimeout(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: userMessage }] },
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: 768
        })
      }
    );
    if (!embRes.ok) { console.error('[RAG] Embed failed:', embRes.status); return ''; }
    const embData = await embRes.json();
    const embedding = embData.embedding?.values;
    if (!embedding) return '';

    const { data, error } = await getSupabase().rpc('match_bot_knowledge', {
      query_embedding: embedding,
      match_page_id: pageId,
      match_threshold: 0.5,
      match_count: 3
    });
    if (error) { console.error('[RAG] Match error:', error.message); return ''; }

    if (!data || data.length === 0) return '';
    return '[Relevant Club Info]\n' + data.map((d) => `${d.topic}: ${d.content}`).join('\n\n');
  } catch (err) {
    console.error('[RAG]', err.message);
    return '';
  }
}

// ── Gemini ───────────────────────────────────────────────────────────
async function callGemini(systemPrompt, history, userMessage) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');

  const contents = [
    ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7 }
      })
    }
  );

  if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(`Gemini ${response.status}: ${JSON.stringify(e)}`); }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

// ── Groq fallback ────────────────────────────────────────────────────
// systemPrompt MUST be passed unmodified (no RAG/dynamic content appended)
// so this message is byte-identical across calls and hits Groq's prefix cache.
async function callGroq(systemPrompt, history, userMessage) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.7 })
  });

  if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(`Groq ${response.status}: ${JSON.stringify(e)}`); }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? null;
}

// ── AI Router ────────────────────────────────────────────────────────
// ragContext is merged into the user turn (not the system prompt) so the
// system message stays static across calls — this is what makes prompt
// caching actually work on Groq's side.
async function getAIResponse(systemPrompt, history, userMessage, ragContext) {
  const augmentedMessage = ragContext ? `${ragContext}\n\n${userMessage}` : userMessage;

  try {
    const reply = await callGemini(systemPrompt, history, augmentedMessage);
    console.log('[AI] Gemini success.');
    return reply;
  } catch (err) {
    console.warn(`[AI] Gemini failed (${err.message}). Trying Groq...`);
    try {
      const reply = await callGroq(systemPrompt, history, augmentedMessage);
      console.log('[AI] Groq success.');
      return reply;
    } catch (groqErr) {
      console.error('[AI] Groq failed:', groqErr.message);
      return 'Our assistant is temporarily unavailable. A team member will reach out to you soon. Thank you for your patience! 🙏';
    }
  }
}

// ── Human support detection ──────────────────────────────────────────
const HUMAN_KEYWORDS = [
  'human', 'agent', 'support', 'person', 'real person', 'human help',
  'club member', 'staff', 'representative', 'talk to someone', 'speak to',
  'real human', 'actual person', 'member', 'admin', 'operator',
  'মানুষ', 'সাহায্য', 'সদস্য', 'কর্মকর্তা' // Bengali keywords
];

function hasHumanKeyword(text) {
  const lower = text.toLowerCase();
  return HUMAN_KEYWORDS.some(kw => lower.includes(kw));
}

async function isRequestingHuman(userMessage, history) {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) { console.error('[HumanClassifier] Missing GROQ_API_KEY'); return false; }

    const recentHistory = (history || []).slice(-4).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        max_tokens: 10,
        messages: [
          {
            role: 'system',
            content: 'You are a binary classifier. Determine if the user wants to speak with a real human instead of an AI assistant. Reply with ONLY the word "yes" or "no". No other text.'
          },
          ...recentHistory,
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[HumanClassifier] Groq error:', response.status, JSON.stringify(err));
      return false;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim().toLowerCase() || 'no';
    console.log(`[HumanClassifier] Groq answer for "${userMessage}": "${answer}"`);
    return answer === 'yes';
  } catch (err) {
    console.error('[HumanClassifier] Error:', err.message);
    return false;
  }
}

async function handleHumanSupport(psid, pageId, userMessage) {
  const sb = getSupabase();
  console.log(`[HumanSupport] Triggered for ${psid}`);

  await sb.from('bot_conversations').insert(
    { psid, page_id: pageId, role: 'user', content: userMessage, needs_human_flag: true }
  );

  await sb.from('bot_paused').delete().eq('psid', psid).eq('page_id', pageId);
  const { error: insertErr } = await sb.from('bot_paused').insert({
    psid,
    page_id: pageId,
    paused_at: new Date().toISOString(),
    auto_resume_at: null,
    needs_human: true,
    reason: userMessage.slice(0, 200)
  });
  if (insertErr) {
    console.error('[HumanSupport] Insert error:', JSON.stringify(insertErr));
  } else {
    console.log(`[HumanSupport] bot_paused row inserted with needs_human=true`);
  }

  const reply = `We've received your request for human support! 🙏

A team member will reach out to you shortly. Please share what you need help with so we can assist you better.

Our AI assistant won't respond until a team member takes over. Thank you for your patience!`;
  await sendMessage(psid, reply, pageId);
  await saveMessage(psid, pageId, 'assistant', reply);
  console.log(`[HumanSupport] Done for ${psid}.`);
}

// ── Messenger helpers ────────────────────────────────────────────────
async function sendTyping(psid, pageId) {
  const token = getPageToken(pageId);
  await fetchWithTimeout(`https://graph.facebook.com/v23.0/me/messages?access_token=${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: psid }, sender_action: 'typing_on' })
  }, 5000).catch(() => {});
}

async function sendMessage(psid, text, pageId) {
  const token = getPageToken(pageId);
  try {
    const res = await fetchWithTimeout(`https://graph.facebook.com/v23.0/me/messages?access_token=${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: psid }, message: { text } })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) console.log(`[Send] Delivered. ID: ${data.message_id}`);
    else console.error('[Send] Failed:', res.status, data);
  } catch (err) { console.error('[Send] Network error:', err.message); }
}

// ── Handle a single messaging event ─────────────────────────────────
async function handleMessagingEvent(event, pageId) {
  const psid = event.sender?.id;
  const msgText = event.message?.text;

  // ── Echo: only pause if a human admin replied (not the bot itself) ──
  if (event.message?.is_echo) {
    const botAppId = process.env.META_APP_ID;
    const echoAppId = String(event.message?.app_id || '');
    const isHumanReply = !echoAppId || echoAppId === '0' || (botAppId && echoAppId !== botAppId);
    if (isHumanReply) {
      const recipientPsid = event.recipient?.id;
      if (recipientPsid) {
        const sb = getSupabase();
        const resumeAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const { error } = await sb.from('bot_paused').upsert(
          { psid: recipientPsid, page_id: pageId, paused_at: new Date().toISOString(), auto_resume_at: resumeAt, needs_human: false, reason: null },
          { onConflict: 'psid,page_id' }
        );
        if (error) {
          await sb.from('bot_paused').insert({
            psid: recipientPsid, page_id: pageId, paused_at: new Date().toISOString(), auto_resume_at: resumeAt, needs_human: false, reason: null
          }).catch(() => {});
        }
        console.log(`[Echo] Human replied to ${recipientPsid}. Badge cleared, 10min pause set.`);
      }
    } else {
      console.log(`[Echo] Bot own reply echo ignored (app_id: ${echoAppId}).`);
    }
    return;
  }

  if (!psid || !msgText) return;

  console.log(`[Msg] Page:${pageId} PSID:${psid} Text:"${msgText}"`);

  await sendTyping(psid, pageId);

  const [paused, allPausedRow] = await Promise.all([
    isPaused(psid, pageId),
    getSupabase().from('bot_config').select('value').eq('page_id', pageId).eq('key', 'all_paused').single()
  ]);
  const allPaused = allPausedRow?.data?.value === 'true';

  // ── Two-stage human support detection ──
  // History is fetched here only if a keyword actually matched, and reused
  // below if we proceed to the AI call — avoids a duplicate DB round-trip.
  let cachedHistory = null;
  console.log(`[Keyword] Checking: "${msgText}" | match=${hasHumanKeyword(msgText)}`);
  if (hasHumanKeyword(msgText)) {
    cachedHistory = await getHistory(psid, pageId);
    const requestingHuman = await isRequestingHuman(msgText, cachedHistory);
    if (requestingHuman) {
      await handleHumanSupport(psid, pageId, msgText); // saves msg internally with flag
      return;
    }
  }

  // Always save the user message (even if paused — admins need to see it)
  await saveMessage(psid, pageId, 'user', msgText);

  if (paused || allPaused) {
    console.log(`[Paused] Msg saved, skipping AI for ${psid}. all=${allPaused}`);
    return;
  }

  const [systemPromptBase, history, ragContext] = await Promise.all([
    getSystemPrompt(pageId),
    cachedHistory ? Promise.resolve(cachedHistory) : getHistory(psid, pageId),
    ragSearch(pageId, msgText)
  ]);

  const aiReply = await getAIResponse(systemPromptBase, history, msgText, ragContext);

  await Promise.all([
    saveMessage(psid, pageId, 'assistant', aiReply),
    sendMessage(psid, aiReply, pageId)
  ]);
}

// ── Main Handler ─────────────────────────────────────────────────────
export default async function handler(req, res) {
  console.log(`\n--- [Webhook] ${req.method} ---`);

  let mode = null, token = null, challenge = null;
  const qi = req.url?.indexOf('?');
  if (qi !== -1 && qi !== undefined) {
    const sp = new URLSearchParams(req.url.slice(qi + 1));
    mode = sp.get('hub.mode'); token = sp.get('hub.verify_token'); challenge = sp.get('hub.challenge');
  }
  if (!mode && req.query) {
    mode = req.query['hub.mode'] ?? null;
    token = req.query['hub.verify_token'] ?? null;
    challenge = req.query['hub.challenge'] ?? null;
  }

  const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN;

  if (req.method === 'GET') {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) { console.log('[Verify] Success.'); return res.status(200).send(challenge); }
    return res.status(mode && token ? 403 : 400).send(mode && token ? 'Forbidden' : 'Bad Request');
  }

  if (req.method === 'POST') {
    // Always ack fast — Meta retries aggressively on non-200/slow responses.
    // We still process synchronously below, but malformed bodies bail out cleanly first.
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { console.error('[Webhook] Invalid JSON body'); return res.status(200).send('EVENT_RECEIVED'); }
    }

    if (body?.object === 'page') {
      if (!body.entry || !Array.isArray(body.entry)) return res.status(200).send('EVENT_RECEIVED');

      for (const entry of body.entry) {
        const pageId = entry.id;
        if (!entry.messaging?.length) continue;

        // Facebook can batch multiple messaging events per entry — handle all of them.
        for (const event of entry.messaging) {
          try {
            await handleMessagingEvent(event, pageId);
          } catch (err) {
            console.error('[Webhook] Error handling event:', err.message);
          }
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.status(404).send('Not Found');
  }

  return res.status(405).send('Method Not Allowed');
}
