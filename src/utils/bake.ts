import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function bakeCollection(collectionName: string, data: any[]) {
  const secret = import.meta.env.VITE_BAKE_SECRET || 'dev-secret';
  try {
    const response = await fetch('/api/bake-collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionName, data, secret }),
    });
    if (!response.ok) {
      console.warn(`Bake collection ${collectionName} returned ${response.status}`);
    }
  } catch (e) {
    console.error('Bake failed for', collectionName, e);
    // Non-fatal — do not throw. Bake failures are silent to the user.
  }
}

export async function fetchAndBake(collectionName: string) {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    await bakeCollection(collectionName, allDocs);
  } catch(e) {
    console.error('Failed to fetch and bake', collectionName, e);
  }
}
