import { useEffect, useRef } from "react";
import { readCssRgb } from "@/lib/css-color";
import { INITIAL_GUARD, isCoolingDown, notePlay, type GuardState } from "@/lib/focus-guard";

const CELL = 6; // CSS px per field sample; the canvas is upscaled smoothly for soft edges
const REPEL_RADIUS = 170;
const ALPHA = 215;
const COOLDOWN_KEY = "study-buddy:bubble-rest";
// Pointer over these counts as studying, not bubble play.
const CONTENT = "button, a, input, textarea, select, label, [role=dialog], .sheet, .tile, .option-card";

type Bubble = { x: number; y: number; vx: number; vy: number; r: number; phase: number };

/** Soft tan metaball bubbles drifting over the grid; they merge, bounce and part around the cursor. */
export function BubbleBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, gw = 0, gh = 0;
    let img = ctx.createImageData(1, 1);
    let bubbles: Bubble[] = [];
    let color = readCssRgb("--bubble");
    let guard: GuardState = { ...INITIAL_GUARD, cooldownUntil: Number(localStorage.getItem(COOLDOWN_KEY)) || 0 };
    const pointer = { x: -1e4, y: -1e4, active: false };

    function seed() {
      const n = Math.round(Math.min(14, Math.max(7, (w * h) / 110_000)));
      bubbles = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 24,
        vy: (Math.random() - 0.5) * 24,
        r: 45 + Math.random() * 85,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      gw = Math.ceil(w / CELL);
      gh = Math.ceil(h / CELL);
      canvas!.width = gw;
      canvas!.height = gh;
      img = ctx!.createImageData(gw, gh);
      if (!bubbles.length) seed();
    }

    function step(dt: number, t: number) {
      const repel = pointer.active && !isCoolingDown(guard, Date.now());
      for (const b of bubbles) {
        // slow, wandering "flow" so paths feel organic
        b.vx += Math.cos(t * 0.00031 + b.phase) * 5 * dt;
        b.vy += Math.sin(t * 0.00027 + b.phase * 1.3) * 5 * dt;
        if (repel) {
          const dx = b.x - pointer.x, dy = b.y - pointer.y;
          const d = Math.hypot(dx, dy);
          const reach = REPEL_RADIUS + b.r * 0.5;
          if (d < reach && d > 0.1) {
            const f = (1 - d / reach) * 320 * dt;
            b.vx += (dx / d) * f;
            b.vy += (dy / d) * f;
          }
        }
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 16) {
          b.vx -= b.vx * 0.7 * dt;
          b.vy -= b.vy * 0.7 * dt;
        }
        if (sp > 120) {
          b.vx *= 120 / sp;
          b.vy *= 120 / sp;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const m = b.r * 0.3;
        if (b.x < -m) { b.x = -m; b.vx = Math.abs(b.vx); }
        if (b.x > w + m) { b.x = w + m; b.vx = -Math.abs(b.vx); }
        if (b.y < -m) { b.y = -m; b.vy = Math.abs(b.vy); }
        if (b.y > h + m) { b.y = h + m; b.vy = -Math.abs(b.vy); }
      }
    }

    function draw() {
      const data = img.data;
      const n = bubbles.length;
      const bx = new Float32Array(n), by = new Float32Array(n), br = new Float32Array(n);
      bubbles.forEach((b, i) => {
        bx[i] = b.x / CELL;
        by[i] = b.y / CELL;
        br[i] = (b.r / CELL) ** 2;
      });
      const [cr, cg, cb] = color;
      let p = 0;
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          let f = 0;
          for (let i = 0; i < n; i++) {
            const dx = x - bx[i]!, dy = y - by[i]!;
            f += br[i]! / (dx * dx + dy * dy + 1);
          }
          let a = (f - 0.8) / 0.4;
          a = a < 0 ? 0 : a > 1 ? 1 : a;
          data[p] = cr;
          data[p + 1] = cg;
          data[p + 2] = cb;
          data[p + 3] = a * a * (3 - 2 * a) * ALPHA;
          p += 4;
        }
      }
      ctx!.putImageData(img, 0, 0);
    }

    function onMove(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
      const target = e.target as Element | null;
      if (target?.closest?.(CONTENT)) return;
      const near = bubbles.some((b) => Math.hypot(b.x - e.clientX, b.y - e.clientY) < b.r + REPEL_RADIUS * 0.6);
      if (!near) return;
      const before = guard.cooldownUntil;
      guard = notePlay(guard, Date.now());
      if (guard.cooldownUntil !== before) localStorage.setItem(COOLDOWN_KEY, String(guard.cooldownUntil));
    }
    const onLeave = () => { pointer.active = false; };
    const onOut = (e: PointerEvent) => { if (!e.relatedTarget) pointer.active = false; };
    const onUp = (e: PointerEvent) => { if (e.pointerType === "touch") onLeave(); };

    const themeObserver = new MutationObserver(() => {
      color = readCssRgb("--bubble");
      if (reduce) draw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

    resize();
    window.addEventListener("resize", resize);

    if (reduce) {
      draw();
      return () => {
        window.removeEventListener("resize", resize);
        themeObserver.disconnect();
      };
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    document.addEventListener("pointerout", onOut);

    let raf = 0, last = performance.now(), acc = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      if (acc < 1 / 30) return; // ~30 fps is plenty for slow drifting
      step(acc, now);
      acc = 0;
      draw();
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerout", onOut);
      themeObserver.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 size-full" />;
}
