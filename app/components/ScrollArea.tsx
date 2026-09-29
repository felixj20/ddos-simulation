'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// A panel-sized scroll container. On wide screens it scrolls on its own and fades its
// edges while more content sits above or below; on narrow screens it is a plain block
// and the page scrolls instead (see .scroll-shell in globals.css).
export function ScrollArea({ className = '', children }: { className?: string; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const update = () => {
      const top = el.scrollTop > 1;
      const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
      setEdges((previous) => (previous.top === top && previous.bottom === bottom ? previous : { top, bottom }));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(el);
    if (content.current) resize.observe(content.current);
    return () => {
      el.removeEventListener('scroll', update);
      resize.disconnect();
    };
  }, []);

  return (
    <div className={`scroll-shell ${className}`} data-fade-top={edges.top || undefined} data-fade-bottom={edges.bottom || undefined}>
      <div ref={viewport} className="scroll-area">
        <div ref={content} className="scroll-content">{children}</div>
      </div>
    </div>
  );
}
