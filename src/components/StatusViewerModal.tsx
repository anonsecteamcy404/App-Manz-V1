import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import { X, Send, Heart, Download } from 'lucide-react';
import { StatusStory } from '../types/whatsapp';
import { triggerFileDownload } from '../utils/exporter';

interface StatusViewerModalProps {
  story: StatusStory;
  onClose: () => void;
}

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({ story, onClose }) => {
  const { sendMessage } = useWhatsApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');

  const currentItem = story.stories[currentIndex];

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < story.stories.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, story.stories.length, onClose]);

  const handleNext = () => {
    if (currentIndex < story.stories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    sendMessage(story.contactId, `[Membalas Status: "${currentItem.caption || 'Cerita Status'}"]\n${replyText.trim()}`);
    setReplyText('');
    onClose();
  };

  const handleDownloadCurrentStatus = async () => {
    if (!currentItem) return;
    setIsPaused(true);
    try {
      if (
        (currentItem.type === 'image' || currentItem.type === 'video') &&
        currentItem.content.startsWith('/api/media-file/')
      ) {
        const res = await fetch(currentItem.content);
        const blob = await res.blob();
        const ext = currentItem.type === 'video' ? 'mp4' : 'jpg';
        triggerFileDownload(
          blob,
          currentItem.fileName || `Status_${story.contactName.replace(/\s+/g, '_')}_${Date.now()}.${ext}`
        );
      } else {
        const blob = new Blob(
          [`Status dari ${story.contactName}\nWaktu: ${currentItem.timestamp}\nIsi: ${currentItem.content}\nCaption: ${currentItem.caption || ''}`],
          { type: 'text/plain;charset=utf-8' }
        );
        triggerFileDownload(blob, `Status_${story.contactName.replace(/\s+/g, '_')}_${Date.now()}.txt`);
      }
    } catch (err) {
      console.error('Status download failed:', err);
    } finally {
      setIsPaused(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 select-none animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md h-full md:h-[85vh] rounded-none md:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl bg-slate-900 border border-white/20"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Segmented Progress Bar */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
          {story.stories.map((item, idx) => {
            const itemProgress = idx < currentIndex ? 100 : idx === currentIndex ? progress : 0;
            return (
              <div key={item.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{ width: `${itemProgress}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Story Header */}
        <div className="absolute top-7 inset-x-3 z-30 flex items-center justify-between text-white drop-shadow-md">
          <div className="flex items-center gap-2.5">
            <img
              src={story.contactAvatar}
              alt={story.contactName}
              className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400"
            />
            <div>
              <p className="text-xs font-bold leading-tight">{story.contactName}</p>
              <p className="text-[10px] opacity-80">{currentItem?.timestamp || story.updatedAt}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadCurrentStatus();
              }}
              className="px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
              title="Unduh Status Ini"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Status</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white"
              aria-label="Tutup status"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Story Media / Text Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {currentItem?.type === 'image' ? (
            <img
              src={currentItem.content}
              alt="Status"
              className="w-full h-full object-contain bg-black"
            />
          ) : currentItem?.type === 'video' ? (
            <video
              src={currentItem.content}
              controls
              autoPlay
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center p-8 text-center"
              style={{ backgroundColor: currentItem?.bgColor || '#059669' }}
            >
              <p className="text-xl font-bold text-white leading-relaxed">
                {currentItem?.content}
              </p>
            </div>
          )}

          {/* Navigation Click Hotspots */}
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-0 inset-y-0 w-1/4 z-20 focus:outline-none"
            aria-label="Status sebelumnya"
          />
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-0 inset-y-0 w-1/4 z-20 focus:outline-none"
            aria-label="Status berikutnya"
          />

          {/* Caption Scrim */}
          {currentItem?.caption && (
            <div className="absolute bottom-16 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-center text-sm font-medium">
              {currentItem.caption}
            </div>
          )}
        </div>

        {/* Bottom Reply Composer */}
        <div
          className="relative z-30 p-3 bg-black/60 backdrop-blur-md flex items-center gap-2 border-t border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendReply();
            }}
            placeholder="Balas status..."
            className="flex-1 px-4 py-2 rounded-full bg-white/20 text-white placeholder-white/60 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <button
            type="button"
            onClick={() => {
              sendMessage(story.contactId, `❤️`);
              onClose();
            }}
            className="p-2 rounded-full hover:bg-white/20 text-rose-400 transition-colors"
            title="Suka status ini"
            aria-label="Beri suka"
          >
            <Heart className="w-5 h-5 fill-current" />
          </button>

          {replyText.trim() && (
            <button
              type="button"
              onClick={handleSendReply}
              className="p-2 rounded-full bg-emerald-500 text-white shadow-md"
              aria-label="Kirim balasan"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
