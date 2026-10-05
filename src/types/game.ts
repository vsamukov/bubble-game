/**
 * Bubble Bloom - Game Types & Interfaces
 */

export type GameMode = 'zen' | 'challenge' | 'harmony' | 'words';

export type GameTheme = 'prismatic' | 'bioluminescent' | 'sunset' | 'aurora' | 'glass';

export interface ThemeConfig {
  id: GameTheme;
  name: string;
  backgroundGradient: [string, string, string];
  bubbleHues: number[]; // Base hues to pick from
  filmColors: string[]; // Iridescent rim stops
  innerGlow: string;
  moteColor: string;
}

export interface RussianWordItem {
  word: string;
  hintEmoji: string;
  hintDescription: string;
}

export interface WordGameState {
  currentWordIndex: number;
  currentWord: RussianWordItem;
  collectedLetters: string;
  targetIndex: number;
  hitPoints: number; // starts at 3
  maxHitPoints: number; // 3
  isComplete: boolean;
  wordsCompletedCount: number;
  isGameOver: boolean;
  wrongLetterAlert: string | null;
  heroBurstAlert?: boolean;
}

export interface BubbleTier {
  level: number;
  name: string;
  minRadius: number;
  description: string;
  color: string;
}

export interface Bubble {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  targetR: number; // for smooth swelling animation
  hue: number;
  secondaryHue: number;
  
  // Harmonic perimeter oscillation (16 perimeter vertices)
  wobbleOffsets: number[];
  wobbleVelocities: number[];
  wobbleFrequency: number;
  phase: number;
  
  // Interactive state
  isHeld: boolean;
  heldPointerId: number | null;
  stress: number; // 0 to 1, shear stress when moved too fast
  mergeGlow: number; // 0 to 1 flash decay on fusion
  tier: number;
  age: number;
  squashFactor: number; // 1 = round, >1 stretched along velocity
  squashAngle: number;

  // Russian Word Mode Properties
  letter?: string;            // Letter displayed inside bubble, e.g. "К"
  isHeroWordBubble?: boolean; // Main evolving word bubble holding the assembled prefix
}

export interface PopParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Shockwave {
  id: number;
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  alpha: number;
  lineWidth: number;
}

export interface FloatingMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  baseAlpha: number;
  phase: number;
  depth: number;     // 0.15 to 1.0 (depth layer for parallax and bokeh)
  mass: number;      // 0.6 to 1.4 (individual weight for gravity reaction)
  wobbleSpeed: number;
}

export interface PhysicsSettings {
  surfaceTension: number;   // 0.2 to 2.0 (how quickly wobbles settle)
  buoyancy: number;         // upward lift
  gravity: number;          // -0.5 to 0.8: environmental gravity reacting on dust & bubbles
  viscosity: number;        // 0.94 to 0.995 (air/fluid drag)
  ruptureThreshold: number; // max drag speed before bursting (pixels/sec)
  spawnRate: number;        // bubbles per 10s
  gentleAdhesion: number;   // attraction strength when bubbles touch gently
}

export interface GameStats {
  bubblesPopped: number;
  bubblesMerged: number;
  largestRadius: number;
  highestTier: number;
  currentCombo: number;
  comboMultiplier: number;
  zenTimeSeconds: number;
}
