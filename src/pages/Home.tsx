import { useEffect, useState } from 'react';
import MobileHome from './MobileHome';
import DesktopHome from './DesktopHome';

const MOBILE_BREAKPOINT = 768;

// Read breakpoint synchronously so the correct component
// mounts on the very first render — no flash, no style conflict.
function getIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

export default function Home() {
  const [isMobile, setIsMobile] = useState<boolean>(getIsMobile);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile ? <MobileHome /> : <DesktopHome />;
}
