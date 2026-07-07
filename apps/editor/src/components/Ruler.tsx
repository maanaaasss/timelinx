import { useRef, useEffect, useCallback, forwardRef } from 'react';

interface RulerProps {
  ppf: number;
  fps: number;
  playheadFrame: number;
  onClick: (frame: number) => void;
}

export const Ruler = forwardRef<HTMLDivElement, RulerProps>(function Ruler(
  { ppf, fps, playheadFrame, onClick },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollLeftRef = useRef(0);

  const setRef = useCallback((el: HTMLDivElement | null) => {
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }, [ref]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = 28;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#1e1e3a';
    ctx.fillRect(0, 0, width, height);

    const sl = scrollLeftRef.current;
    const framesPerSecond = fps;

    let tickInterval: number;
    if (ppf >= 10) {
      tickInterval = 1;
    } else if (ppf >= 4) {
      tickInterval = Math.max(1, Math.round(framesPerSecond / 5));
    } else if (ppf >= 1) {
      tickInterval = Math.max(1, framesPerSecond);
    } else {
      tickInterval = Math.max(1, framesPerSecond * 2);
    }

    const startFrame = Math.floor(sl / ppf);
    const endFrame = Math.ceil((sl + width) / ppf);

    ctx.strokeStyle = '#3a3a5a';
    ctx.fillStyle = '#808090';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';

    for (let i = startFrame; i <= endFrame; i++) {
      const x = (i * ppf) - sl;
      if (x < -ppf || x > width + ppf) continue;

      const isMajor = i % tickInterval === 0;
      const isSecond = i % framesPerSecond === 0;

      if (isSecond) {
        ctx.strokeStyle = '#5a5a7a';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        const seconds = Math.floor(i / framesPerSecond);
        ctx.fillText(`${seconds}s`, x, 12);
      } else if (isMajor) {
        ctx.strokeStyle = '#3a3a5a';
        ctx.beginPath();
        ctx.moveTo(x, height - 8);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    const playheadX = (playheadFrame * ppf) - sl;
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = '#ff4a6a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }, [ppf, fps, playheadFrame]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.scrollLeft !== undefined) {
        scrollLeftRef.current = detail.scrollLeft;
        draw();
      }
    };
    el.addEventListener('ruler-scroll', handleScroll);
    return () => el.removeEventListener('ruler-scroll', handleScroll);
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeftRef.current;
      const frame = Math.max(0, Math.round(x / ppf));
      onClick(frame);
    },
    [ppf, onClick],
  );

  return (
    <div ref={setRef} className="ruler" onClick={handleClick}>
      <canvas ref={canvasRef} />
    </div>
  );
});
