// home.tsx
import { useEffect, useState } from "react";
import MobileHome from "./MobileHome";
import DesktopHome from "./DesktopHome";

const MOBILE_BREAKPOINT = 768; // px — adjust to match your design system

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

export default function Home() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileHome /> : <DesktopHome />;
}
