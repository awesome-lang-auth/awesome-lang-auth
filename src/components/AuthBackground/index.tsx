import React, { useEffect, useRef } from 'react';

/**
 * Full-viewport canvas background animation: hex grid, node graph, data
 * streams, shield arcs, centre vortex and mouse parallax.
 *
 * Mounted once in Root.tsx so the animation persists across all wiki pages.
 * position:fixed / z-index:-1 means every section with a solid background
 * naturally covers it; transparent areas (e.g. the hero) let it show through.
 */
export default function AuthBackground(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── utils ──────────────────────────────────────────────────────────────
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const TAU = Math.PI * 2;

    // ── palette ────────────────────────────────────────────────────────────
    type RGB = [number, number, number];
    const CYAN: RGB = [108, 240, 255];
    const VIOLET: RGB = [124, 92, 255];
    const GREEN: RGB = [80, 255, 160];
    const WHITE: RGB = [255, 255, 255];
    const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r},${g},${b},${a})`;

    // ── state ──────────────────────────────────────────────────────────────
    let W = 0, H = 0;
    let mx = 0, my = 0;
    let rafId = 0;
    let vortexPhase = 0;

    // ── nodes ──────────────────────────────────────────────────────────────
    type Node = { x: number; y: number; vx: number; vy: number; r: number; col: RGB; locked: boolean; lockTimer: number; alpha: number };
    const NODE_COUNT = 38;
    const nodes: Node[] = [];

    function spawnNode(): Node {
      return {
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.18, 0.18), vy: rand(-0.18, 0.18),
        r: rand(1.5, 3.2),
        col: Math.random() < 0.6 ? CYAN : VIOLET,
        locked: Math.random() < 0.5,
        lockTimer: rand(0, 300),
        alpha: rand(0.4, 1),
      };
    }

    // ── hex grid ───────────────────────────────────────────────────────────
    const HEX_R = 46;
    const HEX_H = HEX_R * Math.sqrt(3);
    type Hex = { x: number; y: number; pulse: number; speed: number; bright: boolean };
    const hexes: Hex[] = [];

    function buildHexGrid() {
      hexes.length = 0;
      const cols = Math.ceil(W / (HEX_R * 1.5)) + 2;
      const rows = Math.ceil(H / HEX_H) + 2;
      for (let col = -1; col < cols; col++) {
        for (let row = -1; row < rows; row++) {
          hexes.push({
            x: col * HEX_R * 1.5,
            y: row * HEX_H + (col % 2 ? HEX_H / 2 : 0),
            pulse: rand(0, TAU),
            speed: rand(0.004, 0.012),
            bright: Math.random() < 0.08,
          });
        }
      }
    }

    function hexPath(x: number, y: number, r: number) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = TAU / 6 * i - Math.PI / 6;
        i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
          : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
      }
      ctx.closePath();
    }

    // ── data streams ───────────────────────────────────────────────────────
    const CHARS = '01ABCDEF⟨⟩∅⊕⊗⊞⊟◈◇■□⬡';
    type StreamChar = { ch: string; alpha: number; targetAlpha: number; flipTimer: number };
    type Stream = { x: number; y: number; speed: number; chars: StreamChar[]; spacing: number; col: RGB; alpha: number; dead: boolean };
    const streams: Stream[] = [];

    function spawnStream(): Stream {
      return {
        x: rand(0, W), y: rand(-200, 0),
        speed: rand(0.6, 1.6),
        chars: Array.from({ length: Math.floor(rand(6, 18)) }, () => ({
          ch: CHARS[Math.floor(rand(0, CHARS.length))],
          alpha: 0,
          targetAlpha: rand(0.1, 0.55),
          flipTimer: rand(0, 120),
        })),
        spacing: rand(13, 17),
        col: Math.random() < 0.65 ? CYAN : GREEN,
        alpha: rand(0.35, 0.8),
        dead: false,
      };
    }

    // ── shield arcs ────────────────────────────────────────────────────────
    type Shield = { x: number; y: number; r: number; phase: number; speed: number; arcs: number; col: RGB; life: number; age: number };
    const shields: Shield[] = [];

    function spawnShield(): Shield {
      return {
        x: rand(W * 0.2, W * 0.8), y: rand(H * 0.2, H * 0.8),
        r: rand(60, 130),
        phase: rand(0, TAU),
        speed: rand(0.005, 0.018) * (Math.random() < 0.5 ? 1 : -1),
        arcs: Math.floor(rand(2, 5)),
        col: Math.random() < 0.5 ? CYAN : VIOLET,
        life: rand(300, 600),
        age: 0,
      };
    }

    // ── resize ─────────────────────────────────────────────────────────────
    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      mx = W / 2; my = H / 2;
      buildHexGrid();
    }

    function onMouseMove(e: MouseEvent) { mx = e.clientX; my = e.clientY; }

    // ── draw loop ──────────────────────────────────────────────────────────
    function draw() {
      rafId = requestAnimationFrame(draw);

      ctx.fillStyle = '#060b18';
      ctx.fillRect(0, 0, W, H);

      const px = (mx / W - 0.5) * 0.04;
      const py = (my / H - 0.5) * 0.04;

      // 1. hex grid
      for (const h of hexes) {
        h.pulse += h.speed;
        const t = (Math.sin(h.pulse) + 1) / 2;
        const base = h.bright ? 0.12 : 0.025;
        const a = lerp(base, h.bright ? 0.32 : 0.07, t);
        hexPath(h.x, h.y, HEX_R * 0.93);
        ctx.strokeStyle = rgba(h.bright ? GREEN : CYAN, a);
        ctx.lineWidth = h.bright ? 1.2 : 0.6;
        ctx.stroke();
      }

      // 2. node connections
      ctx.save();
      ctx.translate(W * px, H * py);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = rgba(CYAN, (1 - dist / 160) * 0.25);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // 3. node dots
      for (const n of nodes) {
        n.x = (n.x + n.vx + W) % W;
        n.y = (n.y + n.vy + H) % H;
        n.lockTimer++;
        if (n.lockTimer > rand(200, 500)) { n.locked = !n.locked; n.lockTimer = 0; }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, TAU);
        ctx.fillStyle = rgba(n.col, n.alpha * 0.8);
        ctx.fill();

        if (n.locked) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 4, 0, TAU);
          ctx.strokeStyle = rgba(GREEN, 0.7);
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
      ctx.restore();

      // 4. data streams
      ctx.save();
      ctx.font = '11px monospace';
      for (const s of streams) {
        s.y += s.speed;
        if (s.y > H + s.chars.length * s.spacing) { s.dead = true; }
        s.chars.forEach((ch, i) => {
          ch.flipTimer--;
          if (ch.flipTimer <= 0) {
            ch.ch = CHARS[Math.floor(rand(0, CHARS.length))];
            ch.flipTimer = rand(40, 140);
          }
          const fade = clamp(1 - i / s.chars.length, 0, 1);
          const alpha = ch.targetAlpha * fade * s.alpha;
          ctx.fillStyle = rgba(i === 0 ? WHITE : s.col, i === 0 ? alpha * 1.4 : alpha);
          ctx.fillText(ch.ch, s.x, s.y - i * s.spacing);
        });
      }
      for (let i = streams.length - 1; i >= 0; i--) {
        if (streams[i].dead) streams[i] = spawnStream();
      }
      ctx.restore();

      // 5. shield arcs
      for (const sh of shields) {
        sh.age++;
        if (sh.age > sh.life) { Object.assign(sh, spawnShield()); continue; }
        const fade = clamp(Math.min(sh.age / 60, (sh.life - sh.age) / 60), 0, 1);
        sh.phase += sh.speed;
        for (let i = 0; i < sh.arcs; i++) {
          const off = TAU / sh.arcs * i + sh.phase;
          const span = TAU / (sh.arcs * 1.8);
          ctx.beginPath();
          ctx.arc(sh.x, sh.y, sh.r, off, off + span);
          ctx.strokeStyle = rgba(sh.col, 0.45 * fade);
          ctx.lineWidth = 1.2;
          ctx.shadowColor = rgba(sh.col, 1);
          ctx.shadowBlur = 6;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 2.5, 0, TAU);
        ctx.fillStyle = rgba(sh.col, 0.6 * fade);
        ctx.fill();
      }

      // 6. vortex (centre glow + rotating dashed rings)
      vortexPhase += 0.004;
      const cx = W / 2, cy = H / 2;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.38);
      grd.addColorStop(0, rgba(CYAN, 0.09));
      grd.addColorStop(0.5, rgba(VIOLET, 0.04));
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 3; i++) {
        const r = 140 + i * 55;
        const segments = 24 + i * 8;
        const gapFrac = 0.35;
        for (let s = 0; s < segments; s++) {
          const a0 = TAU / segments * s + vortexPhase * (i % 2 ? 1 : -1);
          const a1 = a0 + TAU / segments * (1 - gapFrac);
          ctx.beginPath();
          ctx.arc(cx, cy, r, a0, a1);
          ctx.strokeStyle = rgba(i === 1 ? VIOLET : CYAN, 0.18);
          ctx.lineWidth = i === 1 ? 1.5 : 1;
          ctx.stroke();
        }
      }
    }

    // ── bootstrap ──────────────────────────────────────────────────────────
    resize();
    for (let i = 0; i < NODE_COUNT; i++) nodes.push(spawnNode());
    for (let i = 0; i < 22; i++) {
      const s = spawnStream();
      s.y = rand(-H, H);
      streams.push(s);
    }
    for (let i = 0; i < 5; i++) shields.push(spawnShield());
    draw();

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="auth-canvas" />;
}
