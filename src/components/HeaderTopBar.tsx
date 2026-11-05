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
} from 'lucide-react';

export type MainNavTab = 'chats' | 'status' | 'calls' | 'media' | 'devices';

interface HeaderTopBarProps {
  currentTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
}

export const HeaderTopBar: React.FC<HeaderTopBarProps> = ({ currentTab, onTabChange }) => {
  const {
    phoneInfo,
    openExportModal,
    disconnectDevice,
    darkMode,
    setDarkMode,
    chats,
    stories,
    calls,
  } = useWhatsApp();

  const totalUnread = chats.reduce((acc, c) => acc + c.unreadCount, 0);
  const unreadStories = stories.filter((s) => s.stories.some((item) => !item.seen)).length;
  const missedCalls = calls.filter((c) => c.direction === 'missed').length;

  return (
    <header className="sticky top-0 z-30 w-full ios-glass-header px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 md:gap-8 transition-colors">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
          <MessageSquare className="w-5 h-5 fill-white/20" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 block leading-tight">
            WhatsApp <span className="text-emerald-500 font-extrabold">iGlass</span>
          </span>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] tabular-nums">
              <Battery className="w-3.5 h-3.5 text-emerald-500 inline" /> {phoneInfo.battery}%
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-[10px]">
              <Wifi className="w-3 h-3 text-emerald-500 inline" /> Terhubung
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: 4-5 single-line clean text navigation links */}
      <nav className="flex items-center gap-1 md:gap-2 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 overflow-x-auto">
        <button
          type="button"
          onClick={() => onTabChange('chats')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
            currentTab === 'chats'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Obrolan</span>
          {totalUnread > 0 ? (
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalUnread}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('status')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
            currentTab === 'status'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
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
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
            currentTab === 'calls'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Panggilan</span>
          {missedCalls > 0 ? (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {missedCalls}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('media')}
          className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
            currentTab === 'media'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Media & Dokumen</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('devices')}
          className={`hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
            currentTab === 'devices'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Perangkat Tertaut</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action + system toggles */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="/api/source-zip"
          download="iGlass-WA-Companion-SourceCode.zip"
          className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-black/5 dark:border-white/10 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          title="Unduh Full Source Code (.zip)"
        >
          <span>📦 Source Code</span>
        </a>

        <button
          type="button"
          onClick={() => openExportModal('instant')}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 whitespace-nowrap shrink-0 transition-all active:scale-95"
        >
          <DownloadCloud className="w-3.5 h-3.5" />
          <span>Ekspor & Cadangan</span>
        </button>

        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/10 transition-colors"
          title="Ubah tema mode gelap/terang"
          aria-label="Ubah tema"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        <button
          type="button"
          onClick={disconnectDevice}
          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors"
          title="Putuskan Perangkat Tertaut"
          aria-label="Putuskan perangkat"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
