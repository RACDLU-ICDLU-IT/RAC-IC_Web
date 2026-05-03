import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// This acts as a cache
const contentCache: Record<string, any> = {};

export function usePageContent(pageId: string, defaultData: any) {
  const [content, setContent] = useState(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      // 1. Try memory cache
      if (contentCache[pageId]) {
        setContent({ ...defaultData, ...contentCache[pageId] });
        setLoading(false);
        return;
      }

      try {
        // 2. Try static baked JSON file
        const res = await fetch(`/baked/${pageId}.json`);
        if (res.ok) {
          const bakedData = await res.json();
          contentCache[pageId] = bakedData;
          if (isMounted) {
            setContent({ ...defaultData, ...bakedData });
            setLoading(false);
          }
        }
      } catch (e) {
        // Ignore fetch errors, fallback to Firestore
      }

      // 3. Fallback to Firestore and update cache
      try {
        const docSnap = await getDoc(doc(db, 'pageContent', pageId));
        if (docSnap.exists()) {
          const dbData = docSnap.data();
          contentCache[pageId] = dbData;
          if (isMounted) {
            setContent({ ...defaultData, ...dbData });
          }
        }
      } catch (e) {
        console.error("Failed to load content for", pageId, e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadContent();

    return () => { isMounted = false; };
  }, [pageId]);

  return { content, loading };
}
