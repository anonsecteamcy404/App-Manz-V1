import React, { useState } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import { Plus, Camera, Eye, Download, ShieldCheck, Video } from 'lucide-react';
import { CURRENT_USER } from '../data/mockData';
import { StatusStoryItem } from '../types/whatsapp';
import { triggerFileDownload } from '../utils/exporter';

export const StatusView: React.FC = () => {
  const { stories, setActiveStory, modConfig, realUser } = useWhatsApp();
  const [myStatusText, setMyStatusText] = useState('');
  const [isAddingStatus, setIsAddingStatus] = useState(false);

  const handleDownloadStoryItem = async (
    e: React.MouseEvent,
    contactName: string,
    item: StatusStoryItem
  ) => {
    e.stopPropagation();
    try {
      if (item.type === 'image' || item.type === 'video') {
        const res = await fetch(item.content);
        if (res.ok) {
          const blob = await res.blob();
          const ext = item.type === 'video' ? 'mp4' : 'jpg';
          triggerFileDownload(
            blob,
            item.fileName || `Status_${contactName.replace(/\s+/g, '_')}_${Date.now()}.${ext}`
          );
          return;
        }
      }
      const textBlob = new Blob(
        [
          `Status WhatsApp dari ${contactName}\nWaktu: ${item.timestamp}\nIsi: ${item.content}\nCaption: ${
            item.caption || '-'
          }`,
        ],
        { type: 'text/plain;charset=utf-8' }
      );
      triggerFileDownload(textBlob, `Status_${contactName.replace(/\s+/g, '_')}_${Date.now()}.txt`);
    } catch (err) {
      console.error('Failed to download status:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 animate-spring-pop">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Status & Story WhatsApp
            </h2>
            {modConfig.autoSaveStatus && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Auto-Downloader ON
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lihat dan unduh foto/video status kontak secara siluman dengan 1 klik
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingStatus(!isAddingStatus)}
          className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 ios-liquid-btn self-start sm:self-auto"
        >
          <Camera className="w-4 h-4" />
          <span>Buat Status Baru</span>
        </button>
      </div>

      {/* Adding Status Box */}
      {isAddingStatus && (
        <div className="p-4 rounded-3xl ios-glass-card space-y-3 animate-spring-pop">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Perbarui Status Anda</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={myStatusText}
              onChange={(e) => setMyStatusText(e.target.value)}
              placeholder="Ketik status teks..."
              className="flex-1 px-4 py-2.5 rounded-2xl ios-glass-subtle text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!myStatusText.trim()) return;
                setIsAddingStatus(false);
                setMyStatusText('');
              }}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 text-white text-xs font-bold shadow-md ios-liquid-btn"
            >
              Kirim
            </button>
          </div>
        </div>
      )}

      {/* My Status Card (Real Profile Picture) */}
      <div className="p-4 rounded-3xl ios-glass-card flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img
              src={realUser?.avatar || CURRENT_USER.avatar}
              alt="Status Saya"
              className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-400 p-0.5 shadow-md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-900">
              <Plus className="w-3 h-3" />
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Status Saya ({realUser?.name || 'WhatsApp Tertaut'})
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {realUser?.phone || 'Akun Utama Terhubung'}
            </p>
          </div>
        </div>
      </div>

      {/* Contact Stories Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Pembaruan Status Kontak ({stories.length})
        </h3>

        {stories.length === 0 ? (
          <div className="p-10 rounded-3xl ios-glass-card text-center space-y-2">
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              Belum Ada Status Baru yang Masuk
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Saat kontak WhatsApp Anda mengunggah foto, video, atau teks ke Status/Story, status tersebut akan muncul secara otomatis di sini lengkap dengan profil asli dan tombol unduh 1 klik.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {stories.map((story) => {
              const hasUnseen = story.stories.some((s) => !s.seen);
              const firstItem = story.stories[0];

              return (
                <div
                  key={story.id}
                  onClick={() => setActiveStory(story)}
                  className="group relative p-4 rounded-3xl ios-glass-card cursor-pointer hover:border-emerald-400/60 hover:shadow-2xl transition-all overflow-hidden flex flex-col justify-between h-52"
                >
                  {/* Background visual snippet */}
                  {firstItem?.type === 'image' ? (
                    <div className="absolute inset-0 z-0">
                      <img
                        src={firstItem.content}
                        alt={story.contactName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-35 dark:opacity-25"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    </div>
                  ) : firstItem?.type === 'video' ? (
                    <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
                      <Video className="w-12 h-12 text-emerald-500/30" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div
                      className="absolute inset-0 z-0 opacity-25"
                      style={{ backgroundColor: firstItem?.bgColor || '#059669' }}
                    />
                  )}

                  {/* Top story header */}
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-0.5 rounded-2xl shrink-0 ${
                          hasUnseen
                            ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-transparent'
                            : 'opacity-80'
                        }`}
                      >
                        <img
                          src={story.contactAvatar}
                          alt={story.contactName}
                          className="w-10 h-10 rounded-xl object-cover border border-white/30"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {story.contactName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {story.updatedAt} ({story.stories.length} slide)
                        </p>
                      </div>
                    </div>

                    {/* Direct 1-Click Download Status Button */}
                    {firstItem && (
                      <button
                        type="button"
                        onClick={(e) => handleDownloadStoryItem(e, story.contactName, firstItem)}
                        className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shrink-0 ios-liquid-btn"
                        title="Unduh Status Ini"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Bottom preview & play badge */}
                  <div className="relative z-10 flex items-center justify-between text-xs mt-auto pt-2">
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 line-clamp-2">
                      {firstItem?.caption ||
                        (firstItem?.type === 'text' ? firstItem.content : 'Ketuk untuk lihat & unduh')}
                    </span>
                    <span className="p-1.5 rounded-full bg-white/15 text-white shadow-md shrink-0 ml-2 group-hover:scale-110 transition-transform">
                      <Eye className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
