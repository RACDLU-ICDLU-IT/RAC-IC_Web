// api/webhook.js

export default async function handler(req, res) {
  console.log(`[Webhook Alert] Incoming request method: ${req.method}`);

  // 1. GET: Verification Challenge from Meta Developer Dashboard
  if (req.method === 'GET') {
    console.log("[Verification] Meta is attempting to verify webhook URL...");
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    console.log(`[Verification] Received Token: "${token}", Expected: "${VERIFY_TOKEN}"`);

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("[Verification Success] Webhook verified and linked!");
        return res.status(200).send(challenge);
      } else {
        console.error("[Verification Failed] Token mismatch or invalid mode.");
        return res.status(403).send('Forbidden');
      }
    }
    return res.status(400).send('Bad Request');
  }

  // 2. POST: Handles actual live Messenger messages
  if (req.method === 'POST') {
    const body = req.body;
    console.log("[Payload Received] Full payload structure:", JSON.stringify(body, null, 2));

    // Confirm this is an event from a page subscription
    if (body.object === 'page') {
      
      // Meta can batch multiple messages into one request, loop through them safely
      for (const entry of body.entry) {
        if (!entry.messaging || entry.messaging.length === 0) {
          console.log("[Payload Alert] Entry container received, but 'messaging' object is missing.");
          continue;
        }

        const webhook_event = entry.messaging[0];
        const senderPsid = webhook_event.sender?.id;
        const messageText = webhook_event.message?.text;

        console.log(`[Message Event] From PSID: ${senderPsid} | Message Text: "${messageText}"`);

        if (senderPsid && messageText) {
          const cleanText = messageText.trim().toLowerCase();

          // Core parsing matchers
          if (cleanText.includes('ping') || cleanText.includes('@bot ping')) {
            console.log(`[Trigger Matched] "${messageText}" contains keyword. Sending response...`);
            await sendMessengerResponse(senderPsid, "Pong! The bot infrastructure is fully live. 🚀");
          } else {
            console.log(`[Trigger Ignored] "${messageText}" didn't match routing keywords.`);
          }
        }
      }

      // CRITICAL: Return 200 OK immediately so Meta knows the event was successfully ingested
      console.log("[Response Sent] Returning 200 OK to Meta engine.");
      return res.status(200).send('EVENT_RECEIVED');
    } else {
      console.error(`[Error] Expected 'page' object type, but received: "${body.object}"`);
      return res.status(404).send('Not Found');
    }
  }

  // Catch-all block for unhandled request types (PUT, DELETE, etc.)
  console.warn(`[Method Blocked] ${req.method} is unhandled by this endpoint.`);
  return res.status(405).send('Method Not Allowed');
}

// 3. Helper Function: Sends replies back through Meta's Graph API
async function sendMessengerResponse(senderPsid, textResponse) {
  const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;

  if (!PAGE_ACCESS_TOKEN) {
    console.error("[Configuration Error] Missing MESSENGER_PAGE_ACCESS_TOKEN environment variable.");
    return;
  }

  const payload = {
    recipient: { id: senderPsid },
    message: { text: textResponse }
  };

  console.log(`[Graph API Outbound] Dispatching request to Meta for PSID: ${senderPsid}...`);

  try {
    const response = await fetch(`https://graph.facebook.com/v23.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log(`[Graph API Success] Message successfully delivered to user ${senderPsid}. ID:`, responseData.message_id);
    } else {
      console.error('[Graph API Failure Details] Meta returned error status:', response.status, responseData);
    }
  } catch (err) {
    console.error('[Network Error] Failed to connect to graph.facebook.com endpoint:', err);
  }
}
