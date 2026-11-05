import React, { useState } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import {
  Image as ImageIcon,
  FileText,
  Mic,
  Download,
  CheckSquare,
  Square,
  Search,
  Check,
} from 'lucide-react';
import { MediaAttachment } from '../types/whatsapp';
import JSZip from 'jszip';
import { triggerFileDownload, formatBytes } from '../utils/exporter';

export const MediaGalleryView: React.FC = () => {
  const { chats } = useWhatsApp();
  const [filterType, setFilterType] = useState<'all' | 'image' | 'document' | 'audio'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Extract all media items from chats
  const allMediaItems: { attachment: MediaAttachment; chatName: string; timestamp: string }[] = [];
  chats.forEach((chat) => {
    chat.messages.forEach((msg) => {
      if (msg.attachments) {
        msg.attachments.forEach((att) => {
          allMediaItems.push({
            attachment: att,
            chatName: chat.name,
            timestamp: msg.timestamp,
          });
        });
      }
    });
  });

  const filteredItems = allMediaItems.filter((item) => {
    if (filterType !== 'all' && item.attachment.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.attachment.fileName.toLowerCase().includes(q);
      const matchChat = item.chatName.toLowerCase().includes(q);
      return matchName || matchChat;
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.attachment.id));
    }
  };

  const downloadSelectedBatch = async () => {
    if (selectedIds.length === 0) return;
    setIsDownloading(true);

    try {
      const zip = new JSZip();
      const selectedAttachments = allMediaItems.filter((i) =>
        selectedIds.includes(i.attachment.id)
      );

      selectedAttachments.forEach(({ attachment, chatName }) => {
        const payload = `Simulated media attachment from WhatsApp chat with ${chatName}.\nFile: ${attachment.fileName}\nSize: ${attachment.fileSize}\nType: ${attachment.type}`;
        zip.file(attachment.fileName, payload);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      triggerFileDownload(blob, `WhatsApp_Media_Batch_${Date.now()}.zip`);
    } catch (err) {
      console.error('Batch download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pusat Media & Berkas</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Akses dan unduh foto, dokumen PDF, dan rekaman suara dari seluruh obrolan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            {selectedIds.length === filteredItems.length && filteredItems.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            <span>Pilih Semua ({filteredItems.length})</span>
          </button>

          <button
            type="button"
            disabled={selectedIds.length === 0 || isDownloading}
            onClick={downloadSelectedBatch}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Mengompres...' : `Unduh Terpilih (${selectedIds.length})`}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama berkas atau pengirim..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filterType === 'all'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Semua ({allMediaItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('image')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filterType === 'image'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Foto & Video
          </button>
          <button
            type="button"
            onClick={() => setFilterType('document')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filterType === 'document'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Dokumen
          </button>
          <button
            type="button"
            onClick={() => setFilterType('audio')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filterType === 'audio'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Voice Note
          </button>
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map(({ attachment, chatName, timestamp }) => {
          const isSelected = selectedIds.includes(attachment.id);

          return (
            <div
              key={attachment.id}
              className={`group relative p-3 rounded-2xl ios-glass-card border transition-all cursor-pointer ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                  : 'border-white/20 hover:border-emerald-500/40'
              }`}
              onClick={() => toggleSelect(attachment.id)}
            >
              {/* Selection Checkbox */}
              <div className="absolute top-4 right-4 z-10">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-black/40 text-transparent border border-white/40 group-hover:text-white/40'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </div>
              </div>

              {/* Preview Thumbnail */}
              <div className="h-32 rounded-xl bg-black/10 dark:bg-white/5 overflow-hidden flex items-center justify-center relative mb-2.5">
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.url}
                    alt={attachment.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : attachment.type === 'document' ? (
                  <div className="flex flex-col items-center text-red-500">
                    <FileText className="w-10 h-10" />
                    <span className="text-[10px] font-bold mt-1 text-slate-700 dark:text-slate-300">PDF</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-emerald-500">
                    <Mic className="w-10 h-10" />
                    <span className="text-[10px] font-bold mt-1 text-slate-700 dark:text-slate-300">
                      Voice Note
                    </span>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={attachment.fileName}>
                  {attachment.fileName}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="truncate max-w-[60%]">{chatName}</span>
                  <span className="font-mono tabular-nums shrink-0">{attachment.fileSize}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
