import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Subtitles,
  Check,
  HardDrive,
  Sparkles,
  Film,
  AlertCircle,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { offlineStorage } from '../lib/offlineStorage';
import type { MediaFile } from '../lib/api';

export interface SubtitlePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItemId: string;
  episodeId?: string;
  title: string;
  titleHe?: string;
  originalTitle?: string;
  year?: number;
  overview?: string;
  posterPath?: string;
  file: MediaFile;
  onDownloadStarted?: (downloadId: string) => void;
}

export function SubtitlePickerModal({
  isOpen,
  onClose,
  mediaItemId,
  episodeId,
  title,
  titleHe,
  originalTitle,
  year,
  overview,
  posterPath,
  file,
  onDownloadStarted,
}: SubtitlePickerModalProps) {
  const { t, language, isRtl, showToast } = useThemeLanguage();

  // All subtitle tracks from media file
  const availableSubtitles = useMemo(() => {
    return (file.subtitleStreams || []).map((sub, idx) => {
      const streamIdx = typeof sub.index === 'number' ? sub.index : idx;
      const lang = (sub.language || 'und').toLowerCase();
      const title = sub.title || (lang === 'heb' || lang === 'he' ? 'עברית' : lang === 'eng' || lang === 'en' ? 'English' : `כתוביות ${idx + 1}`);
      const isHebrew = lang === 'heb' || lang === 'he' || title.toLowerCase().includes('hebrew') || title.includes('עברית');
      const isEnglish = lang === 'eng' || lang === 'en' || title.toLowerCase().includes('english') || title.toLowerCase().includes('eng');
      
      return {
        streamIndex: streamIdx,
        language: lang,
        title,
        isHebrew,
        isEnglish,
        isDefault: sub.isDefault || isHebrew,
      };
    });
  }, [file.subtitleStreams]);

  // Default selection: Hebrew and English are selected by default as requested!
  const [selectedIndices, setSelectedIndices] = useState<number[]>(() => {
    const defaults = availableSubtitles
      .filter((sub) => sub.isHebrew || sub.isEnglish || sub.isDefault)
      .map((sub) => sub.streamIndex);
    // If none matched hebrew/english, pick first 2
    if (defaults.length === 0 && availableSubtitles.length > 0) {
      return availableSubtitles.slice(0, 2).map((s) => s.streamIndex);
    }
    return defaults;
  });

  const [starting, setStarting] = useState(false);

  if (!isOpen) return null;

  const toggleSubtitle = (streamIndex: number) => {
    setSelectedIndices((prev) =>
      prev.includes(streamIndex) ? prev.filter((i) => i !== streamIndex) : [...prev, streamIndex]
    );
  };

  const handleStartDownload = async () => {
    try {
      setStarting(true);
      const downloadId = await offlineStorage.startDownload({
        mediaItemId,
        episodeId,
        fileId: file.id,
        title,
        titleHe,
        originalTitle,
        year,
        overview,
        duration: file.duration,
        posterPath,
        filename: file.fileName || `${title}.mp4`,
        selectedSubtitleIndices: selectedIndices,
        availableSubtitles,
      });

      showToast(
        language === 'he'
          ? 'ההורדה החלה! הסרט והכתוביות נשמרים ישירות בתוך האפליקציה'
          : 'Download started! Movie and subtitles are saving to in-app storage',
        'success'
      );

      onDownloadStarted?.(downloadId);
      onClose();
    } catch (err: any) {
      console.error('Failed to start in-app download:', err);
      showToast(err.message || 'Error starting download', 'error');
    } finally {
      setStarting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    return offlineStorage.formatBytes(bytes);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 select-none animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh] animate-modal-sheet">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-[#191919]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E50914]/20 border border-[#E50914]/30 text-[#E50914]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold">
                {language === 'he' ? 'הורדה פנימית לאפליקציה' : 'In-App Sandbox Download'}
              </h2>
              <p className="text-xs text-neutral-400">
                {language === 'he' ? 'שמירה לצפייה אופליין ללא אינטרנט' : 'Save for offline viewing without internet'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Movie Summary Card */}
          <div className="flex gap-3.5 p-3 rounded-xl bg-white/[0.04] border border-white/10">
            {posterPath && (
              <img
                src={posterPath}
                alt={title}
                className="w-16 h-24 object-cover rounded-lg flex-shrink-0 shadow-md"
              />
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="text-sm font-bold text-white truncate">
                {language === 'he' && titleHe ? titleHe : title}
              </h3>
              {year && <span className="text-xs text-neutral-400 mt-0.5">{year}</span>}
              <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-400 font-mono">
                {file.fileSize && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-neutral-200">
                    {file.fileSize}
                  </span>
                )}
                {file.width && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {file.width >= 3840 ? '4K' : file.width >= 1920 ? '1080p' : `${file.width}p`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Privacy & Sandbox Notice */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300/90 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <span className="font-semibold block text-emerald-300">
                {language === 'he' ? 'הורדה מוגנת בתוך האפליקציה' : 'App-Sandboxed Storage'}
              </span>
              <span className="text-[11px] text-neutral-300">
                {language === 'he'
                  ? 'הקובץ נשמר בתוך זיכרון האפליקציה בלבד (לא קופץ פופ-אפ של ספארי ולא נשמר בקבצים חיצוניים). תוכל לראות אותו תמיד בלשונית "הורדות" גם ללא קליטה או אינטרנט.'
                  : 'Files are saved inside the app sandbox. No Safari popups, no external file mess. Available anytime in the Downloads tab offline.'}
              </span>
            </div>
          </div>

          {/* Subtitles Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
                <Subtitles className="w-4 h-4 text-[#E50914]" />
                <span>{language === 'he' ? 'כתוביות מצורפות (עברית ואנגלית כברירת מחדל)' : 'Bundled Subtitles'}</span>
              </div>
              <span className="text-[11px] text-neutral-400">
                {selectedIndices.length} {language === 'he' ? 'נבחרו' : 'selected'}
              </span>
            </div>

            {availableSubtitles.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-neutral-400">
                {language === 'he' ? 'אין רצועות כתוביות פנימיות בקובץ זה' : 'No internal subtitle streams detected in this file'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {availableSubtitles.map((sub) => {
                  const isChecked = selectedIndices.includes(sub.streamIndex);
                  return (
                    <div
                      key={sub.streamIndex}
                      onClick={() => toggleSubtitle(sub.streamIndex)}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isChecked
                          ? 'bg-[#E50914]/15 border-[#E50914]/40 text-white'
                          : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-[#E50914] border-[#E50914] text-white'
                              : 'border-white/30 bg-black/40'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-medium truncate">
                          {sub.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {sub.isHebrew && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                            עברית
                          </span>
                        )}
                        {sub.isEnglish && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                            English
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-neutral-500 uppercase">
                          {sub.language}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#181818] border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {language === 'he' ? 'ביטול' : 'Cancel'}
          </button>
          <button
            onClick={handleStartDownload}
            disabled={starting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>
              {starting
                ? language === 'he'
                  ? 'מכין הורדה...'
                  : 'Preparing...'
                : language === 'he'
                ? 'התחל הורדה למכשיר'
                : 'Start In-App Download'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
