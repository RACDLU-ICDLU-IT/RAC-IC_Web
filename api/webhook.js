// api/webhook.js

export default async function handler(req, res) {
  console.log(`\n--- [Webhook Event] New Request Received ---`);
  console.log(`Method: ${req.method}`);

  // FIX: Force clean URL parameter parsing using the raw URL path string
  const fullUrl = `https://${req.headers.host || 'localhost'}${req.url}`;
  const parsedUrl = new URL(fullUrl);
  
  const mode = parsedUrl.searchParams.get('hub.mode');
  const token = parsedUrl.searchParams.get('hub.verify_token');
  const challenge = parsedUrl.searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN;

  // 1. GET Request: Meta Webhook Verification
  if (req.method === 'GET') {
    console.log("[GET Verification] Handshake process initiated by Meta...");
    console.log(`Extracted mode: "${mode}"`);
    console.log(`Received Token: "${token}" | Expected Token: "${VERIFY_TOKEN}"`);

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("[Verification Success] Tokens match perfectly! Responding with challenge string.");
        // Send back the challenge token as plain text
        return res.status(200).send(challenge);
      } else {
        console.error("[Verification Failed] Tokens did not match.");
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
        const senderPsid = webhook_event.sender?.id;
        const messageText = webhook_event.message?.text;

        console.log(`[Message Parse] From PSID: ${senderPsid} | Text: "${messageText}"`);

        if (senderPsid && messageText) {
          const cleanText = messageText.trim().toLowerCase();

          if (cleanText.includes('ping') || cleanText.includes('@bot ping')) {
            console.log(`[Trigger Matched] Sending outbound message back via Graph API...`);
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
    console.error("[CRITICAL] Missing MESSENGER_PAGE_ACCESS_TOKEN environment variable.");
    return;
  }

  const payload = {
    recipient: { id: senderPsid },
    message: { text: textResponse }
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v23.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log(`[Graph API Success] Message delivered to ${senderPsid}. ID:`, responseData.message_id);
    } else {
      console.error('[Graph API Failure Details]:', response.status, responseData);
    }
  } catch (err) {
    console.error('[Network Error] Failed connecting to Meta Graph API endpoint:', err);
  }
}
