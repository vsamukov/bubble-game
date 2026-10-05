import { BubbleSimulation } from '../physics/bubbleSimulation';
import { Bubble, GameTheme } from '../types/game';
import { THEMES } from '../config/gameConstants';
import { sound } from '../audio/soundEngine';

export interface ExplosionParticle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  glowColor: string;
  alpha: number;
  life: number;
  maxLife: number;
  drag: number;
  gravity: number;
  isSpark: boolean;
  angle: number;
  rotation: number;
  spinSpeed: number;
}

export interface ExplosionFlash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface ExplosionRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  alpha: number;
  lineWidth: number;
}

export interface FireworkRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  exploded: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

export interface FireworkSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
}

export class BubbleRenderer {
  private ctx: CanvasRenderingContext2D;
  private sim: BubbleSimulation;
  private theme: GameTheme = 'prismatic';

  // Dedicated sharp-tap particle explosion system
  private explosionParticles: ExplosionParticle[] = [];
  private explosionFlashes: ExplosionFlash[] = [];
  private explosionRings: ExplosionRing[] = [];
  private lastRenderTime: number = 0;

  // Fireworks system for Russian word completion
  private fireworkRockets: FireworkRocket[] = [];
  private fireworkSparks: FireworkSpark[] = [];

  constructor(ctx: CanvasRenderingContext2D, sim: BubbleSimulation) {
    this.ctx = ctx;
    this.sim = sim;
  }

  public setTheme(theme: GameTheme) {
    this.theme = theme;
  }

  /**
   * Triggers a vivid particle explosion effect at the coordinate of a burst bubble
   */
  public triggerExplosion(
    x: number,
    y: number,
    radius: number,
    hue: number,
    secondaryHue: number = (hue + 45) % 360
  ) {
    const themeConfig = THEMES[this.theme];
    const filmColors = themeConfig.filmColors;

    // 1. Core Radiant Nova Flash
    this.explosionFlashes.push({
      x,
      y,
      radius: Math.max(8, radius * 0.25),
      maxRadius: Math.max(35, radius * 1.6),
      color: `hsla(${hue}, 100%, 88%, 0.95)`,
      alpha: 0.95,
      life: 0,
      maxLife: 0.22,
    });

    // 2. Dual Iridescent Shockwave Rings
    this.explosionRings.push({
      x,
      y,
      r: radius * 0.4,
      maxR: radius * 2.2 + 30,
      color: `hsla(${hue}, 95%, 75%, 0.9)`,
      alpha: 0.9,
      lineWidth: 3.5,
    });

    this.explosionRings.push({
      x,
      y,
      r: radius * 0.2,
      maxR: radius * 1.6 + 15,
      color: `hsla(${secondaryHue}, 90%, 80%, 0.75)`,
      alpha: 0.75,
      lineWidth: 2.0,
    });

    // 3. High-Velocity Explosion Particles with Motion Streaks and Diamond Glints
    const particleCount = Math.min(115, Math.floor(40 + radius * 0.75));
    const baseSpeed = 180 + radius * 1.6;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = (0.45 + Math.random() * 1.15) * baseSpeed;
      const isSpark = Math.random() < 0.28; // ~28% diamond glints / starburst sparks

      // Iridescent color chosen from film palette and bubble hues
      const colorIndex = i % filmColors.length;
      const particleHue = (hue + (Math.random() * 60 - 30)) % 360;
      const color = isSpark
        ? '#ffffff'
        : Math.random() > 0.4
        ? filmColors[colorIndex]
        : `hsl(${particleHue}, 95%, 75%)`;
      const glowColor = `hsla(${particleHue}, 100%, 75%, 0.8)`;

      this.explosionParticles.push({
        x: x + Math.cos(angle) * (radius * 0.2),
        y: y + Math.sin(angle) * (radius * 0.2),
        prevX: x,
        prevY: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: isSpark ? 2.5 + Math.random() * 3.5 : 1.5 + Math.random() * 3.8,
        color,
        glowColor,
        alpha: 1.0,
        life: 0,
        maxLife: isSpark ? 0.55 + Math.random() * 0.35 : 0.42 + Math.random() * 0.38,
        drag: isSpark ? 0.94 : 0.91,
        gravity: 90 + Math.random() * 55,
        isSpark,
        angle,
        rotation: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 14,
      });
    }
  }

  public render(width: number, height: number, timeMs: number) {
    const ctx = this.ctx;
    const themeConfig = THEMES[this.theme];
    const dt = this.lastRenderTime > 0
      ? Math.min(0.05, Math.max(0.001, (timeMs - this.lastRenderTime) * 0.001))
      : 0.016;
    this.lastRenderTime = timeMs;

    // 1. Draw atmospheric background gradient
    const bgGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      width * 0.1,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.8
    );
    bgGrad.addColorStop(0, themeConfig.backgroundGradient[1]);
    bgGrad.addColorStop(0.65, themeConfig.backgroundGradient[0]);
    bgGrad.addColorStop(1, themeConfig.backgroundGradient[2]);

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw ambient floating dust motes (bokeh)
    this.renderMotes(ctx, themeConfig.moteColor);

    // 3. Draw liquid metaball adhesion bridges between close bubbles
    this.renderAdhesionBridges(ctx);

    // 4. Draw shockwave ripples
    this.renderShockwaves(ctx);

    // 5. Draw all active bubbles with iridescent membranes and wobbling vertices
    const bubbles = this.sim.bubbles;
    for (let i = 0; i < bubbles.length; i++) {
      this.renderBubble(ctx, bubbles[i], timeMs);
    }

    // 6. Draw pop droplets & micro-particles
    this.renderParticles(ctx);

    // 7. Draw dedicated sharp-tap particle explosion system (flashes, shrapnel trails, sparks)
    this.renderExplosionEffects(ctx, dt);

    // 8. Draw fireworks rockets & sparkling bouquets for Russian word completion
    this.renderFireworks(ctx, dt);
  }

  /**
   * Triggers grand fireworks celebration when a full Russian word is assembled
   */
  public triggerFireworks(count: number = 7, width: number = 800, height: number = 600) {
    const colors = ['#f43f5e', '#38bdf8', '#fbbf24', '#34d399', '#c084fc', '#f472b6', '#60a5fa', '#facc15'];
    for (let i = 0; i < count; i++) {
      const launchX = width * (0.12 + 0.76 * (i / (count - 1 || 1)) + (Math.random() - 0.5) * 0.08);
      const targetY = height * (0.16 + Math.random() * 0.32);
      const color = colors[i % colors.length];

      this.fireworkRockets.push({
        x: launchX,
        y: height + 20 + i * 15,
        vx: (Math.random() - 0.5) * 50,
        vy: -390 - Math.random() * 110,
        targetY,
        color,
        exploded: false,
        trail: [],
      });
    }
  }

  private renderFireworks(ctx: CanvasRenderingContext2D, dt: number) {
    // 1. Update & Render Rockets
    for (let i = this.fireworkRockets.length - 1; i >= 0; i--) {
      const r = this.fireworkRockets[i];
      r.y += r.vy * dt;
      r.x += r.vx * dt;
      r.vy += 80 * dt; // gravity deceleration

      r.trail.push({ x: r.x, y: r.y, alpha: 0.85 });
      if (r.trail.length > 8) r.trail.shift();

      // Draw rocket trail
      ctx.save();
      for (let t = 0; t < r.trail.length; t++) {
        const pt = r.trail[t];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.globalAlpha = (t / r.trail.length) * 0.7;
        ctx.fill();
      }

      // Draw rocket glowing head
      ctx.beginPath();
      ctx.arc(r.x, r.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();

      // Detonate when reached target height
      if (r.y <= r.targetY || r.vy >= -40) {
        this.detonateFirework(r.x, r.y, r.color);
        this.fireworkRockets.splice(i, 1);
      }
    }

    // 2. Update & Render Exploding Sparks
    ctx.save();
    for (let i = this.fireworkSparks.length - 1; i >= 0; i--) {
      const s = this.fireworkSparks[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        this.fireworkSparks.splice(i, 1);
        continue;
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= Math.pow(0.94, dt * 60);
      s.vy *= Math.pow(0.94, dt * 60);
      s.vy += 120 * dt; // gravity

      const progress = s.life / s.maxLife;
      const alpha = Math.max(0, s.alpha * (1 - progress));

      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(1, s.size * (1 - progress * 0.4)), 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.restore();
  }

  private detonateFirework(x: number, y: number, color: string) {
    const sparkCount = 45 + Math.floor(Math.random() * 25);
    const speed = 130 + Math.random() * 90;

    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd = (0.3 + Math.random() * 0.95) * speed;
      this.fireworkSparks.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: Math.random() > 0.3 ? color : '#ffffff',
        alpha: 0.95,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.45,
        size: 1.5 + Math.random() * 2.5,
      });
    }

    sound.playPop(50);
  }

  private renderMotes(ctx: CanvasRenderingContext2D, moteColor: string) {
    const motes = this.sim.motes;
    ctx.save();

    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      // Atmospheric breathing luminescence
      const pulse = 0.75 + Math.sin(m.phase) * 0.25;
      const alpha = Math.min(0.85, m.alpha * pulse);
      const radius = m.r * pulse;

      if (m.depth > 0.65) {
        // Foreground bokeh dust mote: soft luminous halo
        const haloGrad = ctx.createRadialGradient(m.x, m.y, radius * 0.2, m.x, m.y, radius * 2.2);
        haloGrad.addColorStop(0, moteColor);
        haloGrad.addColorStop(0.4, moteColor);
        haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(m.x, m.y, radius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = haloGrad;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fill();

        // Tiny bright speck in center
        ctx.beginPath();
        ctx.arc(m.x, m.y, Math.max(0.7, radius * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = alpha * 0.9;
        ctx.fill();
      } else {
        // Mid & distant atmospheric dust mote
        ctx.beginPath();
        ctx.arc(m.x, m.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = moteColor;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Render liquid soap film bridge when two bubbles are gently touching
   */
  private renderAdhesionBridges(ctx: CanvasRenderingContext2D) {
    const bubbles = this.sim.bubbles;
    const n = bubbles.length;

    for (let i = 0; i < n; i++) {
      const b1 = bubbles[i];
      for (let j = i + 1; j < n; j++) {
        const b2 = bubbles[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radiusSum = b1.r + b2.r;

        // Draw liquid bridge if bubbles are within adhesion proximity
        if (dist < radiusSum + 22 && dist > Math.abs(b1.r - b2.r) + 4) {
          const overlapFactor = 1 - Math.max(0, (dist - Math.abs(b1.r - b2.r)) / (radiusSum - Math.abs(b1.r - b2.r) + 22));
          this.drawMetaballBridge(ctx, b1, b2, dist, overlapFactor);
        }
      }
    }
  }

  private drawMetaballBridge(
    ctx: CanvasRenderingContext2D,
    b1: Bubble,
    b2: Bubble,
    dist: number,
    strength: number
  ) {
    if (dist <= 0) return;
    const r1 = b1.r;
    const r2 = b2.r;
    const angle = Math.atan2(b2.y - b1.y, b2.x - b1.x);

    // Tangent angle offset
    const u = Math.min(0.95, (r1 - r2) / dist);
    const alpha = Math.acos(u);
    const beta = angle;

    const angle1 = beta + alpha;
    const angle2 = beta - alpha;
    const angle3 = beta + Math.PI - alpha;
    const angle4 = beta - Math.PI + alpha;

    const p1x = b1.x + Math.cos(angle1) * r1 * 0.95;
    const p1y = b1.y + Math.sin(angle1) * r1 * 0.95;
    const p2x = b2.x + Math.cos(angle3) * r2 * 0.95;
    const p2y = b2.y + Math.sin(angle3) * r2 * 0.95;

    const p3x = b2.x + Math.cos(angle4) * r2 * 0.95;
    const p3y = b2.y + Math.sin(angle4) * r2 * 0.95;
    const p4x = b1.x + Math.cos(angle2) * r1 * 0.95;
    const p4y = b1.y + Math.sin(angle2) * r1 * 0.95;

    const midX = (b1.x + b2.x) * 0.5;
    const midY = (b1.y + b2.y) * 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.quadraticCurveTo(midX, midY, p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.quadraticCurveTo(midX, midY, p4x, p4y);
    ctx.closePath();

    // Soft liquid iridescent bridge fill & stroke
    const bridgeGrad = ctx.createLinearGradient(b1.x, b1.y, b2.x, b2.y);
    bridgeGrad.addColorStop(0, `hsla(${b1.hue}, 80%, 75%, ${0.25 * strength})`);
    bridgeGrad.addColorStop(0.5, `hsla(${(b1.hue + b2.hue) * 0.5}, 90%, 85%, ${0.4 * strength})`);
    bridgeGrad.addColorStop(1, `hsla(${b2.hue}, 80%, 75%, ${0.25 * strength})`);

    ctx.fillStyle = bridgeGrad;
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * strength})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Render single organic wobbling bubble
   */
  private renderBubble(ctx: CanvasRenderingContext2D, b: Bubble, timeMs: number) {
    ctx.save();
    ctx.translate(b.x, b.y);

    // Apply motion squash & stretch if moving
    if (b.squashFactor > 1.02) {
      ctx.rotate(b.squashAngle);
      ctx.scale(b.squashFactor, 1 / b.squashFactor);
      ctx.rotate(-b.squashAngle);
    }

    const count = 16;
    const points: { x: number; y: number }[] = [];

    // Calculate deformed perimeter vertices
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const rTotal = Math.max(8, b.r + b.wobbleOffsets[i]);
      points.push({
        x: Math.cos(angle) * rTotal,
        y: Math.sin(angle) * rTotal,
      });
    }

    // Build smooth closed spline through points using Catmull-Rom to Cubic Bézier
    ctx.beginPath();
    this.drawSmoothClosedPath(ctx, points);

    // A. Soft inner volume glow / refraction
    const radGrad = ctx.createRadialGradient(-b.r * 0.2, -b.r * 0.25, b.r * 0.05, 0, 0, b.r);
    radGrad.addColorStop(0, `hsla(${b.secondaryHue}, 70%, 90%, 0.12)`);
    radGrad.addColorStop(0.45, `hsla(${b.hue}, 85%, 65%, 0.08)`);
    radGrad.addColorStop(0.85, `hsla(${(b.hue + 60) % 360}, 85%, 70%, 0.18)`);
    radGrad.addColorStop(1, `hsla(${b.hue}, 95%, 80%, 0.35)`);

    ctx.fillStyle = radGrad;
    ctx.fill();

    // B. Thin-film iridescent rim interference
    // We create an angular gradient around the bubble perimeter
    const rimGrad = ctx.createLinearGradient(-b.r, -b.r, b.r, b.r);
    const themeConfig = THEMES[this.theme];
    rimGrad.addColorStop(0, `hsla(${b.hue}, 90%, 75%, 0.85)`);
    rimGrad.addColorStop(0.25, themeConfig.filmColors[1]);
    rimGrad.addColorStop(0.5, themeConfig.filmColors[2]);
    rimGrad.addColorStop(0.75, themeConfig.filmColors[3]);
    rimGrad.addColorStop(1, `hsla(${(b.hue + 80) % 360}, 90%, 75%, 0.85)`);

    ctx.lineWidth = Math.max(1.8, Math.min(4.5, b.r * 0.035));
    ctx.strokeStyle = rimGrad;
    ctx.stroke();

    // C. Merge flash aura if newly fused
    if (b.mergeGlow > 0.01) {
      ctx.save();
      ctx.beginPath();
      this.drawSmoothClosedPath(ctx, points);
      ctx.fillStyle = `hsla(${b.hue}, 95%, 90%, ${0.35 * b.mergeGlow})`;
      ctx.shadowColor = `hsl(${b.hue}, 100%, 80%)`;
      ctx.shadowBlur = 24 * b.mergeGlow;
      ctx.fill();
      ctx.restore();
    }

    // D. Tension Warning Aura (shear stress feedback)
    if (b.stress > 0.2) {
      ctx.save();
      const warningFactor = Math.min(1, (b.stress - 0.2) / 0.8);
      ctx.beginPath();
      this.drawSmoothClosedPath(ctx, points);
      ctx.strokeStyle = `rgba(244, 63, 94, ${0.4 + warningFactor * 0.5})`;
      ctx.lineWidth = 2.5 + warningFactor * 3;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12 * warningFactor;
      ctx.stroke();

      // Stress ripple ring
      const rippleR = b.r * (1.05 + 0.15 * Math.sin(timeMs * 0.02));
      ctx.beginPath();
      ctx.arc(0, 0, rippleR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(251, 113, 133, ${0.3 * warningFactor})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // E. Primary Curved Specular Highlight (Classic soap bubble crescent)
    this.renderSpecularHighlights(ctx, b.r, timeMs);

    // F. Letter or Word badge for Russian Word mode (or Tier label in other modes)
    if (b.letter) {
      this.renderBubbleLetter(ctx, b, timeMs);
    } else if (b.tier >= 3) {
      this.renderTierLabel(ctx, b);
    }

    ctx.restore();
  }

  /**
   * Render Russian Cyrillic letter or assembled word inside bubble
   */
  private renderBubbleLetter(ctx: CanvasRenderingContext2D, b: Bubble, _timeMs: number) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = b.letter || '';
    const isHero = !!b.isHeroWordBubble;

    if (isHero) {
      // Hero Assembled Word Bubble
      const fontSize = Math.max(16, Math.min(32, Math.floor(b.r * 0.44)));
      ctx.font = `800 ${fontSize}px 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif`;

      const textMetrics = ctx.measureText(text);
      const pillW = Math.max(textMetrics.width + 22, b.r * 1.15);
      const pillH = fontSize + 16;

      // Dark translucent pill backing with golden aura
      ctx.beginPath();
      ctx.roundRect(-pillW * 0.5, -pillH * 0.5, pillW, pillH, pillH * 0.5);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 16;
      ctx.fill();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Crown / star badge above
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#facc15';
      ctx.fillText('⭐', 0, -pillH * 0.5 - 7);

      // Assembled text with clean bright fill
      ctx.font = `800 ${fontSize}px 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(text, 0, 1);
    } else {
      // Single Cyrillic Letter Bubble (e.g. "К")
      const fontSize = Math.max(18, Math.min(36, Math.floor(b.r * 0.75)));
      ctx.font = `800 ${fontSize}px 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif`;

      // Soft circular dark backing disc for 100% legibility against all backgrounds
      const discR = Math.max(14, fontSize * 0.65);
      ctx.beginPath();
      ctx.arc(0, 0, discR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Russian letter in bright white with soft contrast glow
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 8;
      ctx.fillText(text, 0, 1);
    }

    ctx.restore();
  }

  private drawSmoothClosedPath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
    const len = pts.length;
    if (len < 3) return;

    ctx.moveTo((pts[len - 1].x + pts[0].x) / 2, (pts[len - 1].y + pts[0].y) / 2);
    for (let i = 0; i < len; i++) {
      const next = (i + 1) % len;
      const midX = (pts[i].x + pts[next].x) / 2;
      const midY = (pts[i].y + pts[next].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    ctx.closePath();
  }

  /**
   * Primary and secondary curved specular reflections on bubble surface
   */
  private renderSpecularHighlights(ctx: CanvasRenderingContext2D, r: number, timeMs: number) {
    // 1. Primary crescent highlight in top-left quadrant
    ctx.save();
    ctx.beginPath();
    const hlX = -r * 0.38;
    const hlY = -r * 0.42;
    const hlRadiusX = r * 0.28;
    const hlRadiusY = r * 0.14;
    const hlAngle = -Math.PI / 4 + Math.sin(timeMs * 0.001) * 0.05;

    ctx.ellipse(hlX, hlY, hlRadiusX, hlRadiusY, hlAngle, 0, Math.PI * 2);
    const hlGrad = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlRadiusX);
    hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    hlGrad.addColorStop(0.5, 'rgba(230, 245, 255, 0.55)');
    hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = hlGrad;
    ctx.fill();

    // 2. Tiny sharp glint dot
    ctx.beginPath();
    ctx.arc(hlX + hlRadiusX * 0.35, hlY - hlRadiusY * 0.25, Math.max(1.5, r * 0.04), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();

    // 3. Secondary ambient crescent in bottom-right quadrant
    ctx.beginPath();
    const brX = r * 0.32;
    const brY = r * 0.36;
    const brRadiusX = r * 0.22;
    const brRadiusY = r * 0.09;
    const brAngle = -Math.PI / 4;

    ctx.ellipse(brX, brY, brRadiusX, brRadiusY, brAngle, 0, Math.PI * 2);
    const brGrad = ctx.createRadialGradient(brX, brY, 0, brX, brY, brRadiusX);
    brGrad.addColorStop(0, 'rgba(200, 235, 255, 0.35)');
    brGrad.addColorStop(1, 'rgba(200, 235, 255, 0.0)');
    ctx.fillStyle = brGrad;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Render subtle size & tier indicator for larger evolved bubbles
   */
  private renderTierLabel(ctx: CanvasRenderingContext2D, b: Bubble) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${Math.round(b.r)}px`, 0, b.r * 0.45);
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    const particles = this.sim.particles;
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fill();
    }
    ctx.restore();
  }

  private renderShockwaves(ctx: CanvasRenderingContext2D) {
    const shockwaves = this.sim.shockwaves;
    ctx.save();
    for (let i = 0; i < shockwaves.length; i++) {
      const s = shockwaves[i];
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth;
      ctx.globalAlpha = s.alpha;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Render dedicated sharp-tap particle explosion system (flashes, motion trails, star sparks, rings)
   */
  private renderExplosionEffects(ctx: CanvasRenderingContext2D, dt: number) {
    // 1. Render Core Radiant Flashes
    for (let i = this.explosionFlashes.length - 1; i >= 0; i--) {
      const f = this.explosionFlashes[i];
      f.life += dt;
      if (f.life >= f.maxLife) {
        this.explosionFlashes.splice(i, 1);
        continue;
      }

      const progress = f.life / f.maxLife;
      const currentR = f.radius + (f.maxRadius - f.radius) * Math.sin(progress * Math.PI * 0.5);
      const alpha = Math.max(0, f.alpha * (1 - progress));

      ctx.save();
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, currentR);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.3, f.color);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.arc(f.x, f.y, currentR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fill();
      ctx.restore();
    }

    // 2. Render Expanding Explosion Shockwave Rings
    for (let i = this.explosionRings.length - 1; i >= 0; i--) {
      const r = this.explosionRings[i];
      r.r += (r.maxR - r.r) * Math.min(1, dt * 14);
      r.alpha -= dt * 2.8;

      if (r.alpha <= 0 || r.r >= r.maxR - 2) {
        this.explosionRings.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1, r.lineWidth * (r.alpha / 0.9));
      ctx.globalAlpha = Math.max(0, r.alpha);
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Render High-Velocity Explosion Particles with Motion Streaks & Diamond Glints
    ctx.save();
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.explosionParticles.splice(i, 1);
        continue;
      }

      // Update particle physics
      p.prevX = p.x;
      p.prevY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.vy += p.gravity * dt;
      p.rotation += p.spinSpeed * dt;

      const progress = p.life / p.maxLife;
      const alpha = Math.max(0, (1 - progress) * (1 - Math.pow(progress, 3)));

      if (p.isSpark) {
        // Render 4-pointed twinkling starburst glint
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur = 8;

        const arm = p.size * 1.8;
        ctx.beginPath();
        ctx.moveTo(-arm, 0);
        ctx.lineTo(arm, 0);
        ctx.moveTo(0, -arm);
        ctx.lineTo(0, arm);
        ctx.stroke();

        // White core dot
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, p.size * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      } else {
        // Render high-velocity iridescent shrapnel with sleek motion trail streak
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.2, p.size * (1 - progress * 0.6));
        ctx.lineCap = 'round';
        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur = 8;

        // Motion trail streak
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Glowing droplet head
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size * 0.7 * (1 - progress * 0.5)), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }
}
