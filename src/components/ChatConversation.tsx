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
  Square,
  Play,
  Pause,
  FileText,
  Image as ImageIcon,
  CheckCheck,
  ChevronLeft,
  X,
  FileCheck,
  Eye,
} from 'lucide-react';
import { MediaAttachment } from '../types/whatsapp';

interface ChatConversationProps {
  onBackMobile?: () => void;
  onExportCurrentChat: () => void;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  onBackMobile,
  onExportCurrentChat,
}) => {
  const {
    activeChat,
    sendMessage,
    reactToMessage,
    startCall,
  } = useWhatsApp();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewMedia, setPreviewMedia] = useState<MediaAttachment | null>(null);

  // Voice note playback simulator
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [audioProgress, setAudioProgress] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeChat?.messages.length, activeChat?.isTyping]);

  // Handle simulated audio play
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

  // Voice note recording timer
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
      url: 'mock_audio.ogg',
      fileName: `PTT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-WA0023.opus`,
      fileSize: `${Math.max(120, recordingSeconds * 16)} KB`,
      duration: `0:${recordingSeconds < 10 ? '0' + recordingSeconds : recordingSeconds}`,
      mimeType: 'audio/ogg',
    };

    sendMessage(activeChat.id, '', [voiceAttachment]);
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

  const handleAttachImage = () => {
    if (!activeChat) return;
    const sampleAttachment: MediaAttachment = {
      id: `att_${Date.now()}`,
      type: 'image',
      url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
      fileName: 'Katalog_Design_iOS18.jpg',
      fileSize: '1.7 MB',
      mimeType: 'image/jpeg',
    };
    sendMessage(activeChat.id, 'Berikut lampiran gambar yang diminta ya!', [sampleAttachment]);
    setShowAttachmentMenu(false);
  };

  const handleAttachDoc = () => {
    if (!activeChat) return;
    const sampleDoc: MediaAttachment = {
      id: `doc_${Date.now()}`,
      type: 'document',
      url: 'doc_sample.pdf',
      fileName: 'Dokumen_Spesifikasi_Sinkronisasi.pdf',
      fileSize: '2.4 MB',
      mimeType: 'application/pdf',
    };
    sendMessage(activeChat.id, 'Dokumen spesifikasi sudah dilampirkan.', [sampleDoc]);
    setShowAttachmentMenu(false);
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center ios-glass-subtle">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4">
          <Smile className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Pilih Obrolan WhatsApp</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
          Pilih salah satu kontak di sisi kiri untuk membaca pesan, mendengarkan voice note, atau mengekspor riwayat obrolan secara instan.
        </p>
      </div>
    );
  }

  const commonEmojis = ['👍', '❤️', '😂', '🔥', '🙏', '🎉', '🚀', '👏', '😍', '✨'];

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
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
            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {activeChat.name}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeChat.isTyping ? (
                <span className="text-emerald-500 font-semibold animate-pulse">sedang mengetik...</span>
              ) : activeChat.isGroup ? (
                `${activeChat.participants?.length || 4} anggota`
              ) : (
                'Online'
              )}
            </p>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-1.5 shrink-0">
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

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* End to end security badge */}
        <div className="flex justify-center my-2">
          <div className="max-w-md px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 text-center flex items-center gap-1.5 shadow-xs">
            <span>🔒</span>
            <span>Pesan dienkripsi secara end-to-end. Tidak ada pihak ketiga yang dapat mengakses.</span>
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

                {/* Media Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {msg.attachments.map((att) => {
                      if (att.type === 'image') {
                        return (
                          <div
                            key={att.id}
                            className="relative rounded-xl overflow-hidden cursor-pointer group/media border border-black/10 dark:border-white/10"
                            onClick={() => setPreviewMedia(att)}
                          >
                            <img
                              src={att.url}
                              alt={att.fileName}
                              className="w-full max-h-64 object-cover rounded-xl transition-transform group-hover/media:scale-102"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/media:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                              <span className="px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> Lihat Ukuran Penuh
                              </span>
                            </div>
                            <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-mono">
                              {att.fileSize}
                            </span>
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
                            {/* Play/Pause Button */}
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
                              aria-label={isPlaying ? 'Jeda voice note' : 'Putar voice note'}
                            >
                              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                            </button>

                            {/* Simulated Waveform & Progress */}
                            <div className="flex-1 space-y-1">
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
                              <div className="flex items-center justify-between text-[10px] opacity-80">
                                <span>{isPlaying ? `0:${Math.floor(audioProgress * 0.28)}` : att.duration || '0:28'}</span>
                                <span className="font-mono">{att.fileSize}</span>
                              </div>
                            </div>

                            {/* Playback speed toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextRate = audioPlaybackRate === 1 ? 1.5 : audioPlaybackRate === 1.5 ? 2 : 1;
                                setAudioPlaybackRate(nextRate);
                              }}
                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-black/20 hover:bg-black/30 transition-colors"
                            >
                              {audioPlaybackRate}x
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
                              <p className="text-[10px] opacity-75">{att.fileSize} · PDF</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const dummy = new Blob([`Simulated Document: ${att.fileName}`], { type: 'text/plain' });
                                const url = URL.createObjectURL(dummy);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = att.fileName;
                                a.click();
                              }}
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewMedia(null)}
        >
          <div className="relative max-w-3xl w-full p-4 ios-glass-card rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div>
                <h4 className="text-sm font-bold text-white">{previewMedia.fileName}</h4>
                <p className="text-xs text-slate-400">{previewMedia.fileSize}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
                aria-label="Tutup pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewMedia.url}
              alt={previewMedia.fileName}
              className="max-h-[70vh] w-auto mx-auto rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Quick Attachment Sheet Drawer */}
      {showAttachmentMenu && (
        <div className="p-3 mx-4 mb-2 rounded-2xl ios-glass-card border border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in slide-in-from-bottom-2">
          <button
            type="button"
            onClick={handleAttachImage}
            className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <span>Foto & Video</span>
          </button>
          <button
            type="button"
            onClick={handleAttachDoc}
            className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-500 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <span>Dokumen PDF</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeChat) {
                sendMessage(activeChat.id, '📍 Lokasi Terkini: Jakarta Selatan (-6.2088, 106.8456)');
              }
              setShowAttachmentMenu(false);
            }}
            className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <span>📍</span>
            </div>
            <span>Kirim Lokasi</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeChat) {
                sendMessage(activeChat.id, '👤 Kartu Kontak: Sarah Designer (+62 811-2345-6789)');
              }
              setShowAttachmentMenu(false);
            }}
            className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <span>👤</span>
            </div>
            <span>Bagikan Kontak</span>
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
          /* Voice Recording Simulator Mode */
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
          /* Standard Input Bar */
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

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan..."
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
