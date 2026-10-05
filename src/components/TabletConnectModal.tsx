import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Tablet, Check, Copy, ExternalLink, AlertCircle, Share2 } from 'lucide-react';

interface TabletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TabletConnectModal: React.FC<TabletConnectModalProps> = ({ isOpen, onClose }) => {
  const [devQrSvg, setDevQrSvg] = useState<string>('');
  const [copiedDev, setCopiedDev] = useState<boolean>(false);
  const [copiedPre, setCopiedPre] = useState<boolean>(false);

  const devUrl = 'https://ais-dev-vhmbkxqfytm3i4x6kthgae-461442238454.europe-west1.run.app';
  const preUrl = 'https://ais-pre-vhmbkxqfytm3i4x6kthgae-461442238454.europe-west1.run.app';

  useEffect(() => {
    QRCode.toString(devUrl, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((svg) => setDevQrSvg(svg))
      .catch(() => {});
  }, [devUrl]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, isDev: boolean) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (isDev) {
        setCopiedDev(true);
        setTimeout(() => setCopiedDev(false), 2000);
      } else {
        setCopiedPre(true);
        setTimeout(() => setCopiedPre(false), 2000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Tablet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">
                Запуск на планшете (Android / iPad)
              </h2>
              <p className="text-xs text-slate-400">
                Как открыть игру на планшете без ошибки «Page not found»
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Why "Page Not Found" happened explanation */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex gap-2.5 items-start">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 leading-relaxed">
            <strong className="text-amber-300 font-semibold">Почему возникла ошибка «Page not found»:</strong>
            <p className="text-slate-300">
              Ссылка <span className="font-mono text-white text-[11px] bg-slate-950/60 px-1 py-0.5 rounded">ais-pre</span> активируется в Google Cloud только <strong>после нажатия кнопки «Share»</strong> в интерфейсе AI Studio. А ссылка <span className="font-mono text-white text-[11px] bg-slate-950/60 px-1 py-0.5 rounded">ais-dev</span> защищена Google-авторизацией.
            </p>
          </div>
        </div>

        {/* Option 1: Direct QR Code Scan for Dev URL */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-white/10">
          <div className="w-32 h-32 bg-white rounded-xl p-2 shrink-0 flex items-center justify-center shadow-lg">
            {devQrSvg ? (
              <div
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: devQrSvg }}
              />
            ) : (
              <span className="text-xs text-slate-600">Генерация...</span>
            )}
          </div>

          <div className="flex flex-col gap-2 text-left">
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
              Способ 1: Открыть прямо сейчас
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              1. Наведите <strong>камеру планшета</strong> на этот QR-код (или откройте ссылку ниже).<br />
              2. В браузере планшета (Chrome) убедитесь, что выполнен вход в аккаунт <strong className="text-white">v.samukov@gmail.com</strong>.
            </p>
            <button
              onClick={() => copyToClipboard(devUrl, true)}
              className="mt-1 self-start px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors"
            >
              {copiedDev ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDev ? 'Скопировано!' : 'Скопировать dev-ссылку'}</span>
            </button>
          </div>
        </div>

        {/* Option 2: Share Button in AI Studio */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
              Способ 2: Публичная ссылка (для любого аккаунта)
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            В правом верхнем углу окна <strong>Google AI Studio</strong> на компьютере нажмите кнопку <strong>«Share»</strong> и включите публичный доступ. После этого ссылка <span className="font-mono text-white text-[11px] bg-slate-900 px-1 py-0.5 rounded">ais-pre</span> мгновенно заработает на любом планшете без входа в аккаунт:
          </p>
          <div className="flex items-center justify-between gap-2 bg-slate-900/90 px-3 py-2 rounded-lg border border-white/5">
            <span className="text-xs font-mono text-slate-300 truncate">
              {preUrl}
            </span>
            <button
              onClick={() => copyToClipboard(preUrl, false)}
              className="shrink-0 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Скопировать ссылку"
            >
              {copiedPre ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg transition-colors"
        >
          Понятно, закрыть
        </button>
      </div>
    </div>
  );
};
