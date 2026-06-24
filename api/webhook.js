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

// ── Auto-pause on echo (admin replied) ──────────────────────────────
async function autoPauseFromEcho(psid, pageId) {
  const sb = getSupabase();
  const resumeAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
  await sb.from('bot_paused').upsert(
    { psid, page_id: pageId, paused_at: new Date().toISOString(), auto_resume_at: resumeAt },
    { onConflict: 'psid,page_id' }
  );
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
async function ragSearch(pageId, userMessage) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const embRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text: userMessage }] } })
      }
    );
    const embData = await embRes.json();
    const embedding = embData.embedding?.values;
    if (!embedding) return '';

    const { data } = await getSupabase().rpc('match_bot_knowledge', {
      query_embedding: embedding,
      match_page_id: pageId,
      match_threshold: 0.5,
      match_count: 3
    });

    if (!data || data.length === 0) return '';
    return '\n\n[Relevant Club Info]\n' + data.map((d) => `${d.topic}: ${d.content}`).join('\n\n');
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

  const response = await fetch(
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

  if (!response.ok) { const e = await response.json(); throw new Error(`Gemini ${response.status}: ${JSON.stringify(e)}`); }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

// ── Groq fallback ────────────────────────────────────────────────────
async function callGroq(systemPrompt, history, userMessage) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.7 })
  });

  if (!response.ok) { const e = await response.json(); throw new Error(`Groq ${response.status}: ${JSON.stringify(e)}`); }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? null;
}

// ── AI Router ────────────────────────────────────────────────────────
async function getAIResponse(systemPrompt, history, userMessage) {
  try {
    const reply = await callGemini(systemPrompt, history, userMessage);
    console.log('[AI] Gemini success.');
    return reply;
  } catch (err) {
    console.warn(`[AI] Gemini failed (${err.message}). Trying Groq...`);
    try {
      const reply = await callGroq(systemPrompt, history, userMessage);
      console.log('[AI] Groq success.');
      return reply;
    } catch (groqErr) {
      console.error('[AI] Groq failed:', groqErr.message);
      return 'Our assistant is temporarily unavailable. A team member will reach out to you soon. Thank you for your patience! 🙏';
    }
  }
}

// ── Messenger helpers ────────────────────────────────────────────────
async function sendTyping(psid, pageId) {
  const token = getPageToken(pageId);
  await fetch(`https://graph.facebook.com/v23.0/me/messages?access_token=${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: psid }, sender_action: 'typing_on' })
  }).catch(() => {});
}

async function sendMessage(psid, text, pageId) {
  const token = getPageToken(pageId);
  try {
    const res = await fetch(`https://graph.facebook.com/v23.0/me/messages?access_token=${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: psid }, message: { text } })
    });
    const data = await res.json();
    if (res.ok) console.log(`[Send] Delivered. ID: ${data.message_id}`);
    else console.error('[Send] Failed:', res.status, data);
  } catch (err) { console.error('[Send] Network error:', err); }
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
    const body = req.body;
    if (body?.object === 'page') {
      if (!body.entry || !Array.isArray(body.entry)) return res.status(200).send('EVENT_RECEIVED');

      for (const entry of body.entry) {
        const pageId = entry.id;
        if (!entry.messaging?.length) continue;

        const event = entry.messaging[0];
        const psid = event.sender?.id;
        const msgText = event.message?.text;

        // ── Echo: only pause if human admin replied (not bot itself) ──
        if (event.message?.is_echo) {
          // Bot's own AI replies also fire echoes — ignore those
          // Human admin replies from Business Suite have no app_id or a different one
          const botAppId = process.env.META_APP_ID;
          const echoAppId = String(event.message?.app_id || '');
          const isHumanReply = !echoAppId || echoAppId === '0' || (botAppId && echoAppId !== botAppId);
          if (isHumanReply) {
            const recipientPsid = event.recipient?.id;
            if (recipientPsid) {
              await autoPauseFromEcho(recipientPsid, pageId);
              console.log(`[Echo] Human admin replied to ${recipientPsid}. Bot paused 10 min.`);
            }
          } else {
            console.log(`[Echo] Bot own reply echo ignored (app_id: ${echoAppId}).`);
          }
          continue;
        }

        if (!psid || !msgText) continue;

        console.log(`[Msg] Page:${pageId} PSID:${psid} Text:"${msgText}"`);

        // ── Check pause ──
        const paused = await isPaused(psid, pageId);
        if (paused) { console.log(`[Paused] Skipping AI for ${psid}.`); continue; }

        await sendTyping(psid, pageId);

        const [systemPromptBase, history, ragContext] = await Promise.all([
          getSystemPrompt(pageId),
          getHistory(psid, pageId),
          ragSearch(pageId, msgText)
        ]);

        const systemPrompt = systemPromptBase + ragContext;
        const aiReply = await getAIResponse(systemPrompt, history, msgText);

        await Promise.all([
          saveMessage(psid, pageId, 'user', msgText),
          saveMessage(psid, pageId, 'assistant', aiReply),
          sendMessage(psid, aiReply, pageId)
        ]);
      }

      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.status(404).send('Not Found');
  }

  return res.status(405).send('Method Not Allowed');
}
