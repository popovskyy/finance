const COLORS = ["#f2b550", "#3ecf99", "#8097ff", "#ff7077", "#3ccdb6", "#ffffff"];

/** A short burst of confetti over the page; does nothing with reduced motion. */
export function confetti(originX = 0.5, originY = 0.3) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:60";
  document.body.appendChild(canvas);
  const ratio = window.devicePixelRatio || 1;
  canvas.width = innerWidth * ratio;
  canvas.height = innerHeight * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();
  ctx.scale(ratio, ratio);

  const pieces = Array.from({ length: 140 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
    const speed = 7 + Math.random() * 9;
    return {
      x: originX * innerWidth,
      y: originY * innerHeight,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      spin: (Math.random() - 0.5) * 0.4,
      rot: Math.random() * Math.PI,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  });

  const started = performance.now();
  const frame = (now: number) => {
    const t = now - started;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pieces) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 2600);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
      ctx.restore();
    }
    if (t < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
