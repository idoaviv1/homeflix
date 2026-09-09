import React, { useState, useEffect } from 'react';
import {
  createRootRouteWithContext,
  createRoute,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { Navbar } from '../components/Navbar';
import { MobileNav } from '../components/MobileNav';
import { HomePage } from '../pages/HomePage';
import { AdminPage } from '../pages/AdminPage';
import { OfflinePage } from '../pages/OfflinePage';
import { WatchHistoryPage } from '../pages/WatchHistoryPage';
import { MediaModal } from '../components/MediaModal';
import { VideoPlayer } from '../components/VideoPlayer';
import { SearchOverlay } from '../components/SearchOverlay';
import { AuthModal } from '../components/AuthModal';
import { OfflineBanner } from '../components/OfflineBanner';
import { DeviceSimulator } from '../components/DeviceSimulator';
import { api, type User, type MediaFile, type MediaItem } from '../lib/api';
import { type OfflineMediaItem } from '../lib/offlineStorage';
import { ThemeLanguageProvider, useThemeLanguage } from '../context/ThemeLanguageContext';
import { Smartphone, Shield } from 'lucide-react';

export interface RouterContext {
  queryClient: QueryClient;
}

function MainApp() {
  const { t, language } = useThemeLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [activeNav, setActiveNav] = useState('home');
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  // Online Player state
  const [playerData, setPlayerData] = useState<{
    mediaItemId: string;
    episodeId?: string;
    file: MediaFile;
    title: string;
    subtitle?: string;
    nextEpisode?: any;
    initialTime?: number;
  } | null>(null);

  // Offline Player state
  const [offlinePlayerData, setOfflinePlayerData] = useState<OfflineMediaItem | null>(null);

  // Local PC File Player state (Blob URL from file picker with user permission)
  const [localFilePlayer, setLocalFilePlayer] = useState<{ url: string; title: string } | null>(null);

  // Category browse items (movies / shows / watchlist)
  const [browseItems, setBrowseItems] = useState<MediaItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  useEffect(() => {
    api
      .getMe()
      .then((res) => {
        if (!res.anonymous && res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch category when nav changes
  useEffect(() => {
    if (activeNav === 'movies') {
      setBrowseLoading(true);
      api.listMedia({ type: 'movie' }).then((res) => {
        setBrowseItems(res.items);
        setBrowseLoading(false);
      });
    } else if (activeNav === 'shows') {
      setBrowseLoading(true);
      api.listMedia({ type: 'show' }).then((res) => {
        setBrowseItems(res.items);
        setBrowseLoading(false);
      });
    } else if (activeNav === 'watchlist') {
      setBrowseLoading(true);
      api.getHomeFeed().then((feed) => {
        setBrowseItems(feed.watchlist || []);
        setBrowseLoading(false);
      });
    }
  }, [activeNav]);

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch {
      // Ignore
    }
  };

  const handlePlay = (
    file: MediaFile,
    title: string,
    subtitle?: string,
    nextEpisode?: any,
    initialTime?: number,
  ) => {
    setPlayerData({
      mediaItemId: file.mediaItemId,
      episodeId: file.episodeId,
      file,
      title,
      subtitle,
      nextEpisode,
      initialTime,
    });
    setSelectedMediaId(null);
  };

  const handlePlayOffline = (item: OfflineMediaItem) => {
    setOfflinePlayerData(item);
    setSelectedMediaId(null);
  };

  const handlePlayLocalPCFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const title = file.name.replace(/\.[^/.]+$/, '');
    setLocalFilePlayer({ url, title });
    setSelectedMediaId(null);
  };

  const content = (
    <div className="min-h-dvh bg-[#0F0F0F] text-white flex flex-col">
      {/* Top Navbar */}
      <Navbar
        user={user}
        activeNav={activeNav}
        onNavigate={(page) => setActiveNav(page)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-0">
        {activeNav === 'home' && (
          <HomePage
            user={user}
            onOpenMedia={(id) => setSelectedMediaId(id)}
            onPlay={(file, title, subtitle, initialTime) => handlePlay(file, title, subtitle, undefined, initialTime)}
          />
        )}

        {/* Watch History for logged in users */}
        {activeNav === 'history' && (
          <WatchHistoryPage
            onOpenMedia={(id) => setSelectedMediaId(id)}
            onPlay={(file, title, subtitle, initialTime) =>
              handlePlay(file, title, subtitle, undefined, initialTime)
            }
            onBrowseLibrary={() => setActiveNav('home')}
          />
        )}

        {/* Admin Page - strictly guarded for admin role */}
        {activeNav === 'admin' && (
          user?.role === 'admin' ? (
            <AdminPage />
          ) : (
            <div className="pt-36 pb-24 px-4 max-w-lg mx-auto text-center animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-[#E50914] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-950/40">
                <Shield className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                {t('adminAccessRequired')}
              </h2>
              <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                {t('adminOnlyNotice')}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setActiveNav('home')}
                  className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/10 cursor-pointer"
                >
                  {language === 'he' ? 'חזור לעמוד הבית' : 'Back to Home'}
                </button>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="px-5 py-2.5 rounded-lg bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                >
                  {language === 'he' ? 'התחבר כמנהל' : 'Sign In as Admin'}
                </button>
              </div>
            </div>
          )
        )}

        {activeNav === 'downloads' && (
          <OfflinePage
            onPlayOffline={handlePlayOffline}
            onExploreOnline={() => setActiveNav('home')}
            onPlayLocalFile={handlePlayLocalPCFile}
          />
        )}

        {(activeNav === 'movies' || activeNav === 'shows' || activeNav === 'watchlist') && (
          <div className="max-w-7xl mx-auto px-4 md:px-10 pt-28 pb-16">
            <h1 className="text-3xl font-black mb-6 capitalize">
              {activeNav === 'shows' ? t('shows') : activeNav === 'watchlist' ? t('watchlist') : t('movies')}
            </h1>

            {browseLoading ? (
              <div className="py-20 flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#E50914]" />
              </div>
            ) : browseItems.length === 0 ? (
              <div className="text-center py-20 text-neutral-500">
                <p className="text-lg font-semibold">No items found in this section yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {browseItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedMediaId(item.id)}
                    className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-white/5 cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg"
                  >
                    <img
                      src={item.posterPath || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800'}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-2.5 pt-6 pointer-events-none">
                      {(() => {
                        const isHebrew = language === 'he';
                        const hasHebrew = Boolean(item.titleHe);
                        const englishTitle = item.title || item.originalTitle || '';
                        const hasBothTitles = Boolean(hasHebrew && englishTitle && item.titleHe !== englishTitle);

                        const displayTitle = isHebrew
                          ? (item.titleHe || englishTitle)
                          : (englishTitle || item.titleHe);

                        const displaySubtitle = hasBothTitles
                          ? (isHebrew ? englishTitle : item.titleHe)
                          : null;

                        const titleDir = isHebrew ? (item.titleHe ? 'rtl' : 'ltr') : 'ltr';
                        const subtitleDir = isHebrew ? 'ltr' : 'rtl';

                        return (
                          <>
                            <h4 className="text-sm font-bold text-white line-clamp-1 drop-shadow" dir={titleDir}>
                              {displayTitle}
                            </h4>
                            {displaySubtitle && (
                              <p className="text-[11px] text-neutral-300 line-clamp-1 drop-shadow-sm font-medium mt-0.5" dir={subtitleDir}>
                                {displaySubtitle}
                              </p>
                            )}
                          </>
                        );
                      })()}
                      {item.year && <span className="text-xs text-neutral-400 mt-0.5">{item.year}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeNav={activeNav}
        user={user}
        onNavigate={(nav) => setActiveNav(nav)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* Offline Alert & Quick Switch Banner */}
      <OfflineBanner
        onNavigateToDownloads={() => setActiveNav('downloads')}
        onQuickPlay={handlePlayOffline}
      />

      {/* ─── Overlays & Modals ─── */}
      {selectedMediaId && (
        <MediaModal
          mediaId={selectedMediaId}
          onClose={() => setSelectedMediaId(null)}
          onPlay={(file, title, subtitle, nextEp) => handlePlay(file, title, subtitle, nextEp)}
          onPlayLocalFile={handlePlayLocalPCFile}
        />
      )}

      {/* Online Video Player */}
      {playerData && (
        <VideoPlayer
          mediaItemId={playerData.mediaItemId}
          episodeId={playerData.episodeId}
          title={playerData.title}
          subtitle={playerData.subtitle}
          file={playerData.file}
          initialTime={playerData.initialTime}
          onClose={() => setPlayerData(null)}
          nextEpisode={playerData.nextEpisode}
          onPlayNext={() => {
            if (playerData.nextEpisode) {
              handlePlay(
                playerData.nextEpisode.file,
                playerData.title,
                playerData.nextEpisode.title,
              );
            }
          }}
        />
      )}

      {/* Offline Sandboxed Video Player */}
      {offlinePlayerData && (
        <VideoPlayer
          mediaItemId={offlinePlayerData.mediaItemId}
          episodeId={offlinePlayerData.episodeId}
          title={language === 'he' && offlinePlayerData.titleHe ? offlinePlayerData.titleHe : offlinePlayerData.title}
          offlineItem={offlinePlayerData}
          onClose={() => setOfflinePlayerData(null)}
        />
      )}

      {/* Local PC File Video Player (with user permissions) */}
      {localFilePlayer && (
        <VideoPlayer
          localFileUrl={localFilePlayer.url}
          title={localFilePlayer.title}
          onClose={() => {
            URL.revokeObjectURL(localFilePlayer.url);
            setLocalFilePlayer(null);
          }}
        />
      )}

      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectMedia={(id) => setSelectedMediaId(id)}
      />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(newUser) => setUser(newUser)}
      />

      {/* Floating PC Simulator Launch Dock Button */}
      {!simulatorOpen && (
        <button
          onClick={() => setSimulatorOpen(true)}
          className="fixed bottom-6 right-6 z-40 hidden md:flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#18181b]/90 hover:bg-[#27272a] text-white border border-white/20 shadow-2xl backdrop-blur-xl hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold text-xs"
          title={language === 'he' ? 'פתח סימולטור נייד (iPhone / iPad)' : 'Open Mobile Simulator (iPhone / iPad)'}
        >
          <Smartphone className="w-4 h-4 text-[#E50914]" />
          <span>{language === 'he' ? 'סימולטור iPhone / iPad' : 'iPhone & iPad Simulator'}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}
    </div>
  );

  return (
    <DeviceSimulator isOpen={simulatorOpen} onClose={() => setSimulatorOpen(false)}>
      {content}
    </DeviceSimulator>
  );
}

// Root layout
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <ThemeLanguageProvider>
      <MainApp />
    </ThemeLanguageProvider>
  ),
});

// Home route
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => null,
});

// Route tree
export const routeTree = rootRoute.addChildren([homeRoute]);

