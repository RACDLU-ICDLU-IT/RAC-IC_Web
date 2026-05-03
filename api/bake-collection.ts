import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { collectionName, data, secret } = req.body as {
    collectionName?: string;
    data?: unknown;
    secret?: string;
  };

  // Matches your env var: VITE_BAKE_SECRET
  const expectedSecret = process.env.VITE_BAKE_SECRET || 'dev-secret';
  if (!secret || secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!collectionName || typeof collectionName !== 'string') {
    return res.status(400).json({ error: 'collectionName is required' });
  }

  try {
    const bakedDir = path.join(process.cwd(), 'public', 'baked');
    try {
      await fs.access(bakedDir);
    } catch {
      await fs.mkdir(bakedDir, { recursive: true });
    }

    const filePath = path.join(bakedDir, `${collectionName}.json`);
    await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');

    const versionPath = path.join(bakedDir, 'version.json');
    await fs.writeFile(versionPath, JSON.stringify({ ts: Date.now() }), 'utf-8');

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error baking collection:', error);
    return res.status(500).json({ error: 'Failed to bake collection' });
  }
}
