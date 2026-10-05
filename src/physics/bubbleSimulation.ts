import {
  Bubble,
  PopParticle,
  Shockwave,
  FloatingMote,
  PhysicsSettings,
  GameStats,
  GameMode,
  WordGameState,
} from '../types/game';
import { BUBBLE_TIERS, THEMES, TAP_MAX_DURATION_MS, TAP_MAX_DISTANCE_PX, RUSSIAN_WORDS } from '../config/gameConstants';
import { sound } from '../audio/soundEngine';

interface PointerState {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  startTime: number;
  lastTime: number;
  heldBubbleId: string | null;
  grabOffsetX: number;
  grabOffsetY: number;
}

export class BubbleSimulation {
  public bubbles: Bubble[] = [];
  public particles: PopParticle[] = [];
  public shockwaves: Shockwave[] = [];
  public motes: FloatingMote[] = [];
  public settings: PhysicsSettings;
  public stats: GameStats = {
    bubblesPopped: 0,
    bubblesMerged: 0,
    largestRadius: 20,
    highestTier: 1,
    currentCombo: 0,
    comboMultiplier: 1,
    zenTimeSeconds: 0,
  };

  private width: number = 800;
  private height: number = 600;
  private nextParticleId: number = 1;
  private nextShockwaveId: number = 1;
  private pointers: Map<number, PointerState> = new Map();
  private lastSpawnTime: number = 0;
  private comboResetTimeout: number | null = null;
  private currentThemeId: keyof typeof THEMES = 'prismatic';
  private wordOrderDeck: number[] = [];
  private deckPointer: number = 0;

  public mode: GameMode = 'zen';
  public wordState: WordGameState | null = null;

  public onStatsUpdate?: (stats: GameStats) => void;
  public onTierUp?: (tier: number, tierName: string) => void;
  public onBubblePop?: (bubble: Bubble) => void;
  public onBubbleMerge?: (newBubble: Bubble) => void;
  public onSharpTapBurst?: (x: number, y: number, radius: number, hue: number, secondaryHue: number) => void;
  public onWordStateUpdate?: (state: WordGameState) => void;
  public onWordCompleted?: (word: string) => void;

  constructor(settings: PhysicsSettings) {
    this.settings = { ...settings };
    this.initWordDeck();
  }

  /**
   * Initializes or reshuffles the 100+ word deck using Fisher-Yates shuffle
   * ensuring all words appear in a randomized, non-repeating sequence.
   */
  public initWordDeck() {
    this.wordOrderDeck = Array.from({ length: RUSSIAN_WORDS.length }, (_, i) => i);
    for (let i = this.wordOrderDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.wordOrderDeck[i], this.wordOrderDeck[j]] = [this.wordOrderDeck[j], this.wordOrderDeck[i]];
    }
    this.deckPointer = 0;
  }

  public getNextRandomWordIndex(): number {
    if (this.wordOrderDeck.length === 0 || this.deckPointer >= this.wordOrderDeck.length) {
      this.initWordDeck();
    }
    const wordIdx = this.wordOrderDeck[this.deckPointer];
    this.deckPointer++;
    return wordIdx;
  }

  public setDimensions(width: number, height: number) {
    this.width = Math.max(300, width);
    this.height = Math.max(300, height);
    if (this.motes.length === 0) {
      this.initMotes();
    }
  }

  public setTheme(themeId: keyof typeof THEMES) {
    this.currentThemeId = themeId;
  }

  private initMotes() {
    this.motes = [];
    // Richer dust density across layers
    const count = Math.min(85, Math.max(45, Math.floor((this.width * this.height) / 12000)));
    for (let i = 0; i < count; i++) {
      // Depth layer between 0.15 (far background) and 1.0 (near foreground)
      const depth = 0.15 + Math.pow(Math.random(), 1.4) * 0.85;
      const baseRadius = 0.8 + depth * 2.8;
      const baseAlpha = 0.08 + depth * 0.28;
      const mass = 0.6 + Math.random() * 0.8;

      this.motes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 6 * depth,
        vy: (this.settings.gravity * 30 * mass * depth) + (Math.random() - 0.5) * 5,
        r: baseRadius,
        alpha: baseAlpha,
        baseAlpha,
        phase: Math.random() * Math.PI * 2,
        depth,
        mass,
        wobbleSpeed: 0.6 + Math.random() * 1.2,
      });
    }
  }

  public spawnInitialBubbles(count: number = 7) {
    this.mode = 'zen';
    this.bubbles = [];
    const safeW = this.width - 120;
    const safeH = this.height - 140;
    for (let i = 0; i < count; i++) {
      const radius = 22 + Math.random() * 24;
      const x = 60 + Math.random() * safeW;
      const y = 80 + Math.random() * safeH;
      this.createBubble(x, y, radius, false);
    }
  }

  /**
   * Starts the kid-friendly Russian Word Game
   * @param specificWordIndex - if provided, starts that specific word (e.g. for retrying the current word)
   * If omitted or undefined, selects the next random word from the 100+ word shuffled deck!
   */
  public startWordGame(specificWordIndex?: number) {
    this.mode = 'words';
    this.bubbles = [];
    this.particles = [];
    this.shockwaves = [];

    const wordIndex = specificWordIndex !== undefined && specificWordIndex >= 0
      ? specificWordIndex % RUSSIAN_WORDS.length
      : this.getNextRandomWordIndex();

    const wordItem = RUSSIAN_WORDS[wordIndex];
    this.wordState = {
      currentWordIndex: wordIndex,
      currentWord: wordItem,
      collectedLetters: wordItem.word[0], // Start with the first letter
      targetIndex: 1, // need 2nd letter next
      hitPoints: 3,
      maxHitPoints: 3,
      isComplete: false,
      wordsCompletedCount: this.wordState ? this.wordState.wordsCompletedCount : 0,
      isGameOver: false,
      wrongLetterAlert: null,
    };

    // 1. Hero Word Bubble at center
    const hero = this.createBubble(this.width * 0.5, this.height * 0.58, 48, false);
    hero.isHeroWordBubble = true;
    hero.letter = wordItem.word[0];
    hero.hue = 45; // golden radiant aura
    hero.targetR = 48;
    hero.vx = 0;
    hero.vy = 0;

    // 2. Remaining needed letters of the word
    const neededLetters = wordItem.word.slice(1).split('');

    // 3. Extra distractor Russian letters (kid-friendly alphabet)
    const alphabet = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');
    const distractors: string[] = [];
    const neededCount = Math.max(3, 8 - wordItem.word.length);
    while (distractors.length < neededCount) {
      const char = alphabet[Math.floor(Math.random() * alphabet.length)];
      if (!neededLetters.includes(char) && char !== wordItem.word[0] && !distractors.includes(char)) {
        distractors.push(char);
      }
    }

    const allFloatingLetters = [...neededLetters, ...distractors];
    // Shuffle floating letters
    for (let i = allFloatingLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allFloatingLetters[i], allFloatingLetters[j]] = [allFloatingLetters[j], allFloatingLetters[i]];
    }

    // Spawn letter bubbles safely around the hero bubble
    allFloatingLetters.forEach((letter, idx) => {
      const angle = (idx / allFloatingLetters.length) * Math.PI * 2;
      const distFromCenter = Math.min(this.width, this.height) * 0.32 + (Math.random() - 0.5) * 45;
      let x = this.width * 0.5 + Math.cos(angle) * distFromCenter;
      let y = this.height * 0.52 + Math.sin(angle) * distFromCenter;

      x = Math.max(65, Math.min(this.width - 65, x));
      y = Math.max(120, Math.min(this.height - 90, y));

      const bubble = this.createBubble(x, y, 32 + Math.random() * 6, false);
      bubble.letter = letter;
      bubble.vx = (Math.random() - 0.5) * 32;
      bubble.vy = (Math.random() - 0.5) * 32;
    });

    this.onWordStateUpdate?.(this.wordState);
  }

  public createBubble(x: number, y: number, radius: number, playSound: boolean = true): Bubble {
    const theme = THEMES[this.currentThemeId];
    const baseHues = theme.bubbleHues;
    const hue = baseHues[Math.floor(Math.random() * baseHues.length)] + (Math.random() * 20 - 10);
    const secondaryHue = (hue + 45 + Math.random() * 60) % 360;

    const tier = this.determineTier(radius);

    const bubble: Bubble = {
      id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x,
      y,
      vx: (Math.random() - 0.5) * 35,
      vy: -15 - Math.random() * 30,
      r: radius,
      targetR: radius,
      hue,
      secondaryHue,
      wobbleOffsets: new Array(16).fill(0).map(() => (Math.random() - 0.5) * 4),
      wobbleVelocities: new Array(16).fill(0).map(() => (Math.random() - 0.5) * 10),
      wobbleFrequency: 1.8 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      isHeld: false,
      heldPointerId: null,
      stress: 0,
      mergeGlow: 0,
      tier,
      age: 0,
      squashFactor: 1,
      squashAngle: 0,
    };

    this.bubbles.push(bubble);

    if (playSound) {
      sound.playSpawn();
    }

    return bubble;
  }

  private determineTier(radius: number): number {
    let currentTier = 1;
    for (let i = BUBBLE_TIERS.length - 1; i >= 0; i--) {
      if (radius >= BUBBLE_TIERS[i].minRadius) {
        currentTier = BUBBLE_TIERS[i].level;
        break;
      }
    }
    return currentTier;
  }

  /**
   * Main simulation update loop (dt in seconds)
   */
  public update(dt: number, currentTimeMs: number) {
    const cappedDt = Math.min(0.05, Math.max(0.001, dt));

    // 1. Ambient dust particles update (reacting to gravity, thermal draft, and bubble wakes)
    const gravity = this.settings.gravity;
    const buoyancy = this.settings.buoyancy;

    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      m.phase += cappedDt * m.wobbleSpeed;

      // Vertical drift directly governed by gravity and buoyancy
      // Heavier & nearer particles experience more gravitational velocity
      const targetVy = (gravity * 52 * m.mass * m.depth) - (buoyancy * 22 * m.depth);
      m.vy += (targetVy - m.vy) * cappedDt * 2.2;

      // Horizontal thermal oscillation & gentle fluid drift
      const targetVx = Math.sin(m.y * 0.003 + m.phase) * (7 * m.depth);
      m.vx += (targetVx - m.vx) * cappedDt * 1.8;

      // Interactive fluid displacement: bubbles passing nearby create subtle eddies
      for (let j = 0; j < this.bubbles.length; j++) {
        const b = this.bubbles[j];
        const bdx = m.x - b.x;
        const bdy = m.y - b.y;
        const bDistSq = bdx * bdx + bdy * bdy;
        const influenceR = b.r + 35 * m.depth;
        if (bDistSq < influenceR * influenceR && bDistSq > 1) {
          const bDist = Math.sqrt(bDistSq);
          const pushFactor = (1 - bDist / influenceR) * 35 * m.depth;
          m.vx += (bdx / bDist) * pushFactor * cappedDt + b.vx * 0.08 * cappedDt;
          m.vy += (bdy / bDist) * pushFactor * cappedDt + b.vy * 0.08 * cappedDt;
        }
      }

      // Interactive fluid displacement: active pointers moving through canvas
      this.pointers.forEach((ptr) => {
        const pdx = m.x - ptr.currentX;
        const pdy = m.y - ptr.currentY;
        const pDistSq = pdx * pdx + pdy * pdy;
        const pRadius = 80;
        if (pDistSq < pRadius * pRadius && pDistSq > 1) {
          const pDist = Math.sqrt(pDistSq);
          const push = (1 - pDist / pRadius) * 45 * m.depth;
          m.vx += (pdx / pDist) * push * cappedDt + ptr.vx * 0.04 * cappedDt;
          m.vy += (pdy / pDist) * push * cappedDt + ptr.vy * 0.04 * cappedDt;
        }
      });

      // Position update
      m.x += m.vx * cappedDt;
      m.y += m.vy * cappedDt;

      // Seamless screen wrapping based on drift direction
      if (m.vy >= 0 && m.y > this.height + 15) {
        m.y = -10;
        m.x = Math.random() * this.width;
      } else if (m.vy < 0 && m.y < -15) {
        m.y = this.height + 10;
        m.x = Math.random() * this.width;
      }

      if (m.x < -15) m.x = this.width + 10;
      if (m.x > this.width + 15) m.x = -10;
    }

    // 2. Auto-spawn check if bubble count is low (disabled in words mode)
    const targetBubbleCount = Math.max(5, Math.min(14, Math.floor((this.width * this.height) / 75000)));
    if (this.mode !== 'words' && this.bubbles.length < targetBubbleCount && currentTimeMs - this.lastSpawnTime > (10000 / Math.max(1, this.settings.spawnRate))) {
      this.lastSpawnTime = currentTimeMs;
      const x = 50 + Math.random() * (this.width - 100);
      const y = this.height + 30; // float up from bottom
      const r = 20 + Math.random() * 22;
      const b = this.createBubble(x, y, r, true);
      b.vy = -60 - Math.random() * 40;
    }

    // 3. Pointer physics update
    this.updatePointerPhysics(cappedDt);

    // 4. Bubble kinematics & harmonic wobbles
    const t = currentTimeMs * 0.001;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.age += cappedDt;

      // Smooth radius inflation
      if (Math.abs(b.r - b.targetR) > 0.5) {
        b.r += (b.targetR - b.r) * Math.min(1, cappedDt * 8);
        b.tier = this.determineTier(b.r);
      }

      // Merge glow decay
      if (b.mergeGlow > 0) {
        b.mergeGlow = Math.max(0, b.mergeGlow - cappedDt * 1.8);
      }

      // If held by pointer: follow pointer displacement smoothly
      if (b.isHeld && b.heldPointerId !== null) {
        const ptr = this.pointers.get(b.heldPointerId);
        if (ptr) {
          const targetX = ptr.currentX + ptr.grabOffsetX;
          const targetY = ptr.currentY + ptr.grabOffsetY;
          const dx = targetX - b.x;
          const dy = targetY - b.y;

          // The bigger the bubble, the slower and gentler it needs to be dragged, or it bursts.
          // Small bubbles (r ~ 20-30px) have high internal pressure and tight surface curvature (resilient).
          // Large/colossal bubbles (r > 100-220px) have fragile surface tension and high air inertia.
          const baseRadius = 26;
          const sizeFragility = Math.pow(baseRadius / Math.max(18, b.r), 0.68);
          const clampedSizeFactor = Math.max(0.22, Math.min(1.3, sizeFragility));
          const safeSpeed = this.settings.ruptureThreshold * clampedSizeFactor;

          // Larger bubbles have greater fluid inertia and weight
          const inertiaWeight = Math.max(0.4, Math.min(1.0, Math.pow(baseRadius / Math.max(20, b.r), 0.25)));
          const followFactor = Math.min(1, cappedDt * (14 + 14 * inertiaWeight));
          b.x += dx * followFactor;
          b.y += dy * followFactor;
          b.vx = dx * (10 + 6 * inertiaWeight);
          b.vy = dy * (10 + 6 * inertiaWeight);

          // Calculate drag velocity shear stress against this bubble's size-dependent limit
          const dragSpeed = Math.sqrt(ptr.vx * ptr.vx + ptr.vy * ptr.vy);

          if (dragSpeed > safeSpeed * 0.6) {
            // Approaching danger zone: play tension warning
            const dangerFactor = Math.min(1, (dragSpeed - safeSpeed * 0.6) / (safeSpeed * 0.4));
            sound.playTensionWarning(dangerFactor);

            // Larger bubbles accumulate shear stress faster due to expansive surface area
            const sizeStressMultiplier = 1 + Math.max(0, (b.r - baseRadius) / 60);
            b.stress = Math.min(1.2, b.stress + dangerFactor * cappedDt * (3.8 * sizeStressMultiplier));

            // Visible membrane shudder / flutter under excessive drag speed
            if (dangerFactor > 0.35) {
              const dragAngle = Math.atan2(ptr.vy, ptr.vx);
              this.addWobbleImpulse(b, dragAngle + Math.PI, dangerFactor * 6);
            }
          } else {
            b.stress = Math.max(0, b.stress - cappedDt * 2.8);
          }

          // RUPTURE CHECK: If shear stress exceeds limit, bubble pops!
          if (b.stress >= 1.0) {
            this.burstBubble(b, 'rupture');
            continue;
          }

          // Dynamic squash and stretch along motion
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          b.squashFactor = 1 + Math.min(0.45, speed / 800);
          b.squashAngle = Math.atan2(b.vy, b.vx);
        }
      } else {
        // Free-floating mechanics
        b.stress = Math.max(0, b.stress - cappedDt * 3);

        // Gentle fluid turbulence (curl sine drift) and gravity/buoyancy
        const windX = Math.sin(b.y * 0.003 + t * 0.8) * 20;
        const windY = Math.cos(b.x * 0.003 + t * 0.6) * 14 + (this.settings.gravity * 36 - this.settings.buoyancy * 50);

        b.vx += (windX - b.vx) * cappedDt * 0.8;
        b.vy += (windY - b.vy) * cappedDt * 0.8;

        // Viscous fluid drag
        b.vx *= Math.pow(this.settings.viscosity, cappedDt * 60);
        b.vy *= Math.pow(this.settings.viscosity, cappedDt * 60);

        b.x += b.vx * cappedDt;
        b.y += b.vy * cappedDt;

        // Settle squash factor
        b.squashFactor += (1 - b.squashFactor) * cappedDt * 5;
      }

      // Boundary soft bounce with squish
      const pad = b.r;
      if (b.x < pad) {
        b.x = pad;
        b.vx = Math.abs(b.vx) * 0.7;
        this.addWobbleImpulse(b, Math.PI, 6);
      } else if (b.x > this.width - pad) {
        b.x = this.width - pad;
        b.vx = -Math.abs(b.vx) * 0.7;
        this.addWobbleImpulse(b, 0, 6);
      }

      const minTop = this.mode === 'words' ? Math.max(pad, 75) : pad;
      if (this.mode === 'words' && b.y < 130) {
        b.vy += 40 * cappedDt;
      }

      if (b.y < minTop) {
        b.y = minTop;
        b.vy = Math.abs(b.vy) * 0.7;
        this.addWobbleImpulse(b, -Math.PI / 2, 6);
      } else if (b.y > this.height - pad) {
        b.y = this.height - pad;
        b.vy = -Math.abs(b.vy) * 0.7;
        this.addWobbleImpulse(b, Math.PI / 2, 6);
      }

      // Update harmonic perimeter vertices
      this.updatePerimeterWobble(b, cappedDt, t);
    }

    // 5. Bubble-to-Bubble Proximity & Gentle Merge Physics
    this.handleBubbleInteractions(cappedDt);

    // 6. Update particles & shockwaves
    this.updateParticlesAndShockwaves(cappedDt);
  }

  /**
   * Update 16 harmonic vertices around bubble perimeter
   */
  private updatePerimeterWobble(b: Bubble, dt: number, t: number) {
    const k = 45 * this.settings.surfaceTension; // restoring spring
    const damping = Math.pow(0.92, dt * 60);
    const tensionCoupling = 12 * this.settings.surfaceTension;

    const count = 16;
    for (let i = 0; i < count; i++) {
      const prev = (i - 1 + count) % count;
      const next = (i + 1) % count;

      // Spring to 0 + coupling with adjacent vertices
      const restore = -k * b.wobbleOffsets[i];
      const coupling = tensionCoupling * (b.wobbleOffsets[prev] + b.wobbleOffsets[next] - 2 * b.wobbleOffsets[i]);

      // Natural breathing oscillation
      const naturalBreathing = Math.sin(t * b.wobbleFrequency + (i * Math.PI * 2) / count) * 0.8;

      b.wobbleVelocities[i] += (restore + coupling + naturalBreathing) * dt;
      b.wobbleVelocities[i] *= damping;
      b.wobbleOffsets[i] += b.wobbleVelocities[i] * dt;

      // Clamp max distortion to prevent inside-out bubbles
      const maxDisplace = b.r * 0.35;
      b.wobbleOffsets[i] = Math.max(-maxDisplace, Math.min(maxDisplace, b.wobbleOffsets[i]));
    }
  }

  public addWobbleImpulse(b: Bubble, angle: number, strength: number) {
    const count = 16;
    for (let i = 0; i < count; i++) {
      const vertexAngle = (i / count) * Math.PI * 2;
      const dot = Math.cos(vertexAngle - angle);
      if (dot > 0) {
        b.wobbleVelocities[i] += dot * strength * 25;
      }
    }
  }

  /**
   * Bubble-to-Bubble interactions: gentle adhesion, coalescence, and bouncy elastic collision
   */
  private handleBubbleInteractions(dt: number) {
    const n = this.bubbles.length;
    for (let i = 0; i < n; i++) {
      const b1 = this.bubbles[i];
      if (!b1) continue;

      for (let j = i + 1; j < n; j++) {
        const b2 = this.bubbles[j];
        if (!b2) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distSq = dx * dx + dy * dy;
        const radiusSum = b1.r + b2.r;
        const radiusSumSq = radiusSum * radiusSum;

        // Proximity check (touching or very close)
        const proximityMargin = 35;
        const maxRangeSq = (radiusSum + proximityMargin) * (radiusSum + proximityMargin);

        if (distSq < maxRangeSq) {
          const dist = Math.max(1, Math.sqrt(distSq));
          const nx = dx / dist;
          const ny = dy / dist;

          // Relative velocity
          const rvx = b2.vx - b1.vx;
          const rvy = b2.vy - b1.vy;
          const relSpeed = Math.sqrt(rvx * rvx + rvy * rvy);

          // GENTLE MOVEMENT MERGE LOGIC:
          // If bubbles are moving gently (low relative speed) and overlap:
          const isGentle = relSpeed < 340 && b1.stress < 0.6 && b2.stress < 0.6;
          const overlap = radiusSum - dist;

          if (isGentle && overlap > 4) {
            if (this.mode === 'words') {
              const hasHero = b1.isHeroWordBubble || b2.isHeroWordBubble;
              if (hasHero) {
                const hero = b1.isHeroWordBubble ? b1 : b2;
                const other = b1.isHeroWordBubble ? b2 : b1;
                const otherIdx = b1.isHeroWordBubble ? j : i;
                this.handleWordBubbleMerge(hero, other, otherIdx);
                return;
              }
              // In words mode, non-hero letter bubbles bounce gently without merging into each other
            } else {
              // Merge them into a single larger bubble!
              this.mergeBubbles(b1, b2, i, j);
              return; // stop pair iteration this frame to prevent index mismatch
            }
          }

          // If close but not overlapping yet: gentle surface tension adhesion pulls them together
          if (isGentle && dist < radiusSum + 20) {
            if (this.mode !== 'words' || b1.isHeroWordBubble || b2.isHeroWordBubble) {
              const pullStrength = 18 * this.settings.gentleAdhesion;
              b1.vx += nx * pullStrength * dt;
              b1.vy += ny * pullStrength * dt;
              b2.vx -= nx * pullStrength * dt;
              b2.vy -= ny * pullStrength * dt;
            }
          }

          // If overlapping and moving quickly: elastic collision with bounce & squish!
          if (overlap > 0 && !isGentle) {
            // Push apart
            const push = overlap * 0.5;
            if (!b1.isHeld) {
              b1.x -= nx * push;
              b1.y -= ny * push;
            }
            if (!b2.isHeld) {
              b2.x += nx * push;
              b2.y += ny * push;
            }

            // Normal impulse
            const normalVel = rvx * nx + rvy * ny;
            if (normalVel < 0) {
              const impulse = -(1.5) * normalVel * 0.5;
              if (!b1.isHeld) {
                b1.vx -= impulse * nx;
                b1.vy -= impulse * ny;
              }
              if (!b2.isHeld) {
                b2.vx += impulse * nx;
                b2.vy += impulse * ny;
              }

              // Wobble ripple on collision
              const angle1 = Math.atan2(ny, nx);
              this.addWobbleImpulse(b1, angle1, 8);
              this.addWobbleImpulse(b2, angle1 + Math.PI, 8);

              // If extremely violent collision (> 1200 px/s), burst smaller bubble!
              if (relSpeed > this.settings.ruptureThreshold * 1.25) {
                const smaller = b1.r < b2.r ? b1 : b2;
                this.burstBubble(smaller, 'collision');
                return;
              }
            }
          }
        }
      }
    }
  }

  /**
   * Russian Word Game: Ingestion of letters into the growing Hero Word Bubble
   */
  private handleWordBubbleMerge(hero: Bubble, other: Bubble, otherIdx: number) {
    if (!this.wordState || this.wordState.isGameOver || this.wordState.isComplete) return;

    const expectedLetter = this.wordState.currentWord.word[this.wordState.targetIndex];

    if (other.letter === expectedLetter) {
      // Correct letter ingested!
      this.wordState.collectedLetters += other.letter;
      this.wordState.targetIndex++;
      this.wordState.wrongLetterAlert = null;

      hero.letter = this.wordState.collectedLetters;
      hero.targetR = Math.min(135, Math.sqrt(hero.r * hero.r + other.r * other.r * 1.2));
      hero.mergeGlow = 1.0;

      // Play joyful letter success chime
      sound.playLetterSuccess(this.wordState.targetIndex);

      // Spawn coalescence micro-droplets & shockwave
      this.spawnMergeDroplets(hero.x, hero.y, hero.targetR, hero.hue);

      // Remove the ingested letter bubble
      this.bubbles.splice(otherIdx, 1);

      // Check if the whole word is complete!
      if (this.wordState.targetIndex >= this.wordState.currentWord.word.length) {
        this.wordState.isComplete = true;
        this.wordState.wordsCompletedCount++;
        sound.playWordVictory();
        this.onWordCompleted?.(this.wordState.currentWord.word);

        // Next word transition after victory celebration - picks next random word from deck
        setTimeout(() => {
          if (this.mode === 'words' && !this.wordState?.isGameOver) {
            this.startWordGame();
          }
        }, 3400);
      }

      this.onWordStateUpdate?.(this.wordState);
    } else {
      // Ingesting a wrong letter will deduct one hit point!
      this.wordState.hitPoints = Math.max(0, this.wordState.hitPoints - 1);
      this.wordState.wrongLetterAlert = other.letter || 'не та буква';
      sound.playWrongLetter();

      // Sharp repulsive bounce away + red warning shockwave
      const dx = other.x - hero.x;
      const dy = other.y - hero.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const nx = dx / dist;
      const ny = dy / dist;

      other.vx = nx * 240;
      other.vy = ny * 240;
      other.x += nx * 28;
      other.y += ny * 28;

      this.addWobbleImpulse(other, Math.atan2(ny, nx), 14);
      this.addWobbleImpulse(hero, Math.atan2(-ny, -nx), 10);

      this.shockwaves.push({
        id: this.nextShockwaveId++,
        x: (hero.x + other.x) * 0.5,
        y: (hero.y + other.y) * 0.5,
        r: 25,
        maxR: 95,
        color: '#f43f5e',
        alpha: 0.95,
        lineWidth: 3.5,
      });

      // Check if all 3 hitpoints are gone: game restarts!
      if (this.wordState.hitPoints <= 0) {
        this.wordState.isGameOver = true;
        sound.playGameOver();

        const currentWordIdx = this.wordState.currentWordIndex;
        // Game restarts after brief pause
        setTimeout(() => {
          if (this.mode === 'words' && this.wordState?.isGameOver) {
            this.startWordGame(currentWordIdx);
          }
        }, 3600);
      }

      this.onWordStateUpdate?.(this.wordState);
    }
  }

  /**
   * Merge two bubbles into one larger bubble
   */
  private mergeBubbles(b1: Bubble, b2: Bubble, idx1: number, idx2: number) {
    // 2D Area Conservation: A_new = A1 + A2 -> R_new = sqrt(R1^2 + R2^2)
    const newRadius = Math.min(260, Math.sqrt(b1.r * b1.r + b2.r * b2.r));

    // Weighted center of mass
    const a1 = b1.r * b1.r;
    const a2 = b2.r * b2.r;
    const totalArea = a1 + a2;
    const newX = (b1.x * a1 + b2.x * a2) / totalArea;
    const newY = (b1.y * a1 + b2.y * a2) / totalArea;

    // Conserve momentum
    const newVx = (b1.vx * a1 + b2.vx * a2) / totalArea;
    const newVy = (b1.vy * a1 + b2.vy * a2) / totalArea;

    // Pick dominant bubble or blend
    const dominant = b1.r >= b2.r ? b1 : b2;
    const oldTier = dominant.tier;

    // Remove the two bubbles from list
    const higherIdx = Math.max(idx1, idx2);
    const lowerIdx = Math.min(idx1, idx2);
    this.bubbles.splice(higherIdx, 1);
    this.bubbles.splice(lowerIdx, 1);

    // Create the merged bubble
    const mergedBubble: Bubble = {
      id: `b_${Date.now()}_m`,
      x: newX,
      y: newY,
      vx: newVx,
      vy: newVy,
      r: Math.max(b1.r, b2.r), // start at larger radius and inflate smoothly
      targetR: newRadius,
      hue: (b1.hue * a1 + b2.hue * a2) / totalArea,
      secondaryHue: dominant.secondaryHue,
      wobbleOffsets: new Array(16).fill(0),
      wobbleVelocities: new Array(16).fill(0).map(() => (Math.random() - 0.5) * 22),
      wobbleFrequency: Math.max(1.2, dominant.wobbleFrequency * 0.9),
      phase: 0,
      isHeld: b1.isHeld || b2.isHeld,
      heldPointerId: b1.heldPointerId || b2.heldPointerId,
      stress: 0,
      mergeGlow: 1.0,
      tier: this.determineTier(newRadius),
      age: 0,
      squashFactor: 1.15,
      squashAngle: Math.atan2(newVy, newVx),
    };

    this.bubbles.push(mergedBubble);

    // Update held pointer reference if any
    if (mergedBubble.heldPointerId !== null) {
      const ptr = this.pointers.get(mergedBubble.heldPointerId);
      if (ptr) {
        ptr.heldBubbleId = mergedBubble.id;
        ptr.grabOffsetX = newX - ptr.currentX;
        ptr.grabOffsetY = newY - ptr.currentY;
      }
    }

    // Spawn iridescent coalescence micro-droplets
    this.spawnMergeDroplets(newX, newY, newRadius, mergedBubble.hue);

    // Update game statistics & combos
    this.stats.bubblesMerged++;
    this.stats.currentCombo++;
    if (newRadius > this.stats.largestRadius) {
      this.stats.largestRadius = Math.round(newRadius);
    }

    // Reset combo timeout after 3 seconds of inactivity
    if (this.comboResetTimeout) {
      clearTimeout(this.comboResetTimeout);
    }
    this.comboResetTimeout = window.setTimeout(() => {
      this.stats.currentCombo = 0;
      this.onStatsUpdate?.(this.stats);
    }, 3200);

    // Play harmonious merge chime
    sound.playMerge(newRadius, this.stats.currentCombo);

    // Check if tiered up
    const newTier = mergedBubble.tier;
    if (newTier > this.stats.highestTier) {
      this.stats.highestTier = newTier;
      const tierDef = BUBBLE_TIERS[newTier - 1];
      sound.playTierUp(newTier);
      this.onTierUp?.(newTier, tierDef ? tierDef.name : `Tier ${newTier}`);
    } else if (newTier > oldTier) {
      const tierDef = BUBBLE_TIERS[newTier - 1];
      this.onTierUp?.(newTier, tierDef ? tierDef.name : `Tier ${newTier}`);
    }

    this.onBubbleMerge?.(mergedBubble);
    this.onStatsUpdate?.(this.stats);
  }

  /**
   * Spawn iridescent droplets when two bubbles fuse
   */
  private spawnMergeDroplets(x: number, y: number, radius: number, hue: number) {
    const dropletCount = 8 + Math.floor(radius / 15);
    for (let i = 0; i < dropletCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 85;
      this.particles.push({
        id: this.nextParticleId++,
        x: x + Math.cos(angle) * (radius * 0.4),
        y: y + Math.sin(angle) * (radius * 0.4),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        size: 1.5 + Math.random() * 3,
        color: `hsl(${hue + (Math.random() * 40 - 20)}, 85%, 70%)`,
        alpha: 0.9,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
      });
    }

    // Shockwave ripple
    this.shockwaves.push({
      id: this.nextShockwaveId++,
      x,
      y,
      r: radius * 0.5,
      maxR: radius * 1.4,
      color: `hsla(${hue}, 90%, 75%, 0.6)`,
      alpha: 0.7,
      lineWidth: 2.5,
    });
  }

  /**
   * Burst a bubble with dynamic pop physics, particles, and sound
   */
  public burstBubble(bubble: Bubble, reason: 'tap' | 'rupture' | 'collision' = 'tap') {
    const index = this.bubbles.findIndex((b) => b.id === bubble.id);
    if (index === -1) return;

    this.bubbles.splice(index, 1);

    // Release pointer lock if held
    if (bubble.heldPointerId !== null) {
      const ptr = this.pointers.get(bubble.heldPointerId);
      if (ptr) {
        ptr.heldBubbleId = null;
      }
    }

    // Sound & haptic
    sound.playPop(bubble.r);

    // Trigger particle explosion effect for sharp tap or overspeed rupture
    if (reason === 'tap' || reason === 'rupture') {
      this.onSharpTapBurst?.(bubble.x, bubble.y, bubble.r, bubble.hue, bubble.secondaryHue);
    }

    // Pop particles: scale count with radius
    const count = 14 + Math.floor(bubble.r / 5);
    const baseSpeed = reason === 'rupture' ? 180 : 130;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = (0.5 + Math.random() * 0.9) * baseSpeed;
      this.particles.push({
        id: this.nextParticleId++,
        x: bubble.x + Math.cos(angle) * (bubble.r * 0.85),
        y: bubble.y + Math.sin(angle) * (bubble.r * 0.85),
        vx: Math.cos(angle) * speed + bubble.vx * 0.4,
        vy: Math.sin(angle) * speed + bubble.vy * 0.4,
        size: 1.5 + Math.random() * 3.5,
        color: `hsl(${bubble.hue + (Math.random() * 50 - 25)}, 90%, 75%)`,
        alpha: 0.95,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.4,
      });
    }

    // Dissipating soap ring shockwave
    this.shockwaves.push({
      id: this.nextShockwaveId++,
      x: bubble.x,
      y: bubble.y,
      r: bubble.r * 0.8,
      maxR: bubble.r * 1.6 + 25,
      color: `hsla(${bubble.hue}, 95%, 70%, 0.7)`,
      alpha: 0.85,
      lineWidth: 2.0,
    });

    // Update stats
    this.stats.bubblesPopped++;
    this.onBubblePop?.(bubble);
    this.onStatsUpdate?.(this.stats);

    // If the coalesced bubble (Hero Word Bubble) bursts in words mode:
    // Deduct one HP and recover the coalesced bubble!
    if (this.mode === 'words' && bubble.isHeroWordBubble && this.wordState && !this.wordState.isComplete) {
      this.wordState.hitPoints = Math.max(0, this.wordState.hitPoints - 1);
      this.wordState.heroBurstAlert = true;

      if (this.wordState.hitPoints <= 0) {
        this.wordState.isGameOver = true;
        this.wordState.wrongLetterAlert = 'Все жизни закончились! Пузырь лопнул.';
        sound.playGameOver();

        const currentWordIdx = this.wordState.currentWordIndex;
        setTimeout(() => {
          if (this.mode === 'words' && this.wordState?.isGameOver) {
            this.startWordGame(currentWordIdx);
          }
        }, 3600);
      } else {
        // Play warning sound for lost life
        sound.playWrongLetter();
        this.wordState.wrongLetterAlert = 'Большой пузырь лопнул! (-1 жизнь) Восстанавливаем...';

        // Recover coalesced bubble preserving collected letters
        const collectedLetters = this.wordState.collectedLetters || this.wordState.currentWord.word[0];
        const targetRadius = Math.min(130, 48 + (collectedLetters.length - 1) * 16);
        const spawnX = Math.max(80, Math.min(this.width - 80, bubble.x));
        const spawnY = Math.max(140, Math.min(this.height - 110, bubble.y));

        setTimeout(() => {
          if (this.mode === 'words' && !this.wordState?.isGameOver && !this.wordState?.isComplete) {
            // Ensure no duplicate hero bubble
            const existingHero = this.bubbles.find((b) => b.isHeroWordBubble);
            if (!existingHero) {
              const hero = this.createBubble(spawnX, spawnY, 20, false);
              hero.isHeroWordBubble = true;
              hero.letter = collectedLetters;
              hero.targetR = targetRadius;
              hero.hue = 45; // golden radiance
              hero.secondaryHue = 90;
              hero.vx = 0;
              hero.vy = -15;
              hero.mergeGlow = 1.0;

              // Recovery golden shockwave
              this.shockwaves.push({
                id: this.nextShockwaveId++,
                x: hero.x,
                y: hero.y,
                r: 15,
                maxR: targetRadius * 1.5,
                color: '#facc15',
                alpha: 0.95,
                lineWidth: 3,
              });

              sound.playBubbleRecovered();

              if (this.wordState) {
                this.wordState.wrongLetterAlert = 'Пузырь со словом восстановлен! Двигай аккуратно.';
                this.onWordStateUpdate?.(this.wordState);
              }
            }
          }
        }, 400);
      }

      this.onWordStateUpdate?.(this.wordState);
    }
  }

  private updateParticlesAndShockwaves(dt: number) {
    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt; // gravity
      p.vx *= Math.pow(0.92, dt * 60); // air drag
      p.vy *= Math.pow(0.92, dt * 60);

      const progress = p.life / p.maxLife;
      p.alpha = Math.max(0, 0.95 * (1 - progress));
    }

    // Shockwaves update
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += (s.maxR - s.r) * Math.min(1, dt * 10);
      s.alpha -= dt * 2.2;
      if (s.alpha <= 0 || s.r >= s.maxR - 2) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  // Pointer input handling
  public handlePointerDown(id: number, x: number, y: number, timeMs: number) {
    sound.enableAudio();

    // Find hit bubble (prioritize topmost, smallest or closest)
    let hitBubble: Bubble | null = null;
    let minDist = Infinity;

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      const dx = x - b.x;
      const dy = y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Extra touch margin for tiny bubbles
      const hitRadius = Math.max(34, b.r * 1.15);

      if (dist <= hitRadius && dist < minDist) {
        minDist = dist;
        hitBubble = b;
      }
    }

    const state: PointerState = {
      id,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      prevX: x,
      prevY: y,
      vx: 0,
      vy: 0,
      startTime: timeMs,
      lastTime: timeMs,
      heldBubbleId: hitBubble ? hitBubble.id : null,
      grabOffsetX: hitBubble ? hitBubble.x - x : 0,
      grabOffsetY: hitBubble ? hitBubble.y - y : 0,
    };

    this.pointers.set(id, state);

    if (hitBubble) {
      hitBubble.isHeld = true;
      hitBubble.heldPointerId = id;
      // Slight touch wobble
      const angle = Math.atan2(y - hitBubble.y, x - hitBubble.x);
      this.addWobbleImpulse(hitBubble, angle, 4);
    }
  }

  public handlePointerMove(id: number, x: number, y: number, timeMs: number) {
    const ptr = this.pointers.get(id);
    if (!ptr) return;

    const dt = Math.max(0.005, (timeMs - ptr.lastTime) * 0.001);
    const instantVx = (x - ptr.currentX) / dt;
    const instantVy = (y - ptr.currentY) / dt;

    // Smooth pointer velocity calculation
    ptr.vx = ptr.vx * 0.6 + instantVx * 0.4;
    ptr.vy = ptr.vy * 0.6 + instantVy * 0.4;

    ptr.prevX = ptr.currentX;
    ptr.prevY = ptr.currentY;
    ptr.currentX = x;
    ptr.currentY = y;
    ptr.lastTime = timeMs;
  }

  public handlePointerUp(id: number, timeMs: number) {
    const ptr = this.pointers.get(id);
    if (!ptr) return;

    const totalDuration = timeMs - ptr.startTime;
    const totalDist = Math.sqrt(
      Math.pow(ptr.currentX - ptr.startX, 2) + Math.pow(ptr.currentY - ptr.startY, 2)
    );

    // CRITICAL REQUIREMENT:
    // "on sharp/short tap/click they burst."
    const isSharpTap = totalDuration <= TAP_MAX_DURATION_MS && totalDist <= TAP_MAX_DISTANCE_PX;

    if (ptr.heldBubbleId) {
      const bubble = this.bubbles.find((b) => b.id === ptr.heldBubbleId);
      if (bubble) {
        if (isSharpTap) {
          // Sharp / Short tap -> BURST!
          this.burstBubble(bubble, 'tap');

          // If a needed letter bubble was burst in word mode, re-spawn it so the player never gets stuck
          if (this.mode === 'words' && !bubble.isHeroWordBubble && bubble.letter && this.wordState) {
            const currentWord = this.wordState.currentWord.word;
            const neededRemaining = currentWord.slice(this.wordState.targetIndex);
            if (neededRemaining.includes(bubble.letter)) {
              const letterToRespawn = bubble.letter;
              setTimeout(() => {
                if (this.mode === 'words' && !this.wordState?.isComplete && !this.wordState?.isGameOver) {
                  const b = this.createBubble(50 + Math.random() * (this.width - 100), this.height + 25, 34, true);
                  b.letter = letterToRespawn;
                  b.vy = -60;
                }
              }, 1500);
            }
          }
        } else {
          // Gentle release -> impart gentle drift momentum
          bubble.isHeld = false;
          bubble.heldPointerId = null;
          bubble.vx = Math.max(-250, Math.min(250, ptr.vx * 0.5));
          bubble.vy = Math.max(-250, Math.min(250, ptr.vy * 0.5));
          bubble.stress = 0;
        }
      }
    } else if (isSharpTap && this.mode !== 'words') {
      // Tap in open space: spawn a fresh baby bubble right at tap point (in non-word modes)
      this.createBubble(ptr.currentX, ptr.currentY, 22 + Math.random() * 12, true);
    }

    this.pointers.delete(id);
  }

  public handlePointerCancel(id: number) {
    const ptr = this.pointers.get(id);
    if (ptr && ptr.heldBubbleId) {
      const b = this.bubbles.find((bubble) => bubble.id === ptr.heldBubbleId);
      if (b) {
        b.isHeld = false;
        b.heldPointerId = null;
        b.stress = 0;
      }
    }
    this.pointers.delete(id);
  }

  private updatePointerPhysics(_dt: number) {
    // Internal pointer decay
    this.pointers.forEach((ptr) => {
      ptr.vx *= 0.94;
      ptr.vy *= 0.94;
    });
  }

  public resetGame() {
    this.particles = [];
    this.shockwaves = [];
    this.pointers.clear();
    this.spawnInitialBubbles(7);
    this.stats = {
      bubblesPopped: 0,
      bubblesMerged: 0,
      largestRadius: 20,
      highestTier: 1,
      currentCombo: 0,
      comboMultiplier: 1,
      zenTimeSeconds: 0,
    };
    this.onStatsUpdate?.(this.stats);
  }
}
