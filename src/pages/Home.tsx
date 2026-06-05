import { useEffect, useState } from 'react';
import MobileHome from './MobileHome';
import DesktopHome from './DesktopHome';

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Set correct value on mount (runs only in browser)
    setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

export default function Home() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileHome /> : <DesktopHome />;
}
