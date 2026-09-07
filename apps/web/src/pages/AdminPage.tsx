import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Tv,
  Film,
  FolderSync,
  Settings,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'streams' | 'library' | 'settings'>('overview');
  const [health, setHealth] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Fix match modal state
  const [fixMatchItem, setFixMatchItem] = useState<any | null>(null);
  const [tmdbIdInput, setTmdbIdInput] = useState('');
  const [aliasInput, setAliasInput] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [h, s, str, set] = await Promise.all([
        api.getAdminHealth().catch(() => null),
        api.getAdminSummary().catch(() => null),
        api.getAdminStreams().catch(() => []),
        api.getAdminSettings().catch(() => ({})),
      ]);
      setHealth(h);
      setSummary(s);
      setStreams(str);
      setSettings(set);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerScan = async () => {
    try {
      await api.triggerScan();
      setActionMessage('Library scan triggered!');
      setTimeout(() => setActionMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(`Error triggering scan: ${err.message}`);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear the transcoding cache and metadata cache?')) return;
    try {
      await api.clearCache();
      setActionMessage('Cache cleared successfully!');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(`Error clearing cache: ${err.message}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAdminSettings(settings);
      setActionMessage('Settings saved successfully!');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    }
  };

  const handleFixMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixMatchItem || !tmdbIdInput) return;

    try {
      await api.fixMatch({
        mediaItemId: fixMatchItem.id,
        tmdbId: parseInt(tmdbIdInput, 10),
        type: fixMatchItem.type || 'movie',
        customAlias: aliasInput || undefined,
      });
      setFixMatchItem(null);
      setTmdbIdInput('');
      setAliasInput('');
      setActionMessage('Match updated successfully!');
      setTimeout(() => setActionMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(`Error fixing match: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white p-4 md:p-10 pt-24 max-w-7xl mx-auto">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded text-xs font-black uppercase bg-[#E50914] text-white">
              ADMIN
            </span>
            <span className="text-xs text-neutral-400 font-mono">127.0.0.1:8097</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1">Omflix Server Control</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleTriggerScan}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#E50914] hover:bg-[#b80710] text-sm font-bold shadow-lg shadow-[#E50914]/30 transition-colors"
          >
            <FolderSync className="w-4 h-4" />
            Scan Library
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="my-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4" />
          {actionMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 mt-6 space-x-6">
        {[
          { id: 'overview', label: 'System Overview', icon: Activity },
          { id: 'streams', label: `Active Streams (${streams.length})`, icon: Tv },
          { id: 'library', label: 'Library & Matches', icon: Film },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#E50914] text-white'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: System Overview ─── */}
      {activeTab === 'overview' && (
        <div className="py-8 space-y-8">
          {/* Key Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU */}
            <div className="p-5 rounded-xl bg-neutral-900/60 border border-white/10">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Processor</span>
                <Cpu className="w-5 h-5 text-neutral-300" />
              </div>
              <h3 className="text-lg font-bold text-white truncate">
                {health?.cpu?.model || 'AMD Ryzen 7 9800X3D'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {health?.cpu?.cores || 8} Cores / {health?.cpu?.threads || 16} Threads
              </p>
            </div>

            {/* GPU */}
            <div className="p-5 rounded-xl bg-neutral-900/60 border border-white/10">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Hardware Transcoder</span>
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white truncate">
                {health?.gpu?.name || 'NVIDIA RTX 5070 Ti'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                NVENC H.264 / HEVC / AV1 • Driver {health?.gpu?.driverVersion || '610.57'}
              </p>
            </div>

            {/* RAM */}
            <div className="p-5 rounded-xl bg-neutral-900/60 border border-white/10">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Memory</span>
                <HardDrive className="w-5 h-5 text-neutral-300" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {health?.memory ? `${health.memory.usedGb} / ${health.memory.totalGb} GB` : '48 GB'}
              </h3>
              <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{
                    width: `${health?.memory ? (health.memory.usedGb / health.memory.totalGb) * 100 : 20}%`,
                  }}
                />
              </div>
            </div>

            {/* Media Storage */}
            <div className="p-5 rounded-xl bg-neutral-900/60 border border-white/10">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Storage Space</span>
                <HardDrive className="w-5 h-5 text-neutral-300" />
              </div>
              <h3 className="text-lg font-bold text-white">307 GB Available</h3>
              <p className="text-xs text-neutral-400 mt-1">/media/windows/omflix</p>
            </div>
          </div>

          {/* Library Counts Summary */}
          <div className="p-6 rounded-2xl bg-neutral-900/40 border border-white/10">
            <h3 className="text-base font-bold uppercase tracking-wider text-neutral-300 mb-4">
              Library Inventory
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-white/5">
                <span className="text-xs text-neutral-400 uppercase font-semibold">Movies</span>
                <p className="text-2xl font-black text-white mt-1">{summary?.movies || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-950 border border-white/5">
                <span className="text-xs text-neutral-400 uppercase font-semibold">TV Shows</span>
                <p className="text-2xl font-black text-white mt-1">{summary?.shows || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-950 border border-white/5">
                <span className="text-xs text-neutral-400 uppercase font-semibold">Episodes</span>
                <p className="text-2xl font-black text-white mt-1">{summary?.episodes || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-950 border border-white/5">
                <span className="text-xs text-neutral-400 uppercase font-semibold">Media Files</span>
                <p className="text-2xl font-black text-white mt-1">{summary?.mediaFiles || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Active Streams ─── */}
      {activeTab === 'streams' && (
        <div className="py-8 space-y-4">
          <h3 className="text-lg font-bold text-white">Real-Time Streaming Sessions</h3>
          {streams.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-neutral-900/40 border border-white/10 text-neutral-500">
              <Tv className="w-12 h-12 mx-auto mb-2 text-neutral-600" />
              <p className="text-base font-semibold">No active streams right now</p>
              <p className="text-xs">Streams will appear here as users play movies or episodes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {streams.map((s) => (
                <div
                  key={s.id}
                  className="p-5 rounded-xl bg-neutral-900/80 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-base font-bold text-white">{s.title}</h4>
                    <p className="text-xs text-neutral-400">
                      Viewer: <span className="text-neutral-200">{s.username || 'Anonymous'}</span> • IP:{' '}
                      {s.clientIp}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        s.isTranscoding
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {s.isTranscoding ? `Transcoding (${s.quality})` : 'Direct Play'}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      {s.videoCodec} / {s.audioCodec}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: Library & Matches ─── */}
      {activeTab === 'library' && (
        <div className="py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Unmatched & Manual Matches</h3>
              <p className="text-xs text-neutral-400">
                Fix media files that could not be matched automatically to TMDB.
              </p>
            </div>
            <button
              onClick={handleTriggerScan}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
            >
              Scan Filesystem
            </button>
          </div>

          {summary?.unmatchedItems?.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-neutral-900/40 border border-white/10 text-neutral-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
              <p className="text-base font-semibold text-white">All media items matched</p>
              <p className="text-xs">No unmatched files in the library database.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(summary?.unmatchedItems || []).map((item: any) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-neutral-900/60 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    <span className="text-xs text-neutral-400">{item.year || 'Unknown Year'}</span>
                  </div>
                  <button
                    onClick={() => {
                      setFixMatchItem(item);
                      setAliasInput(item.title);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#E50914] text-xs font-bold hover:bg-[#b80710] transition-colors"
                  >
                    Fix Match
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Fix Match Modal */}
          {fixMatchItem && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-neutral-900 border border-white/20 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-2">Fix Match for "{fixMatchItem.title}"</h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Find the movie on <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="text-[#E50914] underline">themoviedb.org</a> and enter its TMDB numeric ID below.
                </p>

                <form onSubmit={handleFixMatch} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">
                      TMDB ID
                    </label>
                    <input
                      type="number"
                      required
                      value={tmdbIdInput}
                      onChange={(e) => setTmdbIdInput(e.target.value)}
                      placeholder="e.g. 550 for Fight Club"
                      className="w-full px-3 py-2 bg-neutral-950 border border-white/20 rounded-lg text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">
                      Persistent Search Alias
                    </label>
                    <input
                      type="text"
                      value={aliasInput}
                      onChange={(e) => setAliasInput(e.target.value)}
                      placeholder="e.g. filename alias"
                      className="w-full px-3 py-2 bg-neutral-950 border border-white/20 rounded-lg text-sm text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setFixMatchItem(null)}
                      className="px-4 py-2 rounded-lg bg-white/10 text-sm font-semibold hover:bg-white/20"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#E50914] text-sm font-bold hover:bg-[#b80710]"
                    >
                      Save & Link
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: Settings & Maintenance ─── */}
      {activeTab === 'settings' && (
        <div className="py-8 space-y-8 max-w-2xl">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                The Movie Database (TMDB) API Key
              </label>
              <input
                type="text"
                value={settings['TMDB_API_KEY'] || ''}
                onChange={(e) => setSettings({ ...settings, TMDB_API_KEY: e.target.value })}
                placeholder="Enter your TMDB API v3 key"
                className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Enables official metadata, posters, cast, crew, and Hebrew summaries.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                Transcoding Hardware Acceleration
              </label>
              <select
                value={settings['TRANSCODE_HW_ACCEL'] || 'auto'}
                onChange={(e) => setSettings({ ...settings, TRANSCODE_HW_ACCEL: e.target.value })}
                className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]"
              >
                <option value="auto">Auto (Detect NVIDIA NVENC)</option>
                <option value="nvidia">Force NVIDIA NVENC (RTX 5070 Ti)</option>
                <option value="cpu">Force Software / CPU (libx264)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                Prefetch / Prewarm Policy
              </label>
              <select
                value={settings['PREFETCH_POLICY'] || 'balanced'}
                onChange={(e) => setSettings({ ...settings, PREFETCH_POLICY: e.target.value })}
                className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]"
              >
                <option value="off">Off (Save disk space)</option>
                <option value="conservative">Conservative</option>
                <option value="balanced">Balanced (Recommended)</option>
                <option value="aggressive">Aggressive (Pre-generate first 3 segments)</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-[#E50914] text-white font-bold text-sm hover:bg-[#b80710] transition-colors shadow-lg shadow-[#E50914]/30"
            >
              Save Settings
            </button>
          </form>

          {/* Maintenance Actions */}
          <div className="pt-8 border-t border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white">System Maintenance</h3>
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Clear Transcoding & Redis Cache</h4>
                <p className="text-xs text-neutral-400">
                  Frees up disk space in `/media/windows/omflix/transcodes` and refreshes metadata.
                </p>
              </div>
              <button
                onClick={handleClearCache}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
