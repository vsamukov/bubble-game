import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BubbleSimulation } from './physics/bubbleSimulation';
import { BubbleRenderer } from './canvas/bubbleRenderer';
import { DEFAULT_PHYSICS } from './config/gameConstants';
import { GameMode, GameStats, GameTheme, PhysicsSettings, WordGameState } from './types/game';
import { sound } from './audio/soundEngine';
import { TopBar } from './components/TopBar';
import { HUD } from './components/HUD';
import { WordGameHUD } from './components/WordGameHUD';
import { SettingsDrawer } from './components/SettingsDrawer';
import { EvolutionCatalog } from './components/EvolutionCatalog';
import { MilestoneToast } from './components/MilestoneToast';
import { TabletConnectModal } from './components/TabletConnectModal';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<BubbleSimulation | null>(null);
  const rendererRef = useRef<BubbleRenderer | null>(null);

  const [currentMode, setCurrentMode] = useState<GameMode>('words');
  const [currentTheme, setCurrentTheme] = useState<GameTheme>('prismatic');
  const [physics, setPhysics] = useState<PhysicsSettings>(DEFAULT_PHYSICS);
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getIsMuted());
  const [isAmbientPlaying, setIsAmbientPlaying] = useState<boolean>(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [isTabletModalOpen, setIsTabletModalOpen] = useState<boolean>(false);

  const [stats, setStats] = useState<GameStats>({
    bubblesPopped: 0,
    bubblesMerged: 0,
    largestRadius: 20,
    highestTier: 1,
    currentCombo: 0,
    comboMultiplier: 1,
    zenTimeSeconds: 0,
  });

  const [wordState, setWordState] = useState<WordGameState | null>(null);
  const [maxRadius, setMaxRadius] = useState<number>(24);
  const [highestTier, setHighestTier] = useState<number>(1);
  const [stressWarning, setStressWarning] = useState<boolean>(false);
  const [milestone, setMilestone] = useState<{ message: string; tier: number } | null>(null);

  // Initialize Simulation & Renderer
  useEffect(() => {
    const sim = new BubbleSimulation(DEFAULT_PHYSICS);
    simRef.current = sim;

    sim.onStatsUpdate = (newStats) => {
      setStats({ ...newStats });
      setMaxRadius(newStats.largestRadius);
      setHighestTier(newStats.highestTier);
    };

    sim.onTierUp = (tier, tierName) => {
      setMilestone({ message: tierName, tier });
      setTimeout(() => {
        setMilestone(null);
      }, 3500);
    };

    sim.onWordStateUpdate = (newWordState) => {
      setWordState({ ...newWordState });
    };

    sim.onWordCompleted = (_word) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        rendererRef.current?.triggerFireworks(8, rect.width, rect.height);
      }
    };

    return () => {
      simRef.current = null;
    };
  }, []);

  // Sync canvas size & rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const sim = simRef.current;
    if (!sim) return;

    const renderer = new BubbleRenderer(ctx, sim);
    rendererRef.current = renderer;
    renderer.setTheme(currentTheme);

    // Trigger particle explosion effect in BubbleRenderer at the coordinate of a burst bubble
    sim.onSharpTapBurst = (x, y, r, hue, secHue) => {
      renderer.triggerExplosion(x, y, r, hue, secHue);
    };

    let animationId: number;
    let lastTime = performance.now();

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      sim.setDimensions(rect.width, rect.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Initial game mode start
    if (currentMode === 'words') {
      sim.startWordGame();
    } else {
      sim.spawnInitialBubbles(currentMode === 'challenge' ? 8 : 7);
    }

    // Main animation frame loop
    const frame = (time: number) => {
      const dt = (time - lastTime) * 0.001;
      lastTime = time;

      // Update simulation physics
      sim.update(dt, time);

      // Check if held bubble is currently under high shear stress
      let isStressed = false;
      for (let i = 0; i < sim.bubbles.length; i++) {
        if (sim.bubbles[i].isHeld && sim.bubbles[i].stress > 0.45) {
          isStressed = true;
          break;
        }
      }
      setStressWarning(isStressed);

      // Render scene
      const rect = canvas.getBoundingClientRect();
      renderer.render(rect.width, rect.height, time);

      animationId = requestAnimationFrame(frame);
    };

    animationId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentMode, currentTheme]);

  // Pointer event handlers for sharp tap vs gentle drag
  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: e.clientX, y: e.clientY };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = getCanvasCoords(e);
    simRef.current?.handlePointerDown(e.pointerId, x, y, performance.now());
  }, [getCanvasCoords]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    simRef.current?.handlePointerMove(e.pointerId, x, y, performance.now());
  }, [getCanvasCoords]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    simRef.current?.handlePointerUp(e.pointerId, performance.now());
  }, []);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    simRef.current?.handlePointerCancel(e.pointerId);
  }, []);

  // UI callbacks
  const handleToggleMute = useCallback(() => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  const handleToggleAmbient = useCallback(() => {
    const active = sound.toggleAmbient();
    setIsAmbientPlaying(active);
  }, []);

  const handleSelectMode = useCallback((mode: GameMode) => {
    setCurrentMode(mode);
    if (simRef.current) {
      if (mode === 'words') {
        simRef.current.startWordGame();
      } else {
        simRef.current.mode = mode;
        simRef.current.resetGame();
        simRef.current.spawnInitialBubbles(mode === 'challenge' ? 8 : 7);
      }
    }
  }, []);

  const handleSelectTheme = useCallback((theme: GameTheme) => {
    setCurrentTheme(theme);
    if (simRef.current) {
      simRef.current.setTheme(theme);
    }
    if (rendererRef.current) {
      rendererRef.current.setTheme(theme);
    }
  }, []);

  const handleChangePhysics = useCallback((newSettings: Partial<PhysicsSettings>) => {
    setPhysics((prev) => {
      const updated = { ...prev, ...newSettings };
      if (simRef.current) {
        simRef.current.settings = updated;
      }
      return updated;
    });
  }, []);

  const handleReset = useCallback(() => {
    if (simRef.current) {
      if (currentMode === 'words') {
        simRef.current.startWordGame();
      } else {
        simRef.current.resetGame();
      }
    }
    setMaxRadius(24);
    setHighestTier(1);
  }, [currentMode]);

  const handleRestartWord = useCallback(() => {
    if (simRef.current) {
      simRef.current.startWordGame(wordState?.currentWordIndex);
    }
  }, [wordState]);

  const handleSkipWord = useCallback(() => {
    if (simRef.current) {
      simRef.current.startWordGame();
    }
  }, []);

  const handleSpawnCluster = useCallback(() => {
    if (!simRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    for (let i = 0; i < 5; i++) {
      const x = 50 + Math.random() * (rect.width - 100);
      const y = 80 + Math.random() * (rect.height - 160);
      simRef.current.createBubble(x, y, 22 + Math.random() * 18, true);
    }
  }, []);

  const handleSpawnGiant = useCallback(() => {
    if (!simRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = rect.width * 0.5 + (Math.random() - 0.5) * 40;
    const y = rect.height * 0.5 + (Math.random() - 0.5) * 40;
    simRef.current.createBubble(x, y, 95 + Math.random() * 20, true);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Top Bar with 3-Zone Contract */}
      <TopBar
        currentMode={currentMode}
        onSelectMode={handleSelectMode}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCatalog={() => setIsCatalogOpen(true)}
        onOpenTabletModal={() => setIsTabletModalOpen(true)}
        onReset={handleReset}
      />

      {/* Floating Game HUD based on mode */}
      {currentMode === 'words' ? (
        <WordGameHUD
          wordState={wordState}
          onRestartWord={handleRestartWord}
          onSkipWord={handleSkipWord}
        />
      ) : (
        <HUD
          mode={currentMode}
          stats={stats}
          maxRadius={maxRadius}
          highestTier={highestTier}
          stressWarning={stressWarning}
        />
      )}

      {/* Milestone Toast */}
      <MilestoneToast message={milestone?.message || null} tierNumber={milestone?.tier || 1} />

      {/* Main Interactive Physics Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />

      {/* Settings / Laboratory Slide-over */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
        physics={physics}
        onChangePhysics={handleChangePhysics}
        isAmbientPlaying={isAmbientPlaying}
        onToggleAmbient={handleToggleAmbient}
        onSpawnCluster={handleSpawnCluster}
        onSpawnGiant={handleSpawnGiant}
      />

      {/* Evolution Catalog Modal */}
      <EvolutionCatalog
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        highestTierReached={highestTier}
      />

      {/* Tablet Connection & QR Code Modal */}
      <TabletConnectModal
        isOpen={isTabletModalOpen}
        onClose={() => setIsTabletModalOpen(false)}
      />
    </div>
  );
}
