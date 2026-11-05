import React, { useState } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import { Plus, Camera, Eye } from 'lucide-react';
import { CURRENT_USER } from '../data/mockData';

export const StatusView: React.FC = () => {
  const { stories, setActiveStory } = useWhatsApp();
  const [myStatusText, setMyStatusText] = useState('');
  const [isAddingStatus, setIsAddingStatus] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Status WhatsApp</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pembaruan teks dan foto yang hilang otomatis setelah 24 jam
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingStatus(!isAddingStatus)}
          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all"
        >
          <Camera className="w-4 h-4" />
          <span>Buat Status Baru</span>
        </button>
      </div>

      {/* Adding Status Box */}
      {isAddingStatus && (
        <div className="p-4 rounded-3xl ios-glass-card border border-white/20 space-y-3 animate-in fade-in">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Perbarui Status Anda</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={myStatusText}
              onChange={(e) => setMyStatusText(e.target.value)}
              placeholder="Apa yang sedang terjadi hari ini?..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!myStatusText.trim()) return;
                setIsAddingStatus(false);
                setMyStatusText('');
              }}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 text-white text-xs font-bold shadow-md"
            >
              Kirim
            </button>
          </div>
        </div>
      )}

      {/* My Status Card */}
      <div className="p-4 rounded-3xl ios-glass-card border border-white/20 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img
              src={CURRENT_USER.avatar}
              alt="Status Saya"
              className="w-12 h-12 rounded-2xl object-cover border-2 border-dashed border-emerald-500 p-0.5"
            />
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-900">
              <Plus className="w-3 h-3" />
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Status Saya</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ketuk untuk menambahkan pembaruan status</p>
          </div>
        </div>
      </div>

      {/* Contact Stories Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Pembaruan Terkini dari Kontak
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {stories.map((story) => {
            const hasUnseen = story.stories.some((s) => !s.seen);
            const firstItem = story.stories[0];

            return (
              <div
                key={story.id}
                onClick={() => setActiveStory(story)}
                className="group relative p-4 rounded-3xl ios-glass-card border border-white/20 cursor-pointer hover:border-emerald-500/50 hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between h-48"
              >
                {/* Background visual snippet */}
                {firstItem?.type === 'image' ? (
                  <div className="absolute inset-0 z-0">
                    <img
                      src={firstItem.content}
                      alt={story.contactName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-30 dark:opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                  </div>
                ) : (
                  <div
                    className="absolute inset-0 z-0 opacity-20"
                    style={{ backgroundColor: firstItem?.bgColor || '#4f46e5' }}
                  />
                )}

                {/* Top story header */}
                <div className="relative z-10 flex items-center gap-3">
                  <div
                    className={`p-0.5 rounded-2xl ${
                      hasUnseen ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-transparent' : 'opacity-80'
                    }`}
                  >
                    <img
                      src={story.contactAvatar}
                      alt={story.contactName}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {story.contactName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{story.updatedAt}</p>
                  </div>
                </div>

                {/* Bottom preview & play badge */}
                <div className="relative z-10 flex items-center justify-between text-xs mt-auto pt-2">
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                    {firstItem?.caption || firstItem?.content || 'Pembaruan cerita'}
                  </span>
                  <span className="p-1.5 rounded-full bg-emerald-500 text-white shadow-md shrink-0 ml-2 group-hover:scale-110 transition-transform">
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
