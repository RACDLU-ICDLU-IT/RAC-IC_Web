// api/embed.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const text = req.body?.text;
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Missing or invalid text' });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY on server' });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;

  const payload = {
    model: 'models/text-embedding-004',
    content: {
      role: 'user',
      parts: [{ text: text.slice(0, 2000) }]
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Embed] Gemini error:', response.status, data);
      return res.status(response.status).json({ error: data });
    }

    const embedding = data.embedding?.values || null;
    if (!embedding) return res.status(500).json({ error: 'No embedding returned', raw: data });

    return res.status(200).json({ embedding });
  } catch (err) {
    console.error('[Embed] Network error:', err);
    return res.status(500).json({ error: err.message });
  }
}
