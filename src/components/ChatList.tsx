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
  UserPlus,
  LockOpen,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';

interface ChatListProps {
  onExportChat: (chatId: string) => void;
  onOpenChatMobile?: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({ onExportChat, onOpenChatMobile }) => {
  const {
    chats,
    activeChatId,
    selectChat,
    togglePinChat,
    toggleMuteChat,
    deleteChat,
    startNewChatByPhone,
  } = useWhatsApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups'>('all');
  const [menuOpenChatId, setMenuOpenChatId] = useState<string | null>(null);

  // New phone chat modal state (Anti-Limit)
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [newNameInput, setNewNameInput] = useState('');

  const handleCreateNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhoneInput.trim()) return;
    startNewChatByPhone(newPhoneInput.trim(), newNameInput.trim() || undefined);
    setNewPhoneInput('');
    setNewNameInput('');
    setShowNewChatForm(false);
    onOpenChatMobile?.();
  };

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
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full border-r border-black/5 dark:border-white/10 ios-glass-card shrink-0">
      {/* Search & Filter Header */}
      <div className="p-3.5 space-y-2.5 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari obrolan, kontak, atau pesan..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Start Chat with New Unsaved Number Button */}
          <button
            type="button"
            onClick={() => setShowNewChatForm(!showNewChatForm)}
            className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors shrink-0 flex items-center gap-1 text-xs font-bold"
            title="Chat Nomor Baru (Anti-Limit Warmup)"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden lg:inline">Nomor Baru</span>
          </button>
        </div>

        {/* Inline New Unsaved Contact Form (Anti-Limit) */}
        {showNewChatForm && (
          <form
            onSubmit={handleCreateNewChat}
            className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Chat Nomor Baru (Anti-Limit Handshake)
              </span>
              <button
                type="button"
                onClick={() => setShowNewChatForm(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="text"
              value={newPhoneInput}
              onChange={(e) => setNewPhoneInput(e.target.value)}
              placeholder="Nomor WA (cth: 08123456789 / 62812...)"
              className="w-full px-3 py-1.5 rounded-xl bg-black/20 border border-white/15 text-xs text-white placeholder-slate-400 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <input
              type="text"
              value={newNameInput}
              onChange={(e) => setNewNameInput(e.target.value)}
              placeholder="Nama tampilan (opsional)"
              className="w-full px-3 py-1.5 rounded-xl bg-black/20 border border-white/15 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <button
              type="submit"
              className="w-full py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-sm transition-colors"
            >
              Buka Ruang Chat Aman
            </button>
          </form>
        )}

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
            Semua ({chats.length})
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
          <div className="py-12 px-6 text-center space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {chats.length === 0
                ? 'Belum ada riwayat obrolan yang masuk dari WhatsApp Anda, atau sedang menyinkronkan pesan.'
                : 'Tidak ada obrolan yang cocok dengan pencarian.'}
            </p>
            <button
              type="button"
              onClick={() => setShowNewChatForm(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Mulai Chat ke Nomor Baru</span>
            </button>
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
                onClick={() => {
                  selectChat(chat.id);
                  onOpenChatMobile?.();
                }}
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
                          {lastMsg?.isViewOnce && (
                            <LockOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          {firstAtt?.type === 'image' && (
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          {firstAtt?.type === 'video' && (
                            <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          {firstAtt?.type === 'audio' && (
                            <Mic className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          {firstAtt?.type === 'document' && (
                            <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          )}
                          <span className="truncate">
                            {lastMsg?.text || (firstAtt ? firstAtt.fileName : 'Ketuk untuk mengirim pesan')}
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
