import React from 'react';
import { GameMode, GameStats } from '../types/game';
import { BUBBLE_TIERS } from '../config/gameConstants';

interface HUDProps {
  mode: GameMode;
  stats: GameStats;
  maxRadius: number;
  highestTier: number;
  stressWarning: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  mode,
  stats,
  maxRadius,
  highestTier,
  stressWarning,
}) => {
  const currentTierInfo = BUBBLE_TIERS[highestTier - 1] || BUBBLE_TIERS[0];
  const targetColossusRadius = 225;
  const colossusProgress = Math.min(100, Math.round((maxRadius / targetColossusRadius) * 100));

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 pt-18 sm:p-6 sm:pt-20 select-none">
      {/* Top Info Bar: Unboxed clean metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-5xl mx-auto w-full">
        {/* Tier status indicator */}
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{
              backgroundColor: currentTierInfo.color,
              boxShadow: `0 0 10px ${currentTierInfo.color}`,
            }}
          />
          <span className="font-semibold text-white tracking-wide">
            Tier {currentTierInfo.level} · {currentTierInfo.name}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-400 font-mono tabular-nums">
            Max: {maxRadius}px
          </span>
        </div>

        {/* Live game counters */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
          <span>Merged {stats.bubblesMerged}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>Burst {stats.bubblesPopped}</span>
          {stats.currentCombo > 1 && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-cyan-300 font-semibold animate-pulse">
                Combo ×{stats.currentCombo}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Stress warning banner when user drags too quickly */}
      {stressWarning && (
        <div className="mx-auto px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-medium tracking-wide flex items-center gap-2 backdrop-blur-md animate-bounce">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span>Moving too fast! Larger bubbles are delicate — drag slowly and gently</span>
        </div>
      )}

      {/* Bottom Center: Mode Progress & Gesture Hint */}
      <div className="max-w-md mx-auto w-full flex flex-col items-center gap-2 pb-2">
        {mode === 'challenge' && (
          <div className="w-full bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Cosmic Colossus Quest</span>
              <span className="text-cyan-400 font-mono font-semibold tabular-nums">
                {colossusProgress}% ({maxRadius} / {targetColossusRadius}px)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300 transition-all duration-300 rounded-full"
                style={{ width: `${colossusProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Intuitive Gesture Instruction */}
        <div className="flex items-center gap-2 text-xs text-slate-400 text-center bg-slate-950/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/5">
          <span className="text-slate-200 font-medium">Sharp tap</span>
          <span>to burst</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-200 font-medium">Gentle drag</span>
          <span>(slower for bigger orbs) to merge</span>
        </div>
      </div>
    </div>
  );
};
