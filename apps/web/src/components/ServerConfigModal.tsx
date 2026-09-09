import React, { useState, useEffect } from 'react';
import { Server, Wifi, Globe, CheckCircle2, XCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { getBaseApiUrl, apiUrl } from '../lib/api';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({ isOpen, onClose }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [latency, setLatency] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = localStorage.getItem('omflix_server_url') || getBaseApiUrl() || 'http://192.168.1.213:8096';
      setServerUrl(current);
      setStatus('idle');
      setLatency(null);
      setErrorMessage('');
      testConnection(current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const testConnection = async (urlToTest: string) => {
    setStatus('testing');
    setErrorMessage('');
    const cleanUrl = urlToTest.replace(/\/+$/, '');
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${cleanUrl}/api/v1/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const pingTime = Math.round(performance.now() - startTime);
        setLatency(pingTime);
        setStatus('success');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'לא ניתן להתחבר לשרת');
    }
  };

  const handleSave = () => {
    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    if (cleanUrl) {
      localStorage.setItem('omflix_server_url', cleanUrl);
    } else {
      localStorage.removeItem('omflix_server_url');
    }
    window.location.reload();
  };

  const handleSelectPreset = (presetUrl: string) => {
    setServerUrl(presetUrl);
    testConnection(presetUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E50914]/20 border border-[#E50914]/30 text-[#E50914]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">הגדרת חיבור לשרת Homeflix</h2>
              <p className="text-xs text-neutral-400">התחברות ישירה מהסמארטפון (Galaxy S22 Ultra)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              כתובת השרת (IP / Hostname)
            </label>
            <div className="relative">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => {
                  setServerUrl(e.target.value);
                  setStatus('idle');
                }}
                placeholder="http://192.168.1.213:8096"
                className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-[#E50914]"
                dir="ltr"
              />
              <button
                onClick={() => testConnection(serverUrl)}
                disabled={status === 'testing'}
                className="absolute right-2 top-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                {status === 'testing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'בדוק'
                )}
              </button>
            </div>
          </div>

          {/* Presets */}
          <div>
            <p className="text-xs text-neutral-400 mb-2 font-medium">חיבורים מהירים:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('http://192.168.1.213:8096')}
                className="flex items-center gap-2 p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors cursor-pointer"
              >
                <Wifi className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-xs font-bold truncate">רשת ביתית (WiFi)</div>
                  <div className="text-[10px] text-neutral-400 font-mono truncate">192.168.1.213:8096</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('http://100.127.161.16:8096')}
                className="flex items-center gap-2 p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors cursor-pointer"
              >
                <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-xs font-bold truncate">Tailscale VPN</div>
                  <div className="text-[10px] text-neutral-400 font-mono truncate">100.127.161.16:8096</div>
                </div>
              </button>
            </div>
          </div>

          {/* Test Status Feedback */}
          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>החיבור לשרת הצליח! ({latency}ms)</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs animate-in fade-in">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>שגיאת חיבור: {errorMessage}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E50914]" />
              מותאם למסך Galaxy S22 Ultra
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-[#E50914] hover:bg-[#b80710] rounded-xl transition-colors shadow-lg shadow-[#E50914]/20 cursor-pointer"
          >
            שמור והתחבר
          </button>
        </div>
      </div>
    </div>
  );
};
