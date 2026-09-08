import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Tablet,
  RotateCw,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  HardDrive,
  X,
  Sparkles,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { offlineStorage, type OfflineMediaItem } from '../lib/offlineStorage';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export type DeviceType = 'iphone' | 'ipad';
export type Orientation = 'portrait' | 'landscape';

export interface DeviceSimulatorProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function DeviceSimulator({ children, isOpen, onClose }: DeviceSimulatorProps) {
  const { language, isRtl } = useThemeLanguage();
  const { isOffline, isSimulated, toggleSimulatedOffline } = useNetworkStatus();
  const [device, setDevice] = useState<DeviceType>('iphone');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [scale, setScale] = useState<number>(0.85);
  const [showStorageInspector, setShowStorageInspector] = useState(false);
  const [storageItems, setStorageItems] = useState<OfflineMediaItem[]>([]);
  const [storageUsage, setStorageUsage] = useState({ usedBytes: 0, formatted: '0 B', count: 0 });

  // Update storage stats when inspector opens
  useEffect(() => {
    if (showStorageInspector) {
      offlineStorage.getOfflineItems().then(setStorageItems);
      offlineStorage.getStorageUsage().then(setStorageUsage);
    }
  }, [showStorageInspector]);

  // Adjust default scale based on window size
  useEffect(() => {
    const handleResize = () => {
      const h = window.innerHeight;
      if (h < 850) {
        setScale(0.72);
      } else if (h < 1000) {
        setScale(0.82);
      } else {
        setScale(0.9);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return <>{children}</>;

  // Dimensions
  // iPhone 16 Pro: 393 x 852
  // iPad Pro 11": 834 x 1194
  const isIphone = device === 'iphone';
  const isPortrait = orientation === 'portrait';

  const width = isIphone
    ? isPortrait ? 393 : 852
    : isPortrait ? 834 : 1194;

  const height = isIphone
    ? isPortrait ? 852 : 393
    : isPortrait ? 1194 : 834;

  const toggleOrientation = () => {
    setOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'));
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[#0c0c0e] flex flex-col select-none overflow-hidden font-sans">
      {/* ─── Simulator Top Toolbar ─── */}
      <header className="h-14 bg-[#161618] border-b border-white/10 px-4 flex items-center justify-between z-30 shadow-md">
        {/* Left: Device & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E50914]/20 to-purple-600/20 border border-white/10 text-white font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
            <span>Homeflix Mobile Studio</span>
          </div>

          {/* Device Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-black/40 border border-white/10 text-xs">
            <button
              onClick={() => setDevice('iphone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                isIphone ? 'bg-[#E50914] text-white font-bold shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iPhone 16 Pro</span>
            </button>
            <button
              onClick={() => setDevice('ipad')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                !isIphone ? 'bg-[#E50914] text-white font-bold shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>iPad Pro 11"</span>
            </button>
          </div>
        </div>

        {/* Center: Controls (Rotate, Offline Simulation, Zoom) */}
        <div className="flex items-center gap-2.5">
          {/* Rotate Orientation */}
          <button
            onClick={toggleOrientation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
            title={language === 'he' ? 'סובב מכשיר (לאורך / לרוחב)' : 'Rotate orientation'}
          >
            <RotateCw className="w-3.5 h-3.5 text-neutral-400" />
            <span>{isPortrait ? (language === 'he' ? 'לאורך' : 'Portrait') : (language === 'he' ? 'לרוחב' : 'Landscape')}</span>
          </button>

          {/* Offline Simulation Switch */}
          <button
            onClick={toggleSimulatedOffline}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
              isOffline
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 ring-2 ring-amber-500/20'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
            }`}
            title={language === 'he' ? 'הדמה ניתוק מהאינטרנט לבדיקת אופליין' : 'Simulate offline network cut'}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-400" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>
              {isOffline
                ? language === 'he' ? 'מצב אופליין (מנותק לרשת)' : 'Simulated Offline'
                : language === 'he' ? 'אינטרנט פעיל (Online)' : 'Network Connected'}
            </span>
          </button>

          {/* Sandbox Storage Inspector */}
          <button
            onClick={() => setShowStorageInspector(!showStorageInspector)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
            title={language === 'he' ? 'צפה באחסון הפנימי של האפליקציה' : 'Inspect Sandbox Storage'}
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>{storageUsage.formatted}</span>
          </button>

          {/* Scale Selector */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-neutral-400 font-mono px-2 py-1 rounded-lg bg-black/40 border border-white/5">
            <button onClick={() => setScale(Math.max(0.5, scale - 0.05))} className="px-1.5 hover:text-white cursor-pointer">-</button>
            <span>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(Math.min(1.1, scale + 0.05))} className="px-1.5 hover:text-white cursor-pointer">+</button>
          </div>
        </div>

        {/* Right: Close Studio & Return */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>{language === 'he' ? 'סגור סימולטור' : 'Exit Simulator'}</span>
          </button>
        </div>
      </header>

      {/* ─── Simulator Workspace / Canvas ─── */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:16px_16px] relative">
        {/* Device Outer Chassis */}
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease, width 0.3s ease, height 0.3s ease',
          }}
          className="relative flex-shrink-0"
        >
          {/* Hardware Frame Styling */}
          <div
            style={{
              width: `${width + (isIphone ? 28 : 36)}px`,
              height: `${height + (isIphone ? 28 : 36)}px`,
            }}
            className={`relative rounded-[${isIphone ? '54px' : '36px'}] bg-[#2a2a2c] p-[14px] shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_0_2px_rgba(255,255,255,0.1),inset_0_0_0_2px_rgba(0,0,0,0.8)] border border-neutral-700/50 flex items-center justify-center`}
          >
            {/* Screen Bezel and Display Area */}
            <div
              style={{
                width: `${width}px`,
                height: `${height}px`,
              }}
              className={`relative overflow-hidden bg-black rounded-[${
                isIphone ? '44px' : '24px'
              }] shadow-inner flex flex-col`}
            >
              {/* iPhone Dynamic Island / iPad Status Bar */}
              {isIphone && isPortrait && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center justify-center">
                  <div className="w-[124px] h-[34px] bg-black rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.08)] flex items-center justify-between px-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#111] border border-neutral-800" />
                    <div className="w-3 h-3 rounded-full bg-blue-950/70 border border-blue-800/40" />
                  </div>
                </div>
              )}

              {/* Native iOS Fake Status Bar */}
              <div className="h-9 w-full flex items-center justify-between px-7 text-[12px] font-semibold text-white/90 z-40 pointer-events-none select-none bg-gradient-to-b from-black/60 to-transparent">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  {isOffline ? (
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Wifi className="w-3.5 h-3.5 text-white" />
                  )}
                  <div className="w-5 h-2.5 rounded-sm border border-white/80 p-0.5 flex items-center">
                    <div className="h-full w-3/4 bg-white rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* The Actual Running Homeflix Web Application */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#0F0F0F]">
                {children}
              </div>

              {/* Native iOS Home Bar */}
              <div className="h-6 w-full flex items-center justify-center pointer-events-none z-40 bg-gradient-to-t from-black/80 to-transparent">
                <div className="w-36 h-1 bg-white/40 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Sandbox Storage Inspector Drawer ─── */}
        {showStorageInspector && (
          <div className="absolute top-4 right-4 bottom-4 w-96 bg-[#161618]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-5 text-white">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1b1b1d] rounded-t-2xl">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  {language === 'he' ? 'מפקח אחסון פנימי (Sandbox)' : 'Internal Sandbox Inspector'}
                </h3>
              </div>
              <button
                onClick={() => setShowStorageInspector(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400">{language === 'he' ? 'נפח תפוס:' : 'Used Space:'}</span>
                <span className="font-bold text-emerald-400">{storageUsage.formatted}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">{language === 'he' ? 'קבצים שמורים:' : 'Saved Media:'}</span>
                <span className="font-bold text-white">{storageUsage.count}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {storageItems.length === 0 ? (
                <div className="py-16 text-center text-xs text-neutral-500">
                  {language === 'he' ? 'אין עדיין קבצים באחסון האופליין' : 'Sandbox storage is empty'}
                </div>
              ) : (
                storageItems.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2.5">
                      {item.posterDataUrl && (
                        <img src={item.posterDataUrl} alt={item.title} className="w-10 h-14 object-cover rounded-md flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-white truncate">{item.title}</h5>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono mt-0.5">
                          <span>{offlineStorage.formatBytes(item.sizeBytes)}</span>
                          {item.year && <span>({item.year})</span>}
                        </div>
                      </div>
                    </div>
                    {item.subtitles && item.subtitles.length > 0 && (
                      <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1">
                        {item.subtitles.map((s) => (
                          <span key={s.streamIndex} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                            {s.language.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
