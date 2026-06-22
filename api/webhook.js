// api/webhook.js

const SYSTEM_PROMPT = `You are an official AI assistant for a youth service club.

Your personality:
- Friendly, helpful, and professional
- Knowledgeable about Rotary, Rotaract, and Interact programs

You can help with:
- Information about the club and its programs
- Rotary/Rotaract/Interact program details
- Club events, meetings, and activities
- Membership and joining information
- General questions and assistance

Rules:
- Keep responses concise but complete — never cut off mid-sentence
- Always be warm and welcoming
- If unsure about specific club details, say so honestly
- Never make up event dates or member information
- Respond in the same language the user writes in (Bengali or English)`;

// ── AI Provider: Gemini ──────────────────────────────────────────────
async function callGemini(userMessage) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7 }
      })
    }
  );

  if (!response.ok) {
    const err = await response.json();
    // 429 = quota exceeded → trigger fallback
    if (response.status === 429) throw new Error("QUOTA_EXCEEDED");
    throw new Error(`Gemini error ${response.status}: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

// ── AI Provider: Groq (fallback) ─────────────────────────────────────
async function callGroq(userMessage) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage }
      ],
      max_tokens: 4096,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Groq error ${response.status}: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? null;
}

// ── AI Router: Gemini first, Groq on quota error ─────────────────────
async function getAIResponse(userMessage) {
  try {
    console.log("[AI] Trying Gemini...");
    const reply = await callGemini(userMessage);
    console.log("[AI] Gemini success.");
    return reply;
  } catch (err) {
    console.warn(`[AI] Gemini failed (${err.message}). Falling back to Groq...`);
    try {
      const reply = await callGroq(userMessage);
      console.log("[AI] Groq fallback success.");
      return reply;
    } catch (groqErr) {
      console.error("[AI] Groq also failed:", groqErr.message);
      return "Our assistant is temporarily unavailable. A team member will reach out to you soon. Thank you for your patience! 🙏";
    }
  }
}

// ── Messenger Send ────────────────────────────────────────────────────
async function sendMessengerResponse(senderPsid, textResponse) {
  const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!PAGE_ACCESS_TOKEN) {
    console.error("[CRITICAL] Missing MESSENGER_PAGE_ACCESS_TOKEN.");
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: senderPsid },
          message:   { text: textResponse }
        })
      }
    );
    const data = await response.json();
    if (response.ok) {
      console.log(`[Graph API] Delivered to ${senderPsid}. ID:`, data.message_id);
    } else {
      console.error("[Graph API] Failed:", response.status, data);
    }
  } catch (err) {
    console.error("[Network Error] Meta Graph API:", err);
  }
}

// ── Main Handler ──────────────────────────────────────────────────────
export default async function handler(req, res) {
  console.log(`\n--- [Webhook] ${req.method} ---`);

  // Parse query params
  const questionMarkIndex = req.url?.indexOf('?');
  let mode = null, token = null, challenge = null;
  if (questionMarkIndex !== -1 && questionMarkIndex !== undefined) {
    const sp = new URLSearchParams(req.url.slice(questionMarkIndex + 1));
    mode      = sp.get('hub.mode');
    token     = sp.get('hub.verify_token');
    challenge = sp.get('hub.challenge');
  }
  if (!mode && req.query) {
    mode      = req.query['hub.mode']         ?? null;
    token     = req.query['hub.verify_token'] ?? null;
    challenge = req.query['hub.challenge']    ?? null;
  }

  const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN;

  // 1. GET: Meta verification
  if (req.method === 'GET') {
    console.log(`[GET] mode="${mode}" token="${token}"`);
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log("[Verification] Success.");
      return res.status(200).send(challenge);
    }
    console.warn("[Verification] Failed.");
    return res.status(mode && token ? 403 : 400).send(mode && token ? 'Forbidden' : 'Bad Request');
  }

  // 2. POST: Incoming messages
  if (req.method === 'POST') {
    const body = req.body;

    if (body?.object === 'page') {
      if (!body.entry || !Array.isArray(body.entry)) return res.status(200).send('EVENT_RECEIVED');

      for (const entry of body.entry) {
        if (!entry.messaging?.length) continue;

        const event       = entry.messaging[0];
        const senderPsid  = event.sender?.id;
        const messageText = event.message?.text;

        // Ignore echo messages from the page itself
        if (event.message?.is_echo) continue;

        console.log(`[Message] PSID: ${senderPsid} | Text: "${messageText}"`);

        if (senderPsid && messageText) {
          // Send typing indicator
          await fetch(
            `https://graph.facebook.com/v23.0/me/messages?access_token=${process.env.MESSENGER_PAGE_ACCESS_TOKEN}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recipient: { id: senderPsid }, sender_action: "typing_on" })
            }
          ).catch(() => {});

          const aiReply = await getAIResponse(messageText);
          await sendMessengerResponse(senderPsid, aiReply);
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.status(404).send('Not Found');
  }

  return res.status(405).send('Method Not Allowed');
}
