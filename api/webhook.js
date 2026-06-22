import axios from 'axios';

// Utility function to send messages back to the Messenger chat thread
async function sendTextMessage(senderPsid, text) {
  const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  
  if (!PAGE_ACCESS_TOKEN) {
    console.error("Missing MESSENGER_PAGE_ACCESS_TOKEN environment variable.");
    return;
  }

  const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  
  const payload = {
    recipient: { id: senderPsid },
    message: { text: text },
    messaging_type: "RESPONSE"
  };

  try {
    await axios.post(url, payload);
    console.log(`Message sent successfully to ${senderPsid}`);
  } catch (error) {
    console.error("Error sending message via Graph API:", error.response?.data || error.message);
  }
}

// Main Vercel serverless function entry point
export default async function handler(req, res) {
  
  // 1. Meta Webhook Handshake Verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    const MY_VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || 'my_fallback_token_123';

    if (mode && token) {
      if (mode === 'subscribe' && token === MY_VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        return res.status(200).send(challenge);
      } else {
        return res.status(403).end();
      }
    }
  }

  // 2. Handle Incoming Events from Messenger Group Chat
  if (req.method === 'POST') {
    const body = req.body;

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const webhook_event = entry.messaging?.[0];
        
        if (webhook_event && webhook_event.message) {
          const messageText = webhook_event.message.text;
          const senderPsid = webhook_event.sender.id; 

          // Skip if it's an empty message or attachment
          if (!messageText) continue;

          console.log(`Incoming message in thread: "${messageText}"`);

          // Group Chat Logic: Only respond if the bot is explicitly mentioned
          if (messageText.startsWith('@Bot')) {
            // Strip out the tag to get the user's actual query
            const cleanQuery = messageText.replace('@Bot', '').trim();

            if (cleanQuery.toLowerCase() === 'ping') {
              await sendTextMessage(senderPsid, "Pong! The bot is active in this group.");
            } else if (cleanQuery.toLowerCase() === 'help') {
              await sendTextMessage(senderPsid, "Hello! Use `@Bot ping` to test availability.");
            } else {
              // Default fallback reply
              await sendTextMessage(senderPsid, `Received command: "${cleanQuery}". Processing logic goes here!`);
            }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    } else {
      return res.status(404).end();
    }
  }

  return res.status(405).end(); // Catch unsupported HTTP methods
}
