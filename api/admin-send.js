// api/admin-send.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { psid, pageId, text } = req.body;
  if (!psid || !pageId || !text) return res.status(400).json({ error: 'Missing fields' });

  const PAGE_TOKEN_MAP = {
    [process.env.PAGE_ID_1]: process.env.MESSENGER_PAGE_ACCESS_TOKEN,
    [process.env.PAGE_ID_2]: process.env.MESSENGER_PAGE_ACCESS_TOKEN_2,
  };

  const token = PAGE_TOKEN_MAP[pageId];
  if (!token) return res.status(400).json({ error: 'Unknown page' });

  try {
    const r = await fetch(
      `https://graph.facebook.com/v23.0/me/messages?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { id: psid }, message: { text } })
      }
    );
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data });
    return res.status(200).json({ ok: true, message_id: data.message_id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
