import React, { useState } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import {
  Search,
  Pin,
  VolumeX,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  FileText,
  MoreVertical,
  Download,
  Trash2,
} from 'lucide-react';

interface ChatListProps {
  onExportChat: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ onExportChat }) => {
  const {
    chats,
    activeChatId,
    selectChat,
    togglePinChat,
    toggleMuteChat,
    deleteChat,
  } = useWhatsApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups'>('all');
  const [menuOpenChatId, setMenuOpenChatId] = useState<string | null>(null);

  // Filter chats
  const filteredChats = chats
    .filter((chat) => {
      if (filterType === 'unread' && chat.unreadCount === 0) return false;
      if (filterType === 'groups' && !chat.isGroup) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = chat.name.toLowerCase().includes(query);
        const matchesMsg = chat.messages.some((m) => m.text?.toLowerCase().includes(query));
        return matchesName || matchesMsg;
      }
      return true;
    })
    .sort((a, b) => {
      // Pinned chats stay top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full border-r border-black/5 dark:border-white/10 ios-glass-card shrink-0">
      {/* Search & Filter Header */}
      <div className="p-3.5 space-y-2.5 border-b border-black/5 dark:border-white/10">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari obrolan, kontak, atau pesan..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Segmented Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterType === 'all'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setFilterType('unread')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterType === 'unread'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            Belum Dibaca
          </button>
          <button
            type="button"
            onClick={() => setFilterType('groups')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterType === 'groups'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            Grup
          </button>
        </div>
      </div>

      {/* Chat rows list */}
      <div className="flex-1 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
        {filteredChats.length === 0 ? (
          <div className="py-12 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Tidak ada obrolan yang cocok dengan pencarian.
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const lastMsg = chat.lastMessage;
            const hasAttachment = lastMsg?.attachments && lastMsg.attachments.length > 0;
            const firstAtt = hasAttachment ? lastMsg.attachments![0] : null;

            return (
              <div
                key={chat.id}
                className={`relative group flex items-center gap-3 p-3.5 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-l-2 border-emerald-500'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                onClick={() => selectChat(chat.id)}
              >
                {/* Contact Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="w-11 h-11 rounded-2xl object-cover border border-white/20 shadow-sm"
                  />
                  {!chat.isGroup && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {chat.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                      {lastMsg?.timestamp || ''}
                    </span>
                  </div>

                  {/* Last message preview */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                      {chat.isTyping ? (
                        <span className="text-emerald-500 font-medium animate-pulse">
                          sedang mengetik...
                        </span>
                      ) : (
                        <>
                          {lastMsg?.isOutgoing && (
                            <CheckCheck
                              className={`w-3.5 h-3.5 shrink-0 ${
                                lastMsg.status === 'read' ? 'text-sky-500' : 'text-slate-400'
                              }`}
                            />
                          )}
                          {firstAtt?.type === 'image' && (
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          {firstAtt?.type === 'audio' && (
                            <Mic className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          {firstAtt?.type === 'document' && (
                            <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          )}
                          <span className="truncate">
                            {lastMsg?.text || (firstAtt ? firstAtt.fileName : 'Tidak ada pesan')}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Indicators */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {chat.isMuted && <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                      {chat.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 rotate-45" />}
                      {chat.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold min-w-4 text-center">
                          {chat.unreadCount}
                        </span>
                      )}
                      
                      {/* Context Menu Trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenChatId(menuOpenChatId === chat.id ? null : chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 transition-opacity"
                        aria-label="Opsi obrolan"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dropdown Action Menu */}
                {menuOpenChatId === chat.id && (
                  <div
                    className="absolute right-3 top-10 z-20 w-44 rounded-xl ios-glass-card shadow-xl p-1 text-xs border border-white/20 divide-y divide-black/5 dark:divide-white/5 animate-in fade-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        togglePinChat(chat.id);
                        setMenuOpenChatId(null);
                      }}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200"
                    >
                      <Pin className="w-3.5 h-3.5 text-amber-500" />
                      <span>{chat.isPinned ? 'Lepas Sematan' : 'Sematkan Obrolan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleMuteChat(chat.id);
                        setMenuOpenChatId(null);
                      }}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200"
                    >
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                      <span>{chat.isMuted ? 'Batal Bisukan' : 'Bisukan Obrolan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onExportChat(chat.id);
                        setMenuOpenChatId(null);
                      }}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 text-emerald-600 dark:text-emerald-400 font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ekspor Obrolan Ini</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteChat(chat.id);
                        setMenuOpenChatId(null);
                      }}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Obrolan</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
