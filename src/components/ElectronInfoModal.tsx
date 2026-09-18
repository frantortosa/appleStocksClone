import React, { useState } from 'react';
import { X, Terminal, Monitor, Laptop, Check, Copy, Download, ShieldCheck, Cpu } from 'lucide-react';

interface ElectronInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ElectronInfoModal: React.FC<ElectronInfoModalProps> = ({ isOpen, onClose }) => {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const devCommand = 'npm run electron:dev';
  const buildMacCommand = 'npm run electron:pack:mac';
  const buildWinCommand = 'npm run electron:pack:win';

  return (
    <div 
      id="electron-info-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-[#1c1c1e] border border-[#38383a] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2c2c2e] bg-[#141416]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Rendimiento Nativo de Escritorio con Electron
              </h3>
              <p className="text-[11px] text-neutral-400">
                Multiplataforma lista para macOS y Windows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-neutral-300">
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-200">
            <p className="font-semibold text-[13px] mb-1">
              ✨ Arquitectura Híbrida Web & Desktop Nativa
            </p>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Esta aplicación está diseñada para ejecutarse tanto en el navegador web como en forma de binario nativo para <strong>macOS (.dmg / .app)</strong> y <strong>Windows (.exe / instalador)</strong> mediante Electron con aceleración por hardware GPU y persistencia local sin limitaciones.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#242426] border border-white/5 space-y-1">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-[#0A84FF]" />
                macOS Nativo
              </span>
              <p className="text-neutral-400">
                Semáforos nativos, barra de menús del sistema Apple, soporte para modo oscuro automático y renderizado Retina.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#242426] border border-white/5 space-y-1">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-[#30D158]" />
                Windows 10 / 11
              </span>
              <p className="text-neutral-400">
                Controles de ventana Windows, esquinas redondeadas estilo Fluent, integración con bandeja del sistema (System Tray).
              </p>
            </div>
          </div>

          {/* Terminal commands */}
          <div className="space-y-2">
            <span className="font-semibold text-white block">
              Comandos para ejecutar o compilar en tu máquina:
            </span>

            {/* Dev command */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e0e10] border border-[#2c2c2e] font-mono">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">$</span>
                <span className="text-cyan-300">{devCommand}</span>
              </div>
              <button
                onClick={() => copyToClipboard(devCommand, 'dev')}
                className="px-2 py-1 rounded bg-[#242426] hover:bg-[#323236] text-white flex items-center gap-1 text-[10px]"
              >
                {copiedScript === 'dev' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript === 'dev' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            {/* Mac package */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e0e10] border border-[#2c2c2e] font-mono">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">$</span>
                <span className="text-cyan-300">{buildMacCommand}</span>
              </div>
              <button
                onClick={() => copyToClipboard(buildMacCommand, 'mac')}
                className="px-2 py-1 rounded bg-[#242426] hover:bg-[#323236] text-white flex items-center gap-1 text-[10px]"
              >
                {copiedScript === 'mac' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript === 'mac' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            {/* Windows package */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e0e10] border border-[#2c2c2e] font-mono">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">$</span>
                <span className="text-cyan-300">{buildWinCommand}</span>
              </div>
              <button
                onClick={() => copyToClipboard(buildWinCommand, 'win')}
                className="px-2 py-1 rounded bg-[#242426] hover:bg-[#323236] text-white flex items-center gap-1 text-[10px]"
              >
                {copiedScript === 'win' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript === 'win' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#2c2c2e] bg-[#141416] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#0A84FF] hover:bg-[#0071E3] text-white font-semibold text-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
