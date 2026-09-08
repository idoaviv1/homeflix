import React, { useState, useEffect } from 'react';
import { WifiOff, Film, ChevronRight, X, Sparkles, DownloadCloud } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { offlineStorage, type OfflineMediaItem } from '../lib/offlineStorage';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export interface OfflineBannerProps {
  onNavigateToDownloads: () => void;
  onQuickPlay?: (item: OfflineMediaItem) => void;
}

export function OfflineBanner({ onNavigateToDownloads, onQuickPlay }: OfflineBannerProps) {
  const { isOffline, isSimulated } = useNetworkStatus();
  const { language } = useThemeLanguage();
  const [offlineItems, setOfflineItems] = useState<OfflineMediaItem[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setIsDismissed(false);
      offlineStorage.getOfflineItems().then((items) => {
        setOfflineItems(items);
      });
    }
  }, [isOffline]);

  if (!isOffline || isDismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 rounded-2xl bg-[#1c1c1e]/95 backdrop-blur-xl border border-amber-500/30 shadow-2xl shadow-black/80 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0 animate-pulse">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">
                  {language === 'he' ? 'אין חיבור לאינטרנט' : 'No Internet Connection'}
                </h4>
                {isSimulated && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                    {language === 'he' ? 'סימולציה' : 'Simulated'}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-300 mt-0.5">
                {offlineItems.length > 0
                  ? language === 'he'
                    ? `נמצאו ${offlineItems.length} סרטים שמורים במכשיר שזמינים לצפייה עכשיו`
                    : `${offlineItems.length} downloaded movies available for offline playback`
                  : language === 'he'
                  ? 'המכשיר אינו מחובר לרשת. עבור להורדות לצפייה בקבצים שמורים'
                  : 'Device is offline. Go to Downloads to view saved media.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick horizontal preview of downloaded posters if available */}
        {offlineItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
            {offlineItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (onQuickPlay) {
                    onQuickPlay(item);
                  } else {
                    onNavigateToDownloads();
                  }
                }}
                className="group relative w-12 h-16 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0 border border-white/10 hover:scale-105 transition-transform cursor-pointer"
                title={language === 'he' && item.titleHe ? item.titleHe : item.title}
              >
                {item.posterDataUrl ? (
                  <img src={item.posterDataUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-600">
                    <Film className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {offlineItems.length > 4 && (
              <div
                onClick={onNavigateToDownloads}
                className="w-12 h-16 rounded-md bg-white/5 border border-white/10 flex flex-col items-center justify-center text-neutral-400 text-xs font-bold flex-shrink-0 cursor-pointer hover:bg-white/10"
              >
                +{offlineItems.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onNavigateToDownloads}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E50914] to-[#b80710] hover:brightness-110 text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>
              {language === 'he' ? 'מעבר לסרטים שהורדו למכשיר' : 'Go to Downloaded Movies'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
