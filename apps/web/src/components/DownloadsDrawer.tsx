import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Key,
  HardDrive,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api, type DownloadJob } from '../lib/api';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export interface DownloadsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadsDrawer({ isOpen, onClose }: DownloadsDrawerProps) {
  const { t, isRtl } = useThemeLanguage();
  const [downloads, setDownloads] = useState<DownloadJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [rdSettings, setRdSettings] = useState<{ hasRealDebrid: boolean; maskedKey: string | null }>({
    hasRealDebrid: false,
    maskedKey: null,
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  const fetchJobs = () => {
    api
      .getDownloads()
      .then((data) => {
        setDownloads(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch downloads', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchJobs();
    api
      .getDownloadSettings()
      .then((data) => {
        setRdSettings(data || { hasRealDebrid: false, maskedKey: null });
      })
      .catch((err) => {
        console.error('Failed to fetch download settings', err);
        setRdSettings({ hasRealDebrid: false, maskedKey: null });
      });

    const interval = setInterval(fetchJobs, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleCancel = async (id: string) => {
    try {
      await api.cancelDownload(id);
      fetchJobs();
    } catch (err) {
      console.error('Failed to cancel download', err);
    }
  };

  const handleSaveRdKey = async () => {
    try {
      setSavingKey(true);
      await api.updateDownloadSettings({ realDebridApiKey: newKey });
      const updated = await api.getDownloadSettings();
      setRdSettings(updated || { hasRealDebrid: false, maskedKey: null });
      setShowKeyInput(false);
      setNewKey('');
    } catch (err) {
      console.error('Failed to save RD key', err);
    } finally {
      setSavingKey(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex ${
        isRtl ? 'justify-start' : 'justify-end'
      } animate-in fade-in select-none`}
    >
      <div
        className={`w-full max-w-md bg-[#161616] ${
          isRtl ? 'border-r' : 'border-l'
        } border-white/10 h-full flex flex-col shadow-2xl text-white`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a1a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#E50914]/20 border border-[#E50914]/30 text-[#E50914]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">{t('downloadsManager')}</h2>
              <p className="text-[11px] text-neutral-400">{t('backgroundDownloads')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real-Debrid Card */}
        <div className="p-3 m-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-neutral-200">Real-Debrid:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  rdSettings?.hasRealDebrid
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {rdSettings?.hasRealDebrid ? t('rdFast') : t('rdNotConfigured')}
              </span>
            </div>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Key className="w-3 h-3" />
              {rdSettings?.hasRealDebrid ? t('edit') : t('setup')}
            </button>
          </div>

          {showKeyInput && (
            <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2">
              <input
                type="password"
                placeholder={t('enterRdToken')}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowKeyInput(false)}
                  className="px-2.5 py-1 rounded text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSaveRdKey}
                  disabled={savingKey || !newKey.trim()}
                  className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold text-[11px] cursor-pointer"
                >
                  {savingKey ? t('saving') : t('save')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Downloads List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && downloads.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">{t('loading')}...</div>
          ) : downloads.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <HardDrive className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-xs font-semibold text-neutral-400">{t('noDownloads')}</p>
              <p className="text-[11px] text-neutral-600">
                {t('startDownloadHint')}
              </p>
            </div>
          ) : (
            downloads.map((job) => {
              const isCompleted = job.status === 'completed';
              const isFailed = job.status === 'failed' || job.status === 'cancelled';
              const isDownloading = job.status === 'downloading' || job.status === 'queued';

              return (
                <div
                  key={job.id}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2"
                >
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{job.title}</span>
                        {job.year && <span className="text-[11px] text-neutral-400">({job.year})</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-400">
                        <span className="px-1.5 py-0.2 rounded bg-white/10 text-neutral-300 font-mono">
                          {job.quality || '1080p'}
                        </span>
                        {job.totalSize && <span>{job.totalSize}</span>}
                        {isDownloading && (
                          <span className="text-emerald-400 font-medium">{job.downloadSpeed}</span>
                        )}
                        {isDownloading && job.eta && <span>ETA: {job.eta}</span>}
                      </div>
                    </div>

                    {/* Status Pill or Cancel */}
                    <div className="flex items-center gap-1">
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('statusCompleted')}
                        </span>
                      ) : isFailed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">
                          {job.status === 'cancelled' ? t('statusCancelled') : t('statusFailed')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCancel(job.id)}
                          className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                          title={t('cancelDownload')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-400' : isFailed ? 'bg-red-400' : 'bg-[#E50914]'
                        }`}
                        style={{ width: `${Math.max(2, job.progress)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span>{job.progress}%</span>
                      {job.downloadedSize && <span>{job.downloadedSize}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#111] border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
          <span>{t('storagePathNotice')}</span>
          <button onClick={fetchJobs} className="hover:text-white flex items-center gap-1 text-[10px] cursor-pointer">
            <RefreshCw className="w-3 h-3" /> {t('reloadPlayer')}
          </button>
        </div>
      </div>
    </div>
  );
}
