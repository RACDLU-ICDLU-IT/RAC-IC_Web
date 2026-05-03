import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ScrollAnimatedNumber({ end, suffix = '', duration = 2 }: { end: number, suffix?: string, duration?: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!nodeRef.current) return;
    
    const obj = { val: 0 };
    
    gsap.to(obj, {
      val: end,
      duration: duration,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: nodeRef.current,
        start: 'top 80%',
      },
      onUpdate: () => {
        if (nodeRef.current) {
          nodeRef.current.innerText = Math.floor(obj.val) + suffix;
        }
      }
    });
  }, [end, suffix, duration]);

  return <span ref={nodeRef}>0{suffix}</span>;
}
