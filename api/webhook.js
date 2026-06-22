// api/webhook.js

export default async function handler(req, res) {
  console.log(`\n--- [Webhook Event] New Request Received ---`);
  console.log(`Method: ${req.method}`);

  // === DEEP DIAGNOSTICS ===
  console.log(`[DEBUG] req.url raw: "${req.url}"`);
  console.log(`[DEBUG] req.query object: ${JSON.stringify(req.query)}`);
  console.log(`[DEBUG] req.headers host: "${req.headers?.host}"`);

  // SURE-SHOT: Manual URLSearchParams from req.url directly (no host needed)
  let mode = null, token = null, challenge = null;
  try {
    const questionMarkIndex = req.url?.indexOf('?');
    if (questionMarkIndex !== -1 && questionMarkIndex !== undefined) {
      const rawQueryString = req.url.slice(questionMarkIndex + 1);
      console.log(`[DEBUG] Raw query string sliced: "${rawQueryString}"`);
      const sp = new URLSearchParams(rawQueryString);
      mode      = sp.get('hub.mode');
      token     = sp.get('hub.verify_token');
      challenge = sp.get('hub.challenge');
    } else {
      console.warn(`[DEBUG] No '?' found in req.url — query string absent entirely.`);
    }
  } catch (parseErr) {
    console.error(`[DEBUG] URLSearchParams parse error:`, parseErr);
  }

  // Fallback: try req.query if manual parse still null
  if (!mode && req.query) {
    mode      = req.query['hub.mode']         ?? req.query['hub%2Emode']         ?? null;
    token     = req.query['hub.verify_token'] ?? req.query['hub%2Everify_token'] ?? null;
    challenge = req.query['hub.challenge']    ?? req.query['hub%2Echallenge']    ?? null;
    console.log(`[DEBUG] Fallback req.query used. mode="${mode}" token="${token}"`);
  }

  console.log(`[DEBUG] Final parsed → mode: "${mode}" | token: "${token}" | challenge: "${challenge}"`);

  const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN;
  console.log(`[DEBUG] VERIFY_TOKEN from env: "${VERIFY_TOKEN}"`);

  // 1. GET Request: Meta Webhook Verification
  if (req.method === 'GET') {
    console.log("[GET Verification] Handshake process initiated by Meta...");
    console.log(`Extracted mode: "${mode}"`);
    console.log(`Received Token: "${token}" | Expected Token: "${VERIFY_TOKEN}"`);

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("[Verification Success] Tokens match! Responding with challenge.");
        return res.status(200).send(challenge);
      } else {
        console.error(`[Verification Failed] Mode="${mode}" Token match=${token === VERIFY_TOKEN}`);
        return res.status(403).send('Forbidden');
      }
    }
    console.warn("[Verification Failed] Missing hub.mode or hub.verify_token queries.");
    return res.status(400).send('Bad Request');
  }

  // 2. POST Request: Handles live incoming chat text
  if (req.method === 'POST') {
    const body = req.body;
    console.log("[POST Message] Full payload body incoming:", JSON.stringify(body, null, 2));

    if (body && body.object === 'page') {
      if (!body.entry || !Array.isArray(body.entry)) return res.status(200).send('EVENT_RECEIVED');

      for (const entry of body.entry) {
        if (!entry.messaging || entry.messaging.length === 0) continue;

        const webhook_event = entry.messaging[0];
        const senderPsid   = webhook_event.sender?.id;
        const messageText  = webhook_event.message?.text;

        console.log(`[Message Parse] From PSID: ${senderPsid} | Text: "${messageText}"`);

        if (senderPsid && messageText) {
          const cleanText = messageText.trim().toLowerCase();
          if (cleanText.includes('ping') || cleanText.includes('@bot ping')) {
            console.log(`[Trigger Matched] Sending response via Graph API...`);
            await sendMessengerResponse(senderPsid, "Pong! The bot infrastructure is fully live. 🚀");
          }
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.status(404).send('Not Found');
  }

  return res.status(405).send('Method Not Allowed');
}

// 3. Outbound Graph API Sender Engine
async function sendMessengerResponse(senderPsid, textResponse) {
  const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;

  if (!PAGE_ACCESS_TOKEN) {
    console.error("[CRITICAL] Missing MESSENGER_PAGE_ACCESS_TOKEN env variable.");
    return;
  }

  const payload = {
    recipient: { id: senderPsid },
    message:   { text: textResponse }
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const responseData = await response.json();
    if (response.ok) {
      console.log(`[Graph API Success] Delivered to ${senderPsid}. ID:`, responseData.message_id);
    } else {
      console.error('[Graph API Failure]:', response.status, responseData);
    }
  } catch (err) {
    console.error('[Network Error] Meta Graph API unreachable:', err);
  }
}
