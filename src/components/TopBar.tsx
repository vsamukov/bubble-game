import React from 'react';
import { Volume2, VolumeX, Sliders, RotateCcw, Sparkles, Tablet } from 'lucide-react';
import { GameMode } from '../types/game';

interface TopBarProps {
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenCatalog: () => void;
  onOpenTabletModal: () => void;
  onReset: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentMode,
  onSelectMode,
  isMuted,
  onToggleMute,
  onOpenSettings,
  onOpenCatalog,
  onOpenTabletModal,
  onReset,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-14 px-4 sm:px-6 flex items-center justify-between bg-slate-950/70 backdrop-blur-md border-b border-white/10 select-none">
      {/* Zone 1: Single text wordmark */}
      <div className="flex items-center gap-3">
        <span className="font-display text-lg font-bold tracking-tight text-white flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          Bubble Bloom
        </span>
      </div>

      {/* Zone 2: Mode selection tabs */}
      <nav className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-white/5">
        <button
          onClick={() => onSelectMode('zen')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            currentMode === 'zen'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Infinite relaxing free play"
        >
          Zen Bloom
        </button>
        <button
          onClick={() => onSelectMode('challenge')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            currentMode === 'challenge'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Merge bubbles to reach Tier 8 Colossus"
        >
          Colossus Quest
        </button>
        <button
          onClick={() => onSelectMode('harmony')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            currentMode === 'harmony'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Harmonic melody chords on each fusion"
        >
          Harmony
        </button>
        <button
          onClick={() => onSelectMode('words')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            currentMode === 'words'
              ? 'bg-amber-400/25 text-amber-300 border border-amber-400/40 shadow-sm'
              : 'text-amber-200/80 hover:text-amber-100 hover:bg-white/5'
          }`}
          title="Русские слова: собери слово из букв!"
        >
          <span>Русские Слова</span>
        </button>
      </nav>

      {/* Zone 3: Primary interactive controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenTabletModal}
          className="h-9 px-2.5 flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/80 rounded-lg border border-cyan-500/30 transition-colors shadow-sm"
          title="Запуск на планшете / QR-код"
        >
          <Tablet className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Планшет</span>
        </button>

        <button
          onClick={onOpenCatalog}
          className="h-9 px-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 rounded-lg border border-white/5 transition-colors"
          title="View Bubble Evolution Catalog"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Evolutions</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 rounded-lg border border-white/5 transition-colors"
          title="Physics & Themes Laboratory"
          aria-label="Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleMute}
          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 rounded-lg border border-white/5 transition-colors"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          aria-label="Toggle Sound"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        <button
          onClick={onReset}
          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 rounded-lg border border-white/5 transition-colors"
          title="Reset Canvas"
          aria-label="Reset Canvas"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
