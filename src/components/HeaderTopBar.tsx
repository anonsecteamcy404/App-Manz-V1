import React from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import {
  MessageSquare,
  CircleDot,
  Phone,
  FolderArchive,
  Laptop,
  DownloadCloud,
  Battery,
  Wifi,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
  EyeOff,
} from 'lucide-react';

export type MainNavTab = 'chats' | 'status' | 'calls' | 'media' | 'mod' | 'devices';

interface HeaderTopBarProps {
  currentTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
}

export const HeaderTopBar: React.FC<HeaderTopBarProps> = ({ currentTab, onTabChange }) => {
  const {
    phoneInfo,
    realUser,
    openExportModal,
    disconnectDevice,
    darkMode,
    setDarkMode,
    chats,
    stories,
    calls,
    modConfig,
  } = useWhatsApp();

  const totalUnread = chats.reduce((acc, c) => acc + c.unreadCount, 0);
  const unreadStories = stories.filter((s) => s.stories.some((item) => !item.seen)).length;
  const missedCalls = calls.filter((c) => c.direction === 'missed').length;

  return (
    <header className="sticky top-0 z-30 w-full ios-glass-header px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-6 border-b border-white/10">
      {/* Top Row on Mobile / Left & Right on Desktop */}
      <div className="w-full md:w-auto flex items-center justify-between gap-2.5">
        {/* Zone 1: Brand & Real User Profile Avatar */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
          {realUser?.avatar ? (
            <img
              src={realUser.avatar}
              alt={realUser.name || 'Profil Saya'}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl object-cover border border-white/40 shadow-md shrink-0"
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 fill-white/20" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 leading-tight">
                WhatsApp <span className="text-emerald-500">iGlass</span>
              </span>
              {modConfig.antiBlueTick && (
                <span
                  onClick={() => onTabChange('mod')}
                  className="cursor-pointer hidden sm:inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/30 text-[9px] sm:text-[10px] font-bold"
                  title="Anti Centang Biru Aktif"
                >
                  <EyeOff className="w-2.5 h-2.5" />
                  Stealth ON
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] tabular-nums">
                <Battery className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 inline" /> {phoneInfo.battery}%
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium truncate max-w-[120px] sm:max-w-[150px]">
                <Wifi className="w-3 h-3 text-emerald-500 inline shrink-0" />{' '}
                {realUser?.name || 'Real Terhubung'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Action Icons (hidden on desktop where Zone 3 is on right) */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => openExportModal('instant')}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-bold shadow-md flex items-center gap-1 ios-liquid-btn"
            title="Ekspor Obrolan"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor</span>
          </button>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 sm:p-2 rounded-xl ios-glass-subtle text-slate-700 dark:text-slate-300 ios-liquid-btn"
            title="Ubah tema"
            aria-label="Ubah tema"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
          </button>

          <button
            type="button"
            onClick={disconnectDevice}
            className="p-1.5 sm:p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 ios-liquid-btn"
            title="Putuskan WhatsApp"
            aria-label="Putuskan perangkat"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Zone 2: Liquid Glass Navigation Links (Full width scrollable on mobile, centered on desktop) */}
      <nav className="w-full md:w-auto flex items-center gap-1 md:gap-1.5 p-1 rounded-2xl ios-glass-subtle overflow-x-auto no-scrollbar scroll-smooth">
        <button
          type="button"
          onClick={() => onTabChange('chats')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ios-liquid-btn ${
            currentTab === 'chats'
              ? 'ios-glass-card text-emerald-600 dark:text-emerald-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Obrolan</span>
          {totalUnread > 0 ? (
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center">
              {totalUnread}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('status')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ios-liquid-btn ${
            currentTab === 'status'
              ? 'ios-glass-card text-emerald-600 dark:text-emerald-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CircleDot className="w-3.5 h-3.5" />
          <span>Status</span>
          {unreadStories > 0 ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('calls')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ios-liquid-btn ${
            currentTab === 'calls'
              ? 'ios-glass-card text-emerald-600 dark:text-emerald-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Panggilan</span>
          {missedCalls > 0 ? (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
              {missedCalls}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('media')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ios-liquid-btn ${
            currentTab === 'media'
              ? 'ios-glass-card text-emerald-600 dark:text-emerald-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Media & 1x</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('mod')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 ios-liquid-btn ${
            currentTab === 'mod'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Mod & Anti-Ban</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('devices')}
          className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ios-liquid-btn ${
            currentTab === 'devices'
              ? 'ios-glass-card text-emerald-600 dark:text-emerald-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Perangkat</span>
        </button>
      </nav>

      {/* Zone 3: Desktop Actions (hidden on mobile, shown on md+) */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <a
          href="/api/source-zip"
          download="iGlass-WA-Companion-SourceCode.zip"
          className="px-3 py-2 rounded-2xl ios-glass-subtle hover:bg-white/20 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ios-liquid-btn"
          title="Unduh Full Source Code (.zip)"
        >
          <span>📦 Source Code</span>
        </a>

        <button
          type="button"
          onClick={() => openExportModal('instant')}
          className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 whitespace-nowrap shrink-0 ios-liquid-btn"
        >
          <DownloadCloud className="w-3.5 h-3.5" />
          <span>Ekspor</span>
        </button>

        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-2xl ios-glass-subtle hover:bg-white/20 text-slate-700 dark:text-slate-300 ios-liquid-btn"
          title="Ubah tema mode gelap/terang"
          aria-label="Ubah tema"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        <button
          type="button"
          onClick={disconnectDevice}
          className="p-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/25 ios-liquid-btn"
          title="Putuskan Perangkat Tertaut"
          aria-label="Putuskan perangkat"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
