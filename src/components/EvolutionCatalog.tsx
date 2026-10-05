import React from 'react';
import { X, CheckCircle2, Lock } from 'lucide-react';
import { BUBBLE_TIERS } from '../config/gameConstants';

interface EvolutionCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  highestTierReached: number;
}

export const EvolutionCatalog: React.FC<EvolutionCatalogProps> = ({
  isOpen,
  onClose,
  highestTierReached,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-display font-bold text-white text-base">Bubble Evolution Stages</h2>
            <p className="text-xs text-slate-400">Merge bubbles gently to unlock higher cosmic tiers</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close catalog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Catalog List */}
        <div className="p-6 overflow-y-auto space-y-3">
          {BUBBLE_TIERS.map((tier) => {
            const isUnlocked = highestTierReached >= tier.level;
            return (
              <div
                key={tier.level}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                  isUnlocked
                    ? 'border-white/10 bg-slate-800/40 text-slate-200'
                    : 'border-white/5 bg-slate-900/40 opacity-50 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20"
                    style={{
                      backgroundColor: `${tier.color}25`,
                      boxShadow: isUnlocked ? `0 0 12px ${tier.color}40` : 'none',
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tier.color }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        Tier {tier.level} · {tier.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({tier.minRadius}px+)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{tier.description}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-xs">
                  {isUnlocked ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Discovered
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Lock className="w-4 h-4" />
                      Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
