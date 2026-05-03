import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API endpoints
  
  // The client will send the already fetched collection data to this endpoint.
  // This avoids needing firebase-admin and credentials on the server side just for reading public data.
  // We'll trust the client if it provides the correct secret.
  app.post('/api/bake-collection', async (req, res) => {
    const { collectionName, data, secret } = req.body;
    
    // In a real scenario, validate this secret against an environment variable
    const expectedSecret = process.env.VITE_BAKE_SECRET || 'dev-secret';
    if (secret !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Ensure the "baked" directory exists
      const bakedDir = path.join(process.cwd(), 'public', 'baked');
      try {
        await fs.access(bakedDir);
      } catch {
        await fs.mkdir(bakedDir, { recursive: true });
      }

      const filePath = path.join(bakedDir, `${collectionName}.json`);
      await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');
      
      // Update the version file
      const versionPath = path.join(bakedDir, 'version.json');
      await fs.writeFile(versionPath, JSON.stringify({ ts: Date.now() }), 'utf-8');

      res.json({ success: true });
    } catch (error) {
      console.error('Error baking collection:', error);
      res.status(500).json({ error: 'Failed to bake collection' });
    }
  });

  // Cloudinary image deletion proxy
  app.post('/api/delete-image', async (req, res) => {
    // Left as a stub for actual implementation with Cloudinary API and Firebase Auth token validation
    res.json({ success: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
