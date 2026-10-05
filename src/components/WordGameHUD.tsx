import React, { useState } from 'react';
import { WordGameState } from '../types/game';
import { RotateCcw, Sparkles, Heart, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';

interface WordGameHUDProps {
  wordState: WordGameState | null;
  onRestartWord: () => void;
  onSkipWord: () => void;
}

export const WordGameHUD: React.FC<WordGameHUDProps> = ({
  wordState,
  onRestartWord,
  onSkipWord,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (!wordState) return null;

  const {
    currentWord,
    collectedLetters,
    targetIndex,
    hitPoints,
    maxHitPoints,
    isComplete,
    wordsCompletedCount,
    isGameOver,
    wrongLetterAlert,
  } = wordState;

  const targetLetters = currentWord.word.split('');
  const neededLetter = targetIndex < targetLetters.length ? targetLetters[targetIndex] : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2 pt-14 sm:p-4 sm:pt-16 select-none">
      {/* Top Section: Target Word Display & Hitpoints */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-2">
        {/* Main Word Card - Ultra translucent glass so bubbles behind are completely visible */}
        <div className="pointer-events-none w-full bg-slate-950/25 hover:bg-slate-950/40 backdrop-blur-[2px] rounded-2xl border border-white/15 p-2 sm:p-3 shadow-lg transition-all duration-300 flex flex-col items-center gap-2">
          
          {/* Header Row: Emoji, Word Hint, Hearts, and Minimize Toggle */}
          <div className="w-full flex items-center justify-between border-b border-white/10 pb-1.5">
            {/* Word hint & icon */}
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl drop-shadow" role="img" aria-label={currentWord.word}>
                {currentWord.hintEmoji}
              </span>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold drop-shadow">
                    Слово:
                  </span>
                  <span className="text-sm font-bold text-amber-300 font-display drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    {currentWord.word}
                  </span>
                </div>
                {!isMinimized && (
                  <p className="text-[10px] sm:text-[11px] text-slate-300 line-clamp-1 drop-shadow">
                    {currentWord.hintDescription}
                  </p>
                )}
              </div>
            </div>

            {/* Right Header Controls: 3 Hearts & Action Buttons */}
            <div className="flex items-center gap-2">
              {/* 3 Hitpoints Hearts */}
              <div className="flex items-center gap-1 bg-slate-950/40 px-2.5 py-1 rounded-xl border border-white/10 backdrop-blur-[2px]">
                <span className="text-[10px] text-slate-300 font-medium mr-0.5 hidden sm:inline">
                  Жизни:
                </span>
                {Array.from({ length: maxHitPoints }).map((_, i) => {
                  const isAlive = i < hitPoints;
                  return (
                    <Heart
                      key={i}
                      className={`w-3.5 h-3.5 transition-all duration-300 ${
                        isAlive
                          ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.9)] scale-100'
                          : 'text-slate-600 fill-slate-800 scale-90 opacity-60'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Minimize/Expand Toggle */}
              <button
                onClick={() => setIsMinimized((prev) => !prev)}
                className="pointer-events-auto p-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-white/10 text-slate-300 hover:text-white transition-colors"
                title={isMinimized ? 'Развернуть карточку' : 'Свернуть карточку (больше места)'}
              >
                {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Expanded View: Translucent Letter Slots and Subtitle Helper */}
          {!isMinimized && (
            <>
              {/* Word Letter Slots - Translucent glass buttons */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap py-0.5">
                {targetLetters.map((char, idx) => {
                  const isCollected = idx < collectedLetters.length;
                  const isCurrentTarget = idx === targetIndex && !isComplete && !isGameOver;

                  return (
                    <div
                      key={idx}
                      className={`w-10 h-11 sm:w-12 sm:h-14 rounded-xl flex flex-col items-center justify-center font-display font-extrabold text-base sm:text-xl transition-all duration-300 backdrop-blur-[1px] ${
                        isCollected
                          ? 'bg-amber-500/25 border-2 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-105'
                          : isCurrentTarget
                          ? 'bg-cyan-500/20 border-2 border-cyan-400 text-cyan-200 shadow-[0_0_14px_rgba(6,182,212,0.4)] animate-pulse scale-100'
                          : 'bg-slate-950/25 border border-white/15 text-slate-300'
                      }`}
                    >
                      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{char}</span>
                      {isCurrentTarget && (
                        <span className="text-[8px] font-sans font-bold text-cyan-300 uppercase tracking-tighter">
                          ищи!
                        </span>
                      )}
                      {isCollected && (
                        <span className="text-[8px] font-sans font-bold text-amber-300">
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Subtitle helper row */}
              <div className="w-full flex items-center justify-between text-[11px] text-slate-300 pt-0.5">
                <span className="flex items-center gap-1 drop-shadow">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Отгадано: <strong className="text-white font-mono">{wordsCompletedCount}</strong></span>
                </span>

                {neededLetter && !isComplete && !isGameOver && (
                  <span className="text-cyan-200 font-medium drop-shadow">
                    Нужна: <strong className="text-white text-xs bg-cyan-950/50 px-2 py-0.5 rounded-lg border border-cyan-400/40">"{neededLetter}"</strong>
                  </span>
                )}

                <button
                  onClick={onSkipWord}
                  className="pointer-events-auto text-[11px] text-slate-300 hover:text-white transition-colors underline underline-offset-2 flex items-center gap-1 drop-shadow"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Другое</span>
                </button>
              </div>
            </>
          )}

          {/* Minimized View: Compact inline letter progress */}
          {isMinimized && (
            <div className="w-full flex items-center justify-between text-xs py-0.5">
              <div className="flex items-center gap-1">
                {targetLetters.map((char, idx) => {
                  const isCollected = idx < collectedLetters.length;
                  const isCurrentTarget = idx === targetIndex && !isComplete && !isGameOver;
                  return (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded text-xs font-bold font-mono ${
                        isCollected
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50'
                          : isCurrentTarget
                          ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 animate-pulse'
                          : 'bg-slate-900/30 text-slate-400 border border-white/10'
                      }`}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>

              {neededLetter && !isComplete && !isGameOver && (
                <span className="text-cyan-200 text-xs font-semibold">
                  Нужна: <strong className="text-white">"{neededLetter}"</strong>
                </span>
              )}

              <button
                onClick={onSkipWord}
                className="pointer-events-auto text-[10px] text-slate-300 hover:text-white transition-colors underline underline-offset-2"
              >
                Другое
              </button>
            </div>
          )}
        </div>

        {/* Alert / Notification: Wrong letter OR Coalesced Bubble Pop & Recovery */}
        {wrongLetterAlert && !isGameOver && (
          <div className="px-3.5 py-1.5 rounded-full bg-rose-500/25 border border-rose-400/60 text-rose-100 text-xs font-semibold tracking-wide flex items-center gap-2 backdrop-blur-[2px] shadow-lg animate-bounce">
            <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
            <span>{wrongLetterAlert}</span>
          </div>
        )}

        {/* Word Completed Celebration Banner */}
        {isComplete && (
          <div className="px-5 py-2.5 rounded-2xl bg-amber-500/25 border-2 border-amber-400 text-white text-sm font-bold tracking-wide flex items-center gap-3 backdrop-blur-[2px] shadow-[0_0_24px_rgba(245,158,11,0.5)] animate-in fade-in zoom-in duration-300">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-base text-amber-300 drop-shadow">Молодец! Слово собрано: {currentWord.word}!</p>
              <p className="text-xs text-slate-100 font-normal drop-shadow">Сейчас появится следующее слово...</p>
            </div>
          </div>
        )}

        {/* Game Over Banner with Restart Button */}
        {isGameOver && (
          <div className="pointer-events-auto px-5 py-3.5 rounded-2xl bg-slate-950/80 border-2 border-rose-500 text-white text-center shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
            <span className="text-2xl">💔</span>
            <p className="font-bold text-base text-rose-400">Все 3 жизни закончились!</p>
            <p className="text-xs text-slate-300 max-w-xs">
              Ничего страшного! Собирай буквы аккуратно, двигай большой пузырь бережно.
            </p>
            <button
              onClick={onRestartWord}
              className="mt-1 px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Попробовать снова</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Tip for Kids - Translucent so it never blocks background */}
      <div className="max-w-md mx-auto w-full text-center pb-1">
        <div className="bg-slate-950/30 backdrop-blur-[1px] px-3 py-1.5 rounded-xl border border-white/10 text-[10px] sm:text-[11px] text-slate-300 drop-shadow">
          <span className="text-amber-300 font-semibold">Совет:</span> Толкай нужную букву в большой пузырь ⭐ Большие пузыри веди медленно и плавно, чтобы не лопнули!
        </div>
      </div>
    </div>
  );
};
