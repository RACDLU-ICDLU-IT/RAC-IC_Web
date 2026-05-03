import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { publicId } = req.body as { publicId?: string };

  if (!publicId || typeof publicId !== 'string') {
    return res.status(400).json({ error: 'publicId is required' });
  }

  // Uses your exact env var name: VITE_CLOUDINARY_CLOUD_NAME
  const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // If Cloudinary server credentials are not set, skip deletion gracefully.
  // The app will still work — images just won't be removed from Cloudinary storage.
  // Add CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Vercel dashboard when ready.
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('Cloudinary server credentials not configured — skipping deletion.');
    return res.status(200).json({ success: true, stub: true });
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);
    const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

    const formData = new URLSearchParams({
      public_id: publicId,
      api_key:   apiKey,
      timestamp:  String(timestamp),
      signature,
    });

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    formData.toString(),
      }
    );

    const result = await cloudinaryRes.json() as { result?: string };

    if (result.result === 'ok' || result.result === 'not found') {
      return res.status(200).json({ success: true, result: result.result });
    }

    return res.status(500).json({ error: 'Cloudinary deletion failed', detail: result });
  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
