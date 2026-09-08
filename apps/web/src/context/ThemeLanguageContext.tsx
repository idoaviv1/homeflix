import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'he' | 'en';
export type Theme = 'dark' | 'light';

export interface Translations {
  [key: string]: {
    he: string;
    en: string;
  };
}

export const TRANSLATIONS: Translations = {
  // Navigation
  home: { he: 'בית', en: 'Home' },
  movies: { he: 'סרטים', en: 'Movies' },
  shows: { he: 'סדרות', en: 'TV Shows' },
  watchlist: { he: 'הרשימה שלי', en: 'My List' },
  admin: { he: 'ניהול', en: 'Admin' },
  signIn: { he: 'התחבר', en: 'Sign In' },
  signOut: { he: 'התנתק', en: 'Sign Out' },
  downloads: { he: 'מנהל הורדות', en: 'Downloads' },
  search: { he: 'חיפוש', en: 'Search' },
  searchPlaceholder: { he: 'חפש סרטים, סדרות, שחקנים...', en: 'Search movies, TV shows, actors...' },

  // Themes & Languages
  darkMode: { he: 'מצב כהה', en: 'Dark Mode' },
  lightMode: { he: 'מצב בהיר', en: 'Light Mode' },
  switchTheme: { he: 'החלף עיצוב (בהיר/כהה)', en: 'Toggle Theme (Light/Dark)' },
  switchLanguage: { he: 'Switch to English', en: 'עבור לעברית' },

  // Hero Actions
  playLocal: { he: 'נגן קובץ מקומי', en: 'Play Local File' },
  watchOnline: { he: 'צפייה ישירה', en: 'Watch Online' },
  moreInfo: { he: 'פרטים נוספים', en: 'More Details' },
  inWatchlist: { he: 'ברשימה שלי', en: 'In Watchlist' },
  addToWatchlist: { he: 'הוסף לרשימה', en: 'Add to List' },
  download: { he: 'הורדה', en: 'Download' },
  scanLibrary: { he: 'סריקת ספרייה', en: 'Scan Library' },
  scanning: { he: 'סורק קבצים...', en: 'Scanning files...' },

  // Feed Categories
  continueWatching: { he: 'המשך צפייה', en: 'Continue Watching' },
  inLibrary: { he: 'בספרייה המקומית שלך', en: 'In Your Library' },
  trendingMovies: { he: 'סרטים חמים ועכשיויים', en: 'Trending Movies' },
  trendingShows: { he: 'סדרות טלוויזיה מובילות', en: 'Trending TV Series' },
  topRated: { he: 'סרטי המופת המדורגים ביותר', en: 'Top Rated Movies' },
  actionMovies: { he: 'אקשן, שובר קופות והרפתקאות', en: 'Action & Adventure' },
  scifiMovies: { he: 'מדע בדיוני ופנטזיה', en: 'Sci-Fi & Fantasy Hits' },
  comedyMovies: { he: 'קומדיות מומלצות', en: 'Comedy Hits' },
  animationMovies: { he: 'אנימציה וקולנוע לכל המשפחה', en: 'Animation & Family' },
  thrillerMovies: { he: 'מתח, אימה ומסתורין', en: 'Thriller & Horror' },
  popularShows: { he: 'סדרות בינג׳ ממכרות', en: 'Binge-Worthy Series' },
  myList: { he: 'הרשימה שלי', en: 'My List' },
  watchHistory: { he: 'היסטוריית צפייה', en: 'Watch History' },
  resumeWatching: { he: 'המשך צפייה', en: 'Resume' },
  stoppedAtMinute: { he: 'נעצר בדקה', en: 'Stopped at min' },
  ofMinutes: { he: 'מתוך', en: 'of' },
  minutesShort: { he: "דק'", en: 'min' },
  completed: { he: 'נצפה במלואו', en: 'Completed' },
  noWatchHistory: {
    he: 'אין היסטוריית צפייה עדיין. התחל לצפות בסרט או סדרה כדי לשמור את ההתקדמות שלך!',
    en: 'No watch history yet. Start watching a movie or show to track your progress!',
  },
  adminAccessRequired: { he: 'גישה מוגבלת למנהלי מערכת בלבד', en: 'Access restricted to administrators only' },
  adminOnlyNotice: {
    he: 'מסך הניהול זמין אך ורק לחשבון מנהל המערכת. התחבר עם חשבון מנהל כדי לנהל את השרת.',
    en: 'The admin dashboard is available exclusively to the administrator account. Please sign in with an admin account.',
  },
  lastWatched: { he: 'נצפה לאחרונה', en: 'Last watched' },

  // Modals & Details
  episodes: { he: 'פרקים', en: 'Episodes' },
  season: { he: 'עונה', en: 'Season' },
  episode: { he: 'פרק', en: 'Episode' },
  trailer: { he: 'טריילר', en: 'Trailer' },
  server: { he: 'שרת', en: 'Server' },
  close: { he: 'סגור', en: 'Close' },
  synopsis: { he: 'תקציר', en: 'Synopsis' },
  cast: { he: 'שחקנים', en: 'Cast' },
  rating: { he: 'דירוג', en: 'Rating' },
  year: { he: 'שנה', en: 'Year' },
  match: { he: 'התאמה', en: 'Match' },
  isFavorite: { he: 'מועדף', en: 'Favorited' },
  addToFavorites: { he: 'הוסף למועדפים', en: 'Add to Favorites' },
  removeFromWatchlist: { he: 'הסר מהרשימה שלי', en: 'Remove from My List' },
  noSynopsis: { he: 'אין תקציר זמין עבור כותר זה.', en: 'No synopsis available for this title.' },
  inMyLibrary: { he: 'בספרייה שלי', en: 'In My Library' },
  discover: { he: 'גלה עוד', en: 'Discover' },
  notInLibrary: { he: 'לא בספרייה', en: 'Not in Library' },
  noResultsFor: { he: 'לא נמצאו תוצאות עבור', en: 'No results found for' },
  searchHint: {
    he: 'נסה לחפש לפי שם מקורי באנגלית, כתיב שונה או שנת יציאה.',
    en: 'Try searching by original title, alternative spelling, or release year.',
  },

  // Stream Player
  onlineStreaming: { he: 'צפייה ישירה • נגן רשת', en: 'Online Streaming • Web Player' },
  activeStream: { he: 'הזרמה פעילה', en: 'Stream Active' },
  changeServer: { he: 'החלף שרת הזרמה', en: 'Switch Stream Server' },
  connectingToServer: { he: 'מתחבר לשרת', en: 'Connecting to server' },
  loadingStream: { he: 'טוען זרם וידאו משרת', en: 'Loading video stream from' },
  loading: { he: 'טעינה', en: 'Loading' },
  openPlayerDirectly: { he: 'הצג נגן ישירות', en: 'Show Player Now' },
  switchToFastServer: { he: 'מעבר לשרת VidSrc המהיר', en: 'Switch to Fast VidSrc' },
  previousEpisode: { he: 'פרק קודם', en: 'Previous Episode' },
  nextEpisode: { he: 'פרק הבא', en: 'Next Episode' },
  closePlayer: { he: 'סגור נגן', en: 'Close Player' },
  serverWarning: {
    he: 'שים לב: שרת זה חווה כרגע עומס עולמי אצל הספק. מומלץ להשתמש ב-VidSrc Fast',
    en: 'Note: This server is experiencing upstream delays. VidSrc Fast is recommended.',
  },

  // Dynamic Truthful Statuses
  streamConnecting: { he: 'מתחבר...', en: 'Connecting...' },
  streamLoading: { he: 'טוען נגן...', en: 'Loading player...' },
  streamSlow: { he: 'טעינה איטית', en: 'Slow Loading' },
  streamStuck: { he: 'השרת תקוע', en: 'Server Stuck' },
  streamReady: { he: 'מוכן לצפייה', en: 'Stream Ready' },
  switchServerNow: { he: 'החלף שרת כעת', en: 'Switch Server Now' },
  nextServer: { he: 'השרת הבא', en: 'Next Server' },
  reloadPlayer: { he: 'רענן נגן', en: 'Reload Player' },
  serverUnresponsiveNotice: {
    he: 'השרת אינו מגיב בזמן (מעל 10 שניות). מומלץ להחליף שרת:',
    en: 'Server is taking too long to respond (>10s). Switch server:',
  },

  // Downloads Drawer & Modal
  downloadsManager: { he: 'מנהל ההורדות של השרת', en: 'Server Download Manager' },
  backgroundDownloads: { he: 'הורדות ברקע ישירות לדיסק', en: 'Background downloads directly to storage' },
  rdFast: { he: 'מחובר (מהירות שיא)', en: 'Connected (High Speed)' },
  rdNotConfigured: { he: 'לא מוגדר (הורדת P2P רגילה)', en: 'Not Configured (Standard P2P)' },
  edit: { he: 'ערוך', en: 'Edit' },
  setup: { he: 'הגדר', en: 'Setup' },
  enterRdToken: { he: 'הכנס Real-Debrid API Token', en: 'Enter Real-Debrid API Token' },
  save: { he: 'שמור', en: 'Save' },
  cancel: { he: 'ביטול', en: 'Cancel' },
  saving: { he: 'שומר...', en: 'Saving...' },
  noDownloads: { he: 'אין הורדות כרגע', en: 'No active downloads' },
  startDownloadHint: {
    he: 'חפש סרט ולחץ על "הורדה" כדי להוריד ישירות לשרת',
    en: 'Search for a movie and click Download to save directly to server',
  },
  statusDownloading: { he: 'מוריד', en: 'Downloading' },
  statusCompleted: { he: 'הושלם', en: 'Completed' },
  statusFailed: { he: 'נכשל', en: 'Failed' },
  statusCancelled: { he: 'בוטל', en: 'Cancelled' },
  statusQueued: { he: 'בתור', en: 'Queued' },
  cancelDownload: { he: 'בטל הורדה', en: 'Cancel download' },
  downloadMovieTitle: { he: 'הורדת סרט ישירות לשרת', en: 'Download Movie to Server' },
  chooseVersion: { he: 'בחר גרסה להורדה לאחסון', en: 'Choose version to download to storage' },
  downloadStarted: { he: 'ההורדה החלה בהצלחה!', en: 'Download started successfully!' },
  downloadStartedDesc: {
    he: 'הקובץ מורד כעת ברקע על ידי מנוע aria2 ישירות לתיקיית המדיה שלך. בסיום ההורדה הסרט יופיע אוטומטית בספרייה.',
    en: 'The file is downloading in the background via aria2 directly to your media storage. It will appear in your library automatically when finished.',
  },
  downloadNoticeWeb: { he: 'שים לב: צפייה אופליין באתר אינטרנט', en: 'Notice: Offline Viewing on Web' },
  downloadNoticeWebDesc: {
    he: 'הורדה פנימית לצפייה אופליין (ללא חיבור לאינטרנט) מיועדת לאפליקציית הטלפון (iPhone / iPad). בדפדפן במחשב לא מתבצעת שמירה פנימית של הסרט.',
    en: 'In-app offline download (without internet) is designed for the mobile app (iPhone / iPad). In the web browser, movies are not saved for offline playback.',
  },
  pickAndPlayPC: { he: 'פתח קובץ מהמחשב ונגן ישירות', en: 'Open & Play File from PC' },
  pickAndPlayPCDesc: {
    he: 'בחר קובץ סרט שכבר הורדת למחשב (באישור הרשאה מהדפדפן) וצפה בו מיידית בנגן של Homeflix באיכות מקסימלית',
    en: 'Select a movie file from your computer (granting permission) and play it directly in Homeflix at full quality',
  },
  downloadVideoFile: { he: 'הורד קובץ וידאו למחשב', en: 'Download Video File to PC' },
  serverDownloadSection: { he: 'הורדה ברקע לאחסון שרת Homeflix (Aria2)', en: 'Background Server Download (Aria2)' },
  serverDownloadDesc: {
    he: 'הורדה זו שומרת את הסרט ישירות באחסון השרת (לא במחשב האישי שלך). בסיום ההורדה הסרט יתווסף אוטומטית לספרייה.',
    en: 'This downloads the movie directly into Homeflix server storage (not your personal PC). It will appear in the library when finished.',
  },
  serverDownloadingStatus: { he: 'הורדה פעילה ברקע בשרת', en: 'Active Background Server Download' },
  gotIt: { he: 'הבנתי, סגור חלון', en: 'Got it, close' },
  scanningSources: { he: 'סורק מאגרים ומאתר גרסאות איכות...', en: 'Scanning sources and locating quality releases...' },
  checkingTorrentio: { he: 'בודק ב-Torrentio ו-YTS', en: 'Searching Torrentio and YTS' },
  noReleasesFound: { he: 'לא נמצאו גרסאות זמינות', en: 'No available releases found' },
  noReleasesDesc: {
    he: 'לא אותרו מקורות תואמים עבור סרט זה. נסה לצפות בצפייה ישירה (Online Stream).',
    en: 'No compatible sources found for this movie. Try watching via Online Stream.',
  },
  foundReleases: { he: 'גרסאות שנמצאו (ממוין לפי איכות ומשתפים)', en: 'Found releases (sorted by quality & seeds)' },
  backgroundNotice: {
    he: 'הורדה ברקע ללא צורך להשאיר דפדפן פתוח',
    en: 'Downloads run in background, no need to keep browser open',
  },
  seeds: { he: 'משתפים', en: 'seeds' },
  source: { he: 'מקור', en: 'Source' },
  starting: { he: 'מפעיל...', en: 'Starting...' },
  downloadToServer: { he: 'הורד לשרת', en: 'Download to Server' },
  storagePathNotice: {
    he: 'הקבצים נשמרים ישירות בתיקיית האחסון של השרת',
    en: 'Files are saved directly to server media storage',
  },
  addedToWatchlist: { he: 'נוסף לרשימת הצפייה שלך', en: 'Added to your Watchlist' },
  removedFromWatchlistToast: { he: 'הוסר מרשימת הצפייה', en: 'Removed from Watchlist' },
  addedToFavoritesToast: { he: 'נוסף למועדפים שלך ❤️', en: 'Added to your Favorites ❤️' },
  removedFromFavoritesToast: { he: 'הוסר מהמועדפים', en: 'Removed from Favorites' },
};

export interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'heart' | 'info' | 'error';
}

interface ThemeLanguageContextType {
  theme: Theme;
  language: Language;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  toggleLanguage: () => void;
  setLanguage: (l: Language) => void;
  t: (key: string, defaultText?: string) => string;
  isRtl: boolean;
  showToast: (message: string, type?: 'success' | 'heart' | 'info' | 'error') => void;
}

const ThemeLanguageContext = createContext<ThemeLanguageContextType | undefined>(undefined);

export function ThemeLanguageProvider({ children }: { children: React.ReactNode }) {
  // 1. Language state: default to English ('en') as requested
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('homeflix_lang');
    if (saved === 'he' || saved === 'en') return saved;
    return 'en';
  });

  // 2. Theme state: default to 'dark'
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('homeflix_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  });

  // 3. Global animated toast notifications
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'heart' | 'info' | 'error' = 'info') => {
    setToast({ id: Date.now(), message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  // Apply Language & Direction
  useEffect(() => {
    localStorage.setItem('homeflix_lang', language);
    const isRtl = language === 'he';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Apply Theme
  useEffect(() => {
    localStorage.setItem('homeflix_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#f8f9fa');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#0a0a0a');
    }
  }, [theme]);

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'he' ? 'en' : 'he'));
  };

  const setLanguage = (l: Language) => {
    setLanguageState(l);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  const t = (key: string, defaultText?: string): string => {
    const entry = TRANSLATIONS[key];
    if (!entry) return defaultText || key;
    return entry[language] || defaultText || key;
  };

  return (
    <ThemeLanguageContext.Provider
      value={{
        theme,
        language,
        toggleTheme,
        setTheme,
        toggleLanguage,
        setLanguage,
        t,
        isRtl: language === 'he',
        showToast,
      }}
    >
      {children}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-toast-in">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#181818]/95 backdrop-blur-2xl border border-white/20 text-white text-xs md:text-sm font-semibold shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
            {toast.type === 'heart' && (
              <span className="text-base animate-heart-burst inline-flex items-center justify-center">
                ❤️
              </span>
            )}
            {toast.type === 'success' && (
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs font-bold animate-check-pop">
                ✓
              </span>
            )}
            {toast.type === 'info' && (
              <span className="text-amber-400 text-sm">✨</span>
            )}
            {toast.type === 'error' && (
              <span className="text-red-400 text-sm">✕</span>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </ThemeLanguageContext.Provider>
  );
}

export function useThemeLanguage() {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error('useThemeLanguage must be used within a ThemeLanguageProvider');
  }
  return context;
}
