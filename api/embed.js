// api/embed.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { text, taskType = 'RETRIEVAL_DOCUMENT' } = req.body;
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Missing text' });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: text.slice(0, 2000) }] },
          taskType,
          outputDimensionality: 768
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('[Embed] Gemini error:', response.status, data);
      return res.status(response.status).json({ error: data });
    }

    const embedding = data.embedding?.values || null;
    if (!embedding) return res.status(500).json({ error: 'No embedding returned', raw: data });

    return res.status(200).json({ embedding });
  } catch (err) {
    console.error('[Embed] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
