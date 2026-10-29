import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Fondo de la tienda: partículas sutiles en canvas 2D + dos focos de luz neón
 * que siguen lentamente al puntero (iluminación dinámica).
 */
export function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightA = useRef<HTMLDivElement>(null);
  const lightB = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999, tx: 0.5, ty: 0.3, lx: 0.5, ly: 0.3 };

    type P = { x: number; y: number; vx: number; vy: number; r: number; hue: number };
    let particles: P[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(70, (w * h) / 26000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18 - 0.05,
        r: Math.random() * 1.4 + 0.3,
        hue: Math.random() < 0.5 ? 190 : 265,
      }));
    };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.tx = e.clientX / w;
      mouse.ty = e.clientY / h;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 160);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + near * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${0.25 + near * 0.55})`;
        ctx.fill();
      }
      // Líneas finas entre partículas cercanas
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 110) {
            ctx.strokeStyle = `rgba(167, 139, 250, ${(1 - d / 110) * 0.08})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      // Luz que sigue al puntero con inercia
      mouse.lx += (mouse.tx - mouse.lx) * 0.03;
      mouse.ly += (mouse.ty - mouse.ly) * 0.03;
      if (lightA.current) lightA.current.style.transform = `translate3d(${mouse.lx * 40 - 20}vw, ${mouse.ly * 30 - 15}vh, 0)`;
      if (lightB.current) lightB.current.style.transform = `translate3d(${-mouse.lx * 30 + 15}vw, ${-mouse.ly * 20 + 10}vh, 0)`;
      raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    if (reduce) draw();
    else raf = requestAnimationFrame(draw);
    if (reduce) cancelAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduce]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div
        ref={lightA}
        className="absolute -top-[20vh] left-[10vw] size-[60vmax] rounded-full opacity-[0.22] blur-[120px] will-change-transform"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 65%)' }}
      />
      <div
        ref={lightB}
        className="absolute top-[30vh] -right-[15vw] size-[55vmax] rounded-full opacity-[0.16] blur-[120px] will-change-transform"
        style={{ background: 'radial-gradient(circle, #22d3ee 0%, #3b82f6 35%, transparent 65%)' }}
      />
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,#05050a_75%)] opacity-60" />
    </div>
  );
}
