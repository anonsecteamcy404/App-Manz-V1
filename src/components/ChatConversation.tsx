import React, { useState, useRef, useEffect } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import {
  Phone,
  Video,
  Download,
  Paperclip,
  Smile,
  Send,
  Mic,
  Play,
  Pause,
  FileText,
  Image as ImageIcon,
  CheckCheck,
  ChevronLeft,
  X,
  Eye,
  Zap,
  LockOpen,
  EyeOff,
  ShieldCheck,
  Trash2,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { MediaAttachment } from '../types/whatsapp';
import { triggerFileDownload } from '../utils/exporter';

interface ChatConversationProps {
  onBackMobile?: () => void;
  onExportCurrentChat: () => void;
  onOpenModSettings?: () => void;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  onBackMobile,
  onExportCurrentChat,
  onOpenModSettings,
}) => {
  const {
    activeChat,
    sendMessage,
    reactToMessage,
    startCall,
    modConfig,
    updateModConfig,
    boomStatus,
    startChatBoom,
    stopChatBoom,
  } = useWhatsApp();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewMedia, setPreviewMedia] = useState<MediaAttachment | null>(null);
  const [manuallyUnlockedIds, setManuallyUnlockedIds] = useState<Set<string>>(new Set());

  // Floating iOS Liquid Glass Chat Boom Widget State (per chat)
  const [isFloatingBoomOpen, setIsFloatingBoomOpen] = useState(false);
  const [boomMessageText, setBoomMessageText] = useState('maafin aku');
  const [boomCount, setBoomCount] = useState<number>(5);
  const [boomFeedback, setBoomFeedback] = useState<string | null>(null);

  const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Audio playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeChat?.messages.length, activeChat?.isTyping]);

  // Handle audio playback progress
  useEffect(() => {
    if (!playingAudioId) {
      setAudioProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setAudioProgress((prev) => {
        if (prev >= 100) {
          setPlayingAudioId(null);
          return 0;
        }
        return prev + 5;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [playingAudioId]);

  const startRecording = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
  };

  const cancelRecording = () => {
    setIsRecordingVoice(false);
    clearInterval(recordingTimerRef.current);
    setRecordingSeconds(0);
  };

  const finishRecording = () => {
    setIsRecordingVoice(false);
    clearInterval(recordingTimerRef.current);
    if (!activeChat) return;

    const voiceAttachment: MediaAttachment = {
      id: `vn_${Date.now()}`,
      type: 'audio',
      url: '',
      fileName: `PTT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-WA.opus`,
      fileSize: `${Math.max(32, recordingSeconds * 12)} KB`,
      duration: `0:${recordingSeconds < 10 ? '0' + recordingSeconds : recordingSeconds}`,
      mimeType: 'audio/ogg',
    };

    sendMessage(activeChat.id, '🎤 [Pesan Suara Voice Note]', [voiceAttachment]);
    setRecordingSeconds(0);
  };

  const handleSend = () => {
    if (!inputText.trim() || !activeChat) return;
    sendMessage(activeChat.id, inputText.trim());
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLaunchBoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || !boomMessageText.trim() || boomCount < 1) return;
    setBoomFeedback(null);
    const result = await startChatBoom(activeChat.id, boomMessageText.trim(), boomCount);
    if (!result.success) {
      setBoomFeedback(result.error || 'Gagal menjalankan Boom');
    } else {
      setBoomFeedback(`Boom ${boomCount}x dimulai ke ${activeChat.name}!`);
      setTimeout(() => setBoomFeedback(null), 3000);
    }
  };

  const handleQuickToggleAntiBanInBoom = () => {
    const nextEnabled = !modConfig.antiBanGuard.enabled;
    updateModConfig({
      antiBanGuard: {
        ...modConfig.antiBanGuard,
        enabled: nextEnabled,
        humanTypingSimulation: nextEnabled,
        adaptiveJitterDelay: nextEnabled,
        invisibleZeroWidthVariation: nextEnabled,
        autoWarmupNewContacts: nextEnabled,
      },
    });
  };

  const handleDownloadAttachment = async (att: MediaAttachment) => {
    try {
      setDownloadingAttId(att.id);
      let downloaded = false;

      // 1. Try primary URL (serves decrypted media or fallback)
      if (att.url) {
        try {
          const res = await fetch(att.url);
          if (res.ok) {
            const cType = res.headers.get('content-type') || '';
            if (!cType.includes('text/html')) {
              const blob = await res.blob();
              if (blob.size > 50) {
                triggerFileDownload(blob, att.fileName || `iGlass_Media_${Date.now()}`);
                downloaded = true;
              }
            }
          }
        } catch {}
      }

      // 2. Try thumbnailUrl if full download failed
      if (!downloaded && att.thumbnailUrl) {
        try {
          const res = await fetch(att.thumbnailUrl);
          if (res.ok) {
            const blob = await res.blob();
            if (blob.size > 50) {
              const baseName = (att.fileName || 'iGlass_Media').replace(/\.[^/.]+$/, '');
              triggerFileDownload(blob, `${baseName}_preview.jpg`);
              downloaded = true;
            }
          }
        } catch {}
      }

      if (!downloaded) {
        setDownloadNotice('Media belum selesai didekripsi dari server WhatsApp.');
        setTimeout(() => setDownloadNotice(null), 3500);
      } else {
        setDownloadNotice(`Berhasil mengunduh ${att.fileName}!`);
        setTimeout(() => setDownloadNotice(null), 3000);
      }
    } catch (err) {
      console.error('Download media error:', err);
      setDownloadNotice('Gagal mengunduh berkas media.');
      setTimeout(() => setDownloadNotice(null), 3500);
    } finally {
      setDownloadingAttId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    const objectUrl = URL.createObjectURL(file);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const att: MediaAttachment = {
      id: `upload_${Date.now()}`,
      type: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document',
      url: objectUrl,
      fileName: file.name,
      fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      mimeType: file.type || 'application/octet-stream',
    };
    sendMessage(activeChat.id, file.name, [att], file);
    setShowAttachmentMenu(false);
    e.target.value = '';
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center ios-glass-subtle">
        <div className="w-20 h-20 rounded-3xl ios-glass-card flex items-center justify-center text-emerald-400 mb-5 shadow-2xl animate-liquid-orb">
          <Sparkles className="w-9 h-9" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          WhatsApp iGlass Liquid Pro
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-2 leading-relaxed">
          Pilih salah satu obrolan di sebelah kiri atau klik <strong>Nomor Baru</strong>. Semua fitur Mod awal dalam kondisi <strong>OFF</strong> — Anda dapat menyalakannya sendiri kapan saja di tab <strong>Mod & Anti-Ban</strong> atau lewat tombol <strong>Floating Boom</strong> di setiap ruang chat.
        </p>
      </div>
    );
  }

  const commonEmojis = ['👍', '❤️', '😂', '🔥', '🙏', '🎉', '🚀', '👏', '😍', '✨'];

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50/30 dark:bg-slate-950/30">
      {/* Hidden real file picker */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Ambient Liquid Glass Light Orbs inside Chat */}
      <div className="absolute -top-24 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-liquid-orb" />
      <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none animate-liquid-orb-slow" />

      {/* Chat Top Header */}
      <div className="sticky top-0 z-20 px-4 py-3 ios-glass-header flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBackMobile && (
            <button
              type="button"
              onClick={onBackMobile}
              className="md:hidden p-1.5 -ml-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 ios-liquid-btn"
              aria-label="Kembali ke daftar obrolan"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative shrink-0">
            <img
              src={activeChat.avatar}
              alt={activeChat.name}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%2310b981"/><text x="50" y="58" font-size="32" font-weight="bold" fill="white" font-family="sans-serif" text-anchor="middle">${encodeURIComponent(
                  activeChat.name.slice(0, 2).toUpperCase()
                )}</text></svg>`;
              }}
              className="w-11 h-11 rounded-2xl object-cover border border-white/40 shadow-md"
            />
            {!activeChat.isGroup && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 shadow-xs" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {activeChat.name}
              </h2>
              {modConfig.antiBlueTick && (
                <span
                  onClick={onOpenModSettings}
                  className="cursor-pointer px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/30 text-[10px] font-bold flex items-center gap-1 shrink-0"
                  title="Stealth Anti Centang Biru Aktif"
                >
                  <EyeOff className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">Stealth Biru ON</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeChat.isTyping ? (
                <span className="text-emerald-500 font-semibold animate-pulse">sedang mengetik...</span>
              ) : activeChat.isGroup ? (
                `Grup WhatsApp Multi-Device`
              ) : (
                `+${activeChat.id.split('@')[0]}`
              )}
            </p>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => startCall(activeChat.id, 'audio')}
            className="p-2 rounded-xl ios-glass-subtle hover:bg-white/20 text-slate-700 dark:text-slate-200 ios-liquid-btn"
            title="Panggilan Suara"
            aria-label="Panggilan suara"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => startCall(activeChat.id, 'video')}
            className="p-2 rounded-xl ios-glass-subtle hover:bg-white/20 text-slate-700 dark:text-slate-200 ios-liquid-btn"
            title="Panggilan Video"
            aria-label="Panggilan video"
          >
            <Video className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onExportCurrentChat}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5 ios-liquid-btn"
            title="Ekspor obrolan ini"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          FLOATING iOS LIQUID GLASS CHAT BOOM WIDGET (ALWAYS AVAILABLE IN CHAT)
         ===================================================================== */}
      <div className="absolute right-4 bottom-20 z-30 flex flex-col items-end">
        {isFloatingBoomOpen ? (
          <div className="w-80 sm:w-96 p-4 rounded-3xl ios-liquid-capsule text-white animate-spring-pop space-y-3.5">
            {/* Floating Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/15">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-extrabold tracking-tight text-white flex items-center gap-1.5">
                    <span>Floating Chat Boom</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-[10px] font-mono text-amber-300">
                      iGlass
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-200/80 truncate">
                    Target: <strong>{activeChat.name}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFloatingBoomOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white ios-liquid-btn"
                title="Perkecil Floating Boom"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Active Boom Progress inside Floating Capsule */}
            {boomStatus.isRunning && (
              <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                  <span className="truncate">
                    Mengirim: {boomStatus.sent} / {boomStatus.total}
                  </span>
                  <button
                    type="button"
                    onClick={stopChatBoom}
                    className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-extrabold shadow-sm ios-liquid-btn"
                  >
                    Hentikan
                  </button>
                </div>
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (boomStatus.sent / Math.max(1, boomStatus.total)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Boom Form */}
            <form onSubmit={handleLaunchBoom} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
                  <span>Pesan yang Ingin Di-Boom</span>
                  <span className="text-[10px] text-emerald-300">Otomatis Kirim Beruntun</span>
                </label>
                <input
                  type="text"
                  value={boomMessageText}
                  onChange={(e) => setBoomMessageText(e.target.value)}
                  placeholder="Contoh: maafin aku"
                  className="w-full px-3.5 py-2 rounded-2xl bg-white/10 border border-white/20 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-200">
                    Jumlah Kirim (1 – 100x)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={boomCount}
                    onChange={(e) =>
                      setBoomCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))
                    }
                    className="w-20 px-2.5 py-1 rounded-xl bg-white/15 border border-white/25 text-center font-mono text-xs font-extrabold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* Preset Pills */}
                <div className="flex items-center gap-1.5">
                  {[3, 5, 10, 25, 50].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setBoomCount(cnt)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all ios-liquid-btn ${
                        boomCount === cnt
                          ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-md'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {cnt}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Anti-Ban Toggle inside Floating Boom */}
              <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck
                    className={`w-4 h-4 shrink-0 ${
                      modConfig.antiBanGuard.enabled ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">
                      Proteksi Anti-Ban & Anti-Spam
                    </p>
                    <p className="text-[10px] text-white/65 truncate">
                      {modConfig.antiBanGuard.enabled
                        ? 'Aktif (Jeda Acak + Zero-Width Hash)'
                        : 'Nonaktif (Kirim Cepat Instan)'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickToggleAntiBanInBoom}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                    modConfig.antiBanGuard.enabled ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      modConfig.antiBanGuard.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {boomFeedback && (
                <p className="text-[11px] font-bold text-amber-300 text-center">{boomFeedback}</p>
              )}

              <button
                type="submit"
                disabled={boomStatus.isRunning}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 ios-liquid-btn"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>
                  {boomStatus.isRunning
                    ? `Sedang Mengirim (${boomStatus.sent}/${boomStatus.total})...`
                    : `Kirim "${boomMessageText.slice(0, 14)}" (${boomCount}x)`}
                </span>
              </button>
            </form>
          </div>
        ) : (
          /* Floating Collapsed Liquid Glass Pill */
          <button
            type="button"
            onClick={() => setIsFloatingBoomOpen(true)}
            className="px-4 py-2.5 rounded-full ios-liquid-capsule text-white flex items-center gap-2.5 shadow-2xl ios-liquid-btn group"
            title="Buka Floating Chat Boom untuk kontak ini"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div className="text-left pr-1">
              <span className="text-xs font-extrabold block leading-none tracking-tight">
                {boomStatus.isRunning
                  ? `Boom: ${boomStatus.sent}/${boomStatus.total}`
                  : 'Chat Boom'}
              </span>
              <span className="text-[10px] text-emerald-300 font-medium block mt-0.5">
                {boomStatus.isRunning ? 'Sedang mengirim...' : `Atur & Boom ke ${activeChat.name.split(' ')[0]}`}
              </span>
            </div>
            <ChevronUp className="w-4 h-4 text-white/70" />
          </button>
        )}
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5 pb-24">
        {/* Top Liquid Status Pill */}
        <div className="flex flex-wrap justify-center gap-2 my-1">
          <button
            type="button"
            onClick={onOpenModSettings}
            className="px-4 py-1.5 rounded-full ios-glass-subtle text-[11px] text-slate-700 dark:text-slate-200 text-center flex items-center gap-2 shadow-xs hover:border-emerald-400/50 ios-liquid-btn"
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 ${
                modConfig.antiBlueTick || modConfig.antiViewOnce
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            />
            <span>
              Status Mod:{' '}
              <strong>
                {modConfig.antiBlueTick ||
                modConfig.antiBlueTickOnReply ||
                modConfig.antiViewOnce ||
                modConfig.antiRevokeMessage
                  ? 'Aktif (Kustom)'
                  : 'Semua OFF (Klik untuk menyalakan)'}
              </strong>
            </span>
          </button>
        </div>

        {activeChat.messages.map((msg) => {
          const isOut = msg.isOutgoing;
          const isViewOnceUnlocked =
            !msg.isViewOnce || modConfig.antiViewOnce || manuallyUnlockedIds.has(msg.id);

          return (
            <div
              key={msg.id}
              className={`flex flex-col group ${isOut ? 'items-end' : 'items-start'} animate-spring-pop`}
            >
              <div
                className={`relative max-w-[85%] md:max-w-[68%] p-3.5 rounded-3xl transition-all ${
                  isOut
                    ? 'ios-liquid-bubble-out text-white rounded-br-md'
                    : 'ios-liquid-bubble-in text-slate-900 dark:text-white rounded-bl-md'
                }`}
              >
                {/* Group sender name */}
                {!isOut && activeChat.isGroup && (
                  <div className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 mb-1">
                    {msg.senderName}
                  </div>
                )}

                {/* View Once Header / Manual Unlocker if Mod is currently OFF */}
                {msg.isViewOnce && (
                  <div className="mb-2 px-3 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5">
                      <LockOpen className="w-3.5 h-3.5" />
                      <span>
                        {isViewOnceUnlocked
                          ? 'Media 1x Lihat Terbuka'
                          : 'Pesan Sekali Lihat (1x Lihat)'}
                      </span>
                    </span>
                    {!isViewOnceUnlocked && (
                      <button
                        type="button"
                        onClick={() =>
                          setManuallyUnlockedIds((prev) => new Set(prev).add(msg.id))
                        }
                        className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-extrabold ios-liquid-btn"
                      >
                        Buka Paksa
                      </button>
                    )}
                  </div>
                )}

                {/* Anti-Revoke Badge if sender deleted message */}
                {msg.isRevoked && (
                  <div className="mb-2 px-2.5 py-1 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-600 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {modConfig.antiRevokeMessage
                        ? 'Pesan Dihapus Pengirim (Diselamatkan Anti-Revoke)'
                        : 'Pesan Dihapus'}
                    </span>
                  </div>
                )}

                {/* Media Attachments */}
                {msg.attachments && msg.attachments.length > 0 && isViewOnceUnlocked && (
                  <div className="space-y-2 mb-2">
                    {msg.attachments.map((att) => {
                      if (att.type === 'image') {
                        return (
                          <div
                            key={att.id}
                            className="relative rounded-2xl overflow-hidden group/media border border-white/20"
                          >
                            <img
                              src={att.url}
                              onError={(e) => {
                                if (att.thumbnailUrl && e.currentTarget.src !== att.thumbnailUrl) {
                                  e.currentTarget.src = att.thumbnailUrl;
                                }
                              }}
                              alt={att.fileName}
                              onClick={() => setPreviewMedia(att)}
                              className="w-full max-h-72 object-cover rounded-2xl cursor-pointer transition-transform duration-300 group-hover/media:scale-102"
                            />
                            <div className="absolute top-2 right-2 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewMedia(att)}
                                className="px-2.5 py-1 rounded-xl bg-black/65 hover:bg-black/85 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-md ios-liquid-btn"
                              >
                                <Eye className="w-3 h-3" /> Lihat
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadAttachment(att)}
                                className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-md ios-liquid-btn"
                              >
                                <Download className="w-3 h-3" /> Unduh
                              </button>
                            </div>
                            <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-mono backdrop-blur-xs">
                              {att.isViewOnce ? '1x Lihat · ' : ''}
                              {att.fileSize}
                            </span>
                          </div>
                        );
                      }

                      if (att.type === 'video') {
                        return (
                          <div
                            key={att.id}
                            className="relative rounded-2xl overflow-hidden border border-white/20 bg-black/40 p-2 space-y-2"
                          >
                            <video
                              src={att.url}
                              controls
                              className="w-full max-h-72 rounded-xl"
                            />
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[10px] opacity-85 truncate">
                                {att.isViewOnce ? '🔓 Video 1x Lihat · ' : ''}
                                {att.fileName} ({att.fileSize})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDownloadAttachment(att)}
                                className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 ios-liquid-btn"
                              >
                                <Download className="w-3 h-3" /> Unduh Video
                              </button>
                            </div>
                          </div>
                        );
                      }

                      if (att.type === 'audio') {
                        const isPlaying = playingAudioId === att.id;
                        return (
                          <div
                            key={att.id}
                            className={`p-3 rounded-2xl flex items-center gap-3 border ${
                              isOut
                                ? 'bg-black/15 border-white/25'
                                : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setPlayingAudioId(isPlaying ? null : att.id)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ios-liquid-btn ${
                                isOut
                                  ? 'bg-white text-emerald-700'
                                  : 'bg-emerald-500 text-white'
                              }`}
                            >
                              {isPlaying ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>

                            <div className="flex-1 space-y-1">
                              {att.url ? (
                                <audio src={att.url} controls className="w-full h-8" />
                              ) : (
                                <div className="relative h-6 flex items-center gap-1">
                                  {[30, 60, 45, 90, 75, 40, 85, 95, 60, 40, 70, 80, 50, 65, 85, 45].map(
                                    (height, i) => {
                                      const percentDone = (i / 16) * 100;
                                      const barActive = isPlaying && audioProgress >= percentDone;
                                      return (
                                        <div
                                          key={i}
                                          className={`w-1 rounded-full transition-all duration-150 ${
                                            barActive
                                              ? isOut
                                                ? 'bg-white'
                                                : 'bg-emerald-500'
                                              : isOut
                                              ? 'bg-white/40'
                                              : 'bg-slate-400/40 dark:bg-white/20'
                                          }`}
                                          style={{ height: `${height}%` }}
                                        />
                                      );
                                    }
                                  )}
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[10px] opacity-80">
                                <span>{att.duration || 'Voice Note'}</span>
                                <span className="font-mono">{att.fileSize}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(att)}
                              className="p-1.5 rounded-xl bg-black/20 hover:bg-black/30 ios-liquid-btn"
                              title="Unduh Audio"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      if (att.type === 'document') {
                        return (
                          <div
                            key={att.id}
                            className={`p-3 rounded-2xl flex items-center gap-3 border ${
                              isOut
                                ? 'bg-black/15 border-white/25'
                                : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{att.fileName}</p>
                              <p className="text-[10px] opacity-75">{att.fileSize}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(att)}
                              className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 ios-liquid-btn"
                              title="Unduh dokumen"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}

                {/* Text Content */}
                {msg.text && (
                  <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                )}

                {/* Timestamp & Read Receipt */}
                <div
                  className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                    isOut ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="tabular-nums">{msg.timestamp}</span>
                  {isOut && (
                    <CheckCheck
                      className={`w-3.5 h-3.5 ${
                        msg.status === 'read' ? 'text-sky-200' : 'text-white/65'
                      }`}
                    />
                  )}
                </div>

                {/* Message Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="absolute -bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full ios-glass-card shadow-md text-xs">
                    {msg.reactions.map((r, idx) => (
                      <span key={idx} className="flex items-center gap-0.5">
                        <span>{r.emoji}</span>
                        {r.count > 1 && (
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {r.count}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick reaction hover palette */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full ios-glass-subtle shadow-xs transition-opacity">
                {['👍', '❤️', '😂', '🔥'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => reactToMessage(activeChat.id, msg.id, emoji)}
                    className="hover:scale-125 transition-transform text-xs"
                    title={`Beri reaksi ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Lightbox Preview for Media */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-3xl w-full p-5 ios-glass-card rounded-3xl animate-spring-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{previewMedia.fileName}</span>
                  {previewMedia.isViewOnce && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                      🔓 1x Lihat Terbuka
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-400">{previewMedia.fileSize}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={downloadingAttId === previewMedia.id}
                  onClick={() => handleDownloadAttachment(previewMedia)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 ios-liquid-btn shadow-md"
                >
                  <Download className={`w-4 h-4 ${downloadingAttId === previewMedia.id ? 'animate-bounce' : ''}`} />
                  <span>{downloadingAttId === previewMedia.id ? 'Mengunduh...' : 'Unduh ke Perangkat'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-700 dark:text-white ios-liquid-btn"
                  aria-label="Tutup pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {downloadNotice && (
              <div className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center animate-spring-pop">
                {downloadNotice}
              </div>
            )}

            {previewMedia.type === 'video' ? (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                className="max-h-[70vh] w-auto mx-auto rounded-2xl"
              />
            ) : (
              <img
                src={previewMedia.url}
                onError={(e) => {
                  if (previewMedia.thumbnailUrl && e.currentTarget.src !== previewMedia.thumbnailUrl) {
                    e.currentTarget.src = previewMedia.thumbnailUrl;
                  }
                }}
                alt={previewMedia.fileName}
                className="max-h-[70vh] w-auto mx-auto rounded-2xl object-contain shadow-2xl"
              />
            )}
          </div>
        </div>
      )}

      {/* Quick Attachment Sheet Drawer */}
      {showAttachmentMenu && (
        <div className="p-3 mx-4 mb-2 rounded-3xl ios-glass-card grid grid-cols-2 sm:grid-cols-3 gap-2 animate-spring-pop z-20">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 ios-liquid-btn"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <span>Kirim Foto/Video/Berkas</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAttachmentMenu(false);
              setIsFloatingBoomOpen(true);
            }}
            className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 ios-liquid-btn"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <span>Floating Chat Boom</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeChat && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    sendMessage(
                      activeChat.id,
                      `📍 Lokasi Saya: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`
                    );
                  },
                  () => {
                    sendMessage(activeChat.id, '📍 Lokasi dibagikan dari WhatsApp iGlass');
                  }
                );
              }
              setShowAttachmentMenu(false);
            }}
            className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 ios-liquid-btn"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <span>📍</span>
            </div>
            <span>Bagikan Lokasi GPS</span>
          </button>
        </div>
      )}

      {/* Emoji Drawer */}
      {showEmojiPicker && (
        <div className="p-3 mx-4 mb-2 rounded-3xl ios-glass-card flex items-center gap-2 overflow-x-auto animate-spring-pop z-20">
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setInputText((prev) => prev + emoji)}
              className="text-xl p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Message Composer Bar */}
      <div className="p-3 md:p-4 ios-glass-header border-t border-white/20 z-20">
        {isRecordingVoice ? (
          <div className="flex items-center justify-between gap-4 p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-xs font-bold text-rose-600 dark:text-rose-300">
                Merekam Voice Note (0:{recordingSeconds < 10 ? '0' + recordingSeconds : recordingSeconds})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-3 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 text-xs font-medium text-slate-700 dark:text-slate-300 ios-liquid-btn"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={finishRecording}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md ios-liquid-btn"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-2xl ios-glass-subtle hover:bg-white/20 text-slate-600 dark:text-slate-300 ios-liquid-btn"
              title="Pilih emoji"
              aria-label="Pilih emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="p-2.5 rounded-2xl ios-glass-subtle hover:bg-white/20 text-slate-600 dark:text-slate-300 ios-liquid-btn"
              title="Lampirkan berkas"
              aria-label="Lampirkan berkas"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  modConfig.antiBlueTickOnReply
                    ? 'Ketik pesan (Mode Stealth: Balas Tanpa Centang Biru)...'
                    : `Kirim pesan ke ${activeChat.name}...`
                }
                className="w-full px-4 py-2.5 rounded-2xl ios-glass-subtle text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              />
            </div>

            {inputText.trim() ? (
              <button
                type="button"
                onClick={handleSend}
                className="w-10 h-10 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ios-liquid-btn shrink-0"
                aria-label="Kirim pesan"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="w-10 h-10 rounded-2xl ios-glass-subtle text-emerald-600 dark:text-emerald-400 flex items-center justify-center ios-liquid-btn shrink-0"
                title="Rekam Voice Note"
                aria-label="Rekam pesan suara"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
