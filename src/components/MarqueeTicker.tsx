import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

export default function MarqueeTicker({ items }: { items: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    const content = containerRef.current.querySelector('.marquee-content');
    if (!content) return;

    // Clone the content for seamless wrapping
    const clone = content.cloneNode(true);
    containerRef.current.appendChild(clone);

    const elWidth = (content as HTMLElement).offsetWidth;
    
    gsap.to(containerRef.current.children, {
      x: `-=${elWidth}`,
      duration: elWidth / 100, // speed
      ease: 'none',
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize((x) => parseFloat(x) % elWidth)
      }
    });

  }, [items]);

  return (
    <div className="w-full overflow-hidden flex whitespace-nowrap bg-accent text-primary py-4 border-y border-white/10" ref={containerRef}>
      <div className="marquee-content flex gap-8 px-4 items-center">
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            <span className="font-heading font-medium tracking-wider uppercase text-sm">{item}</span>
            <span className="w-2 h-2 rounded-full bg-primary/30"></span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
