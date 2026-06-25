// api/user-info.js
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  // Parse query params manually (same fix as webhook.js)
  let psid = null, pageId = null;
  const qi = req.url?.indexOf('?');
  if (qi !== -1 && qi !== undefined) {
    const sp = new URLSearchParams(req.url.slice(qi + 1));
    psid = sp.get('psid');
    pageId = sp.get('pageId');
  }
  if (!psid && req.query) {
    psid = req.query.psid ?? null;
    pageId = req.query.pageId ?? null;
  }

  if (!psid || !pageId) return res.status(400).json({ error: 'Missing psid or pageId' });

  const PAGE_TOKEN_MAP = {
    [process.env.PAGE_ID_1]: process.env.MESSENGER_PAGE_ACCESS_TOKEN,
    [process.env.PAGE_ID_2]: process.env.MESSENGER_PAGE_ACCESS_TOKEN_2,
  };

  const token = PAGE_TOKEN_MAP[pageId];
  if (!token) return res.status(400).json({ error: `Unknown pageId: ${pageId}` });

  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${psid}?fields=name,profile_pic&access_token=${token}`
    );
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data });
    return res.status(200).json({ name: data.name || null, profile_pic: data.profile_pic || null });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
