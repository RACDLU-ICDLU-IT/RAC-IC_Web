import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: profile } = await supabaseAdmin
    .from('users').select('role').eq('id', user.id).single();
  if (!['admin','master_admin'].includes(profile?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { publicId } = req.body as { publicId?: string };

  if (!publicId || typeof publicId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid publicId' });
  }

  const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
  const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
  const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME) {
    console.error('Missing Cloudinary credentials', { CLOUDINARY_API_KEY: !!CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET: !!CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME: !!CLOUDINARY_CLOUD_NAME });
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const timestamp = Math.round(new Date().getTime() / 1000);

  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

  const formData = new URLSearchParams();
  formData.append('public_id', publicId);
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      if (result.result === 'ok') {
         return res.status(200).json({ success: true, message: 'Image deleted' });
      } else {
         return res.status(400).json({ error: result.result || 'Failed to delete' });
      }
    } else {
      console.error('Cloudinary API error:', result);
      return res.status(response.status).json({ error: result.error?.message || 'Cloudinary API error' });
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
