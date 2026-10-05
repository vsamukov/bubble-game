import React from 'react';
import { Sparkles } from 'lucide-react';

interface MilestoneToastProps {
  message: string | null;
  tierNumber: number;
}

export const MilestoneToast: React.FC<MilestoneToastProps> = ({ message, tierNumber }) => {
  if (!message) return null;

  return (
    <div className="pointer-events-none fixed top-18 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-[0_0_24px_rgba(6,182,212,0.25)] backdrop-blur-md flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-xs font-semibold text-white tracking-wide">
            Tier {tierNumber} Evolved!
          </span>
          <span aria-hidden="true" className="text-slate-600 mx-1.5">·</span>
          <span className="text-xs text-cyan-300 font-medium">{message}</span>
        </div>
      </div>
    </div>
  );
};
