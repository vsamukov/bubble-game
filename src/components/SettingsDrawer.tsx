import React from 'react';
import { X, Music, Sparkles, Wind, Gauge, Droplet, PlusCircle } from 'lucide-react';
import { GameTheme, PhysicsSettings } from '../types/game';
import { THEMES } from '../config/gameConstants';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: GameTheme;
  onSelectTheme: (theme: GameTheme) => void;
  physics: PhysicsSettings;
  onChangePhysics: (newSettings: Partial<PhysicsSettings>) => void;
  isAmbientPlaying: boolean;
  onToggleAmbient: () => void;
  onSpawnCluster: () => void;
  onSpawnGiant: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  physics,
  onChangePhysics,
  isAmbientPlaying,
  onToggleAmbient,
  onSpawnCluster,
  onSpawnGiant,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-white/10 flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-white">Laboratory & Physics</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 text-sm flex-1">
          {/* Theme Palette */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              Visual Iridescence Theme
            </label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(THEMES) as GameTheme[]).map((themeKey) => {
                const item = THEMES[themeKey];
                const isSelected = currentTheme === themeKey;
                return (
                  <button
                    key={themeKey}
                    onClick={() => onSelectTheme(themeKey)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/30 text-white'
                        : 'border-white/5 bg-slate-800/40 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <span className="font-medium text-xs">{item.name}</span>
                    <div className="flex items-center gap-1">
                      {item.filmColors.slice(0, 4).map((c, i) => (
                        <span
                          key={i}
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ambient Zen Sound Generator */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-white text-xs">Zen Ambient Chord Pad</p>
                <p className="text-[11px] text-slate-400">Generative offline 432Hz meditation tone</p>
              </div>
            </div>
            <button
              onClick={onToggleAmbient}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isAmbientPlaying
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15'
              }`}
            >
              {isAmbientPlaying ? 'Active' : 'Enable'}
            </button>
          </div>

          {/* Physics sliders */}
          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Membrane Dynamics
            </label>

            {/* Rupture Speed Sensitivity */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-rose-400" />
                  Rupture Speed Limit
                </span>
                <span className="text-slate-400 font-mono tabular-nums">
                  {Math.round(physics.ruptureThreshold)} px/s
                </span>
              </div>
              <input
                type="range"
                min="600"
                max="2000"
                step="50"
                value={physics.ruptureThreshold}
                onChange={(e) => onChangePhysics({ ruptureThreshold: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                Lower = requires gentler movement; higher = more forgiving drag speed.
              </p>
            </div>

            {/* Surface Tension */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                  Surface Tension
                </span>
                <span className="text-slate-400 font-mono tabular-nums">
                  {physics.surfaceTension.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.8"
                step="0.05"
                value={physics.surfaceTension}
                onChange={(e) => onChangePhysics({ surfaceTension: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                Controls how springy and rapid bubble wiggles ripple along the membrane.
              </p>
            </div>

            {/* Environmental Gravity & Dust Drift */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  Environmental Gravity
                </span>
                <span className="text-slate-400 font-mono tabular-nums">
                  {physics.gravity > 0.05
                    ? `+${physics.gravity.toFixed(2)} (Down)`
                    : physics.gravity < -0.05
                    ? `${physics.gravity.toFixed(2)} (Up)`
                    : '0.00 (Zero-G)'}
                </span>
              </div>
              <input
                type="range"
                min="-0.4"
                max="0.6"
                step="0.05"
                value={physics.gravity}
                onChange={(e) => onChangePhysics({ gravity: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                Governs slow-moving background dust particles and atmospheric drift.
              </p>
            </div>

            {/* Buoyancy Drift */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-indigo-400" />
                  Bubble Buoyancy
                </span>
                <span className="text-slate-400 font-mono tabular-nums">
                  {physics.buoyancy.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-0.2"
                max="0.4"
                step="0.05"
                value={physics.buoyancy}
                onChange={(e) => onChangePhysics({ buoyancy: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Spawners
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onSpawnCluster}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-white/5 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                Spawn Cluster
              </button>
              <button
                onClick={onSpawnGiant}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-white/5 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Spawn Giant Orb
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
