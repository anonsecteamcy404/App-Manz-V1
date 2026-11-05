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

  // Chat Boom Modal / Drawer State
  const [showBoomModal, setShowBoomModal] = useState(false);
  const [boomMessageText, setBoomMessageText] = useState('maafin aku');
  const [boomCount, setBoomCount] = useState<number>(5);

  // Audio playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [audioProgress, setAudioProgress] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
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
        return prev + 5 * audioPlaybackRate;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [playingAudioId, audioPlaybackRate]);

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

  const handleLaunchBoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || !boomMessageText.trim() || boomCount < 1) return;
    startChatBoom(activeChat.id, boomMessageText.trim(), boomCount);
    setShowBoomModal(false);
  };

  const handleDownloadAttachment = async (att: MediaAttachment) => {
    try {
      if (att.url && (att.url.startsWith('/api/media-file/') || att.url.startsWith('http') || att.url.startsWith('blob:'))) {
        const res = await fetch(att.url);
        const blob = await res.blob();
        triggerFileDownload(blob, att.fileName || `iGlass_Media_${Date.now()}`);
      } else {
        const blob = new Blob([`Media File: ${att.fileName}`], { type: att.mimeType || 'application/octet-stream' });
        triggerFileDownload(blob, att.fileName || `iGlass_Media_${Date.now()}`);
      }
    } catch (err) {
      console.error('Download media error:', err);
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
    sendMessage(activeChat.id, file.name, [att]);
    setShowAttachmentMenu(false);
    e.target.value = '';
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center ios-glass-subtle">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          WhatsApp iGlass Mod Pro Siap Digunakan
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 leading-relaxed">
          Pilih salah satu obrolan di sebelah kiri atau klik <strong>Nomor Baru</strong> untuk mengirim pesan ke nomor yang belum disimpan dengan fitur <strong>Anti-Centang Biru</strong>, <strong>Pembuka 1x Lihat</strong>, dan <strong>Chat Boom Anti-Ban</strong>.
        </p>
      </div>
    );
  }

  const commonEmojis = ['👍', '❤️', '😂', '🔥', '🙏', '🎉', '🚀', '👏', '😍', '✨'];

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
      {/* Hidden real file picker */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Dynamic wallpaper subtle mesh */}
      <div className="absolute inset-0 bg-radial from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Chat Top Header */}
      <div className="sticky top-0 z-20 px-4 py-3 ios-glass-header flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {onBackMobile && (
            <button
              type="button"
              onClick={onBackMobile}
              className="md:hidden p-1.5 -ml-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
              aria-label="Kembali ke daftar obrolan"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative shrink-0">
            <img
              src={activeChat.avatar}
              alt={activeChat.name}
              className="w-10 h-10 rounded-2xl object-cover border border-white/20 shadow-sm"
            />
            {!activeChat.isGroup && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {activeChat.name}
              </h2>
              {modConfig.antiBlueTick && (
                <span
                  onClick={onOpenModSettings}
                  className="cursor-pointer px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0"
                  title="Anti Centang Biru Aktif"
                >
                  <EyeOff className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">Anti Centang Biru</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeChat.isTyping ? (
                <span className="text-emerald-500 font-semibold animate-pulse">sedang mengetik...</span>
              ) : activeChat.isGroup ? (
                `Grup WhatsApp`
              ) : (
                'Terhubung · Anti-Ban Handshake Aktif'
              )}
            </p>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Chat Boom Trigger Button */}
          <button
            type="button"
            onClick={() => setShowBoomModal(!showBoomModal)}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Kirim Pesan Berulang Otomatis (Chat Boom Anti-Ban)"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Chat Boom</span>
          </button>

          <button
            type="button"
            onClick={() => startCall(activeChat.id, 'audio')}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors"
            title="Panggilan Suara"
            aria-label="Panggilan suara"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => startCall(activeChat.id, 'video')}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors"
            title="Panggilan Video"
            aria-label="Panggilan video"
          >
            <Video className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onExportCurrentChat}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Ekspor obrolan ini"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor</span>
          </button>
        </div>
      </div>

      {/* Live Chat Boom Progress Bar Banner */}
      {boomStatus.isRunning && (
        <div className="px-4 py-2.5 bg-amber-500/20 border-b border-amber-500/30 backdrop-blur-md flex items-center justify-between gap-3 z-20">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Zap className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
                <span className="truncate">
                  Mengirim Boom: "{boomStatus.text}" ({boomStatus.sent}/{boomStatus.total})
                </span>
                <span className="font-mono ml-2">
                  {Math.round((boomStatus.sent / Math.max(1, boomStatus.total)) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (boomStatus.sent / Math.max(1, boomStatus.total)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={stopChatBoom}
            className="px-3 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shrink-0"
          >
            Stop
          </button>
        </div>
      )}

      {/* Chat Boom Modal / Popover */}
      {showBoomModal && (
        <div className="mx-4 mt-3 p-4 rounded-3xl ios-glass-card border border-amber-500/40 shadow-2xl z-30 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Chat Boom Otomatis (Anti-Ban & Anti-Spam)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kirim pesan berulang kali ke <strong>{activeChat.name}</strong> dengan jeda manusia & zero-width hash
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBoomModal(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleLaunchBoom} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Isi Pesan Boom (Contoh: "maafin aku")
                </label>
                <input
                  type="text"
                  value={boomMessageText}
                  onChange={(e) => setBoomMessageText(e.target.value)}
                  placeholder="Masukkan teks pesan yang ingin di-boom..."
                  className="w-full px-3.5 py-2 rounded-xl bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Jumlah Kirim (1 - 100x)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={boomCount}
                  onChange={(e) => setBoomCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/15 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Quick Preset Counts */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Pilih Cepat:</span>
                {[3, 5, 10, 20, 50].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setBoomCount(cnt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      boomCount === cnt
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-black/10 dark:bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {cnt}x
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Kirim {boomCount} Pesan Sekarang</span>
              </button>
            </div>

            <div className="text-[10px] text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>
                Dilindungi Anti-Ban: Simulasi mengetik + jeda acak {modConfig.antiBanGuard.minDelayMs}–{modConfig.antiBanGuard.maxDelayMs}ms agar akun WA aman dari blokir spam.
              </span>
            </div>
          </form>
        </div>
      )}

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Stealth & E2EE info banner */}
        <div className="flex flex-wrap justify-center gap-2 my-2">
          <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 text-center flex items-center gap-1.5 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              Mode Mod Aktif: {modConfig.antiBlueTick ? 'Anti-Centang Biru (Buka & Balas)' : 'Standar'} · Pembuka 1x Lihat Otomatis
            </span>
          </div>
        </div>

        {activeChat.messages.map((msg) => {
          const isOut = msg.isOutgoing;
          return (
            <div
              key={msg.id}
              className={`flex flex-col group ${isOut ? 'items-end' : 'items-start'} transition-all`}
            >
              <div
                className={`relative max-w-[85%] md:max-w-[70%] p-3.5 rounded-2xl shadow-sm transition-all ${
                  isOut
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-tr-xs'
                    : 'ios-glass-card text-slate-900 dark:text-white rounded-tl-xs'
                }`}
              >
                {/* Group sender name */}
                {!isOut && activeChat.isGroup && (
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    {msg.senderName}
                  </div>
                )}

                {/* View Once Unlocked Badge */}
                {msg.isViewOnce && (
                  <div className="mb-2 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <LockOpen className="w-3.5 h-3.5" />
                      <span>Media 1x Lihat Terbuka (Anti View-Once)</span>
                    </span>
                  </div>
                )}

                {/* Anti-Revoke Badge if sender deleted message */}
                {msg.isRevoked && (
                  <div className="mb-2 px-2.5 py-1 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Pesan Dihapus Pengirim (Diselamatkan Anti-Revoke)</span>
                  </div>
                )}

                {/* Media Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {msg.attachments.map((att) => {
                      if (att.type === 'image') {
                        return (
                          <div
                            key={att.id}
                            className="relative rounded-xl overflow-hidden group/media border border-black/10 dark:border-white/10"
                          >
                            <img
                              src={att.url}
                              alt={att.fileName}
                              onClick={() => setPreviewMedia(att)}
                              className="w-full max-h-72 object-cover rounded-xl cursor-pointer transition-transform group-hover/media:scale-102"
                            />
                            <div className="absolute top-2 right-2 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewMedia(att)}
                                className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-xs"
                              >
                                <Eye className="w-3 h-3" /> Perbesar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadAttachment(att)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-md"
                              >
                                <Download className="w-3 h-3" /> Unduh
                              </button>
                            </div>
                            <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-mono">
                              {att.isViewOnce ? '1x Lihat · ' : ''}{att.fileSize}
                            </span>
                          </div>
                        );
                      }

                      if (att.type === 'video') {
                        return (
                          <div
                            key={att.id}
                            className="relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/40 p-2 space-y-2"
                          >
                            <video
                              src={att.url}
                              controls
                              className="w-full max-h-72 rounded-lg"
                            />
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[10px] opacity-80 truncate">
                                {att.isViewOnce ? '🔓 Video 1x Lihat · ' : ''}{att.fileName} ({att.fileSize})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDownloadAttachment(att)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1"
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
                            className={`p-3 rounded-xl flex items-center gap-3 border ${
                              isOut
                                ? 'bg-black/15 border-white/20'
                                : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (isPlaying) {
                                  setPlayingAudioId(null);
                                } else {
                                  setPlayingAudioId(att.id);
                                }
                              }}
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                                isOut
                                  ? 'bg-white text-emerald-700'
                                  : 'bg-emerald-500 text-white'
                              }`}
                            >
                              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                            </button>

                            <div className="flex-1 space-y-1">
                              {att.url && att.url.startsWith('/api/media-file/') ? (
                                <audio src={att.url} controls className="w-full h-8" />
                              ) : (
                                <div className="relative h-6 flex items-center gap-1">
                                  {[30, 60, 45, 90, 75, 40, 85, 95, 60, 40, 70, 80, 50, 65, 85, 45, 30, 70, 90, 50].map(
                                    (height, i) => {
                                      const percentDone = (i / 20) * 100;
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
                              className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30"
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
                            className={`p-3 rounded-xl flex items-center gap-3 border ${
                              isOut
                                ? 'bg-black/15 border-white/20'
                                : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{att.fileName}</p>
                              <p className="text-[10px] opacity-75">{att.fileSize}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(att)}
                              className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
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
                    isOut ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="tabular-nums">{msg.timestamp}</span>
                  {isOut && (
                    <CheckCheck
                      className={`w-3.5 h-3.5 ${
                        msg.status === 'read' ? 'text-sky-300' : 'text-white/60'
                      }`}
                    />
                  )}
                </div>

                {/* Message Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="absolute -bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-black/5 dark:border-white/10 text-xs">
                    {msg.reactions.map((r, idx) => (
                      <span key={idx} className="flex items-center gap-0.5">
                        <span>{r.emoji}</span>
                        {r.count > 1 && <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{r.count}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick reaction hover palette */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full ios-glass-card shadow-xs transition-opacity">
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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewMedia(null)}
        >
          <div className="relative max-w-3xl w-full p-4 ios-glass-card rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{previewMedia.fileName}</span>
                  {previewMedia.isViewOnce && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                      🔓 1x Lihat Terbuka
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-400">{previewMedia.fileSize}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(previewMedia)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh ke Perangkat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Tutup pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
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
                alt={previewMedia.fileName}
                className="max-h-[70vh] w-auto mx-auto rounded-2xl object-contain shadow-2xl"
              />
            )}
          </div>
        </div>
      )}

      {/* Quick Attachment Sheet Drawer */}
      {showAttachmentMenu && (
        <div className="p-3 mx-4 mb-2 rounded-2xl ios-glass-card border border-white/20 grid grid-cols-2 sm:grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <span>Unggah Foto/Video/Berkas</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAttachmentMenu(false);
              setShowBoomModal(true);
            }}
            className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <span>Chat Boom Otomatis</span>
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
            className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <span>📍</span>
            </div>
            <span>Bagikan Lokasi GPS</span>
          </button>
        </div>
      )}

      {/* Emoji Drawer */}
      {showEmojiPicker && (
        <div className="p-3 mx-4 mb-2 rounded-2xl ios-glass-card border border-white/20 flex items-center gap-2 overflow-x-auto">
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setInputText((prev) => prev + emoji);
              }}
              className="text-xl p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Message Composer Bar */}
      <div className="p-3 md:p-4 ios-glass-header border-t border-black/5 dark:border-white/10">
        {isRecordingVoice ? (
          <div className="flex items-center justify-between gap-4 p-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Merekam Voice Note (0:{recordingSeconds < 10 ? '0' + recordingSeconds : recordingSeconds})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-3 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={finishRecording}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
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
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
              title="Pilih emoji"
              aria-label="Pilih emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
              title="Lampirkan berkas"
              aria-label="Lampirkan berkas"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowBoomModal(!showBoomModal)}
              className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 transition-colors"
              title="Buka Chat Boom (Kirim Pesan Berulang)"
              aria-label="Chat Boom"
            >
              <Zap className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  modConfig.antiBlueTickOnReply
                    ? 'Ketik pesan (Stealth: Balas Tanpa Centang Biru)...'
                    : 'Ketik pesan...'
                }
                className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {inputText.trim() ? (
              <button
                type="button"
                onClick={handleSend}
                className="w-10 h-10 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 active:scale-95 transition-all shrink-0"
                aria-label="Kirim pesan"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="w-10 h-10 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 active:scale-95 transition-all shrink-0"
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
