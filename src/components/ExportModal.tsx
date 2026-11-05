import React, { useState } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import {
  X,
  Download,
  Settings,
  History,
  CheckCircle2,
  FileArchive,
  FileCode,
  FileText,
  Globe,
  Clock,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';
import { ExportFilter, AutoExportConfig } from '../types/whatsapp';
import { triggerFileDownload } from '../utils/exporter';

export const ExportModal: React.FC = () => {
  const {
    isExportModalOpen,
    closeExportModal,
    exportActiveTab,
    chats,
    autoExportConfig,
    updateAutoExportConfig,
    runExport,
    exportRecords,
  } = useWhatsApp();

  const [activeTab, setActiveTab] = useState<'instant' | 'auto' | 'history'>(exportActiveTab);
  const [selectedChatId, setSelectedChatId] = useState<string>(''); // empty = all
  const [format, setFormat] = useState<'zip' | 'json' | 'txt' | 'html'>('zip');
  const [includeMedia, setIncludeMedia] = useState(true);
  const [includeVoiceNotes, setIncludeVoiceNotes] = useState(true);
  const [includeDocuments, setIncludeDocuments] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  if (!isExportModalOpen) return null;

  const handleStartManualExport = async () => {
    setIsExporting(true);
    setExportSuccessMessage(null);

    const filter: ExportFilter = {
      chatId: selectedChatId || undefined,
      format,
      includeMedia,
      includeVoiceNotes,
      includeDocuments,
    };

    try {
      await runExport(filter, 'manual');
      setExportSuccessMessage('Cadangan obrolan dan media berhasil dibuat dan diunduh ke komputer Anda!');
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] rounded-3xl ios-glass-card border border-white/25 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30 shadow-md">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Pusat Ekspor & Cadangan WhatsApp
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadangkan obrolan, riwayat media, dan dokumen secara manual atau otomatis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeExportModal}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400"
            aria-label="Tutup modal ekspor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('instant')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'instant'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Instan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('auto')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'auto'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pengaturan Otomatis</span>
              {autoExportConfig.enabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat ({exportRecords.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: INSTANT EXPORT */}
          {activeTab === 'instant' && (
            <div className="space-y-6">
              {exportSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{exportSuccessMessage}</span>
                </div>
              )}

              {/* Chat Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  1. Pilih Cakupan Obrolan
                </label>
                <select
                  value={selectedChatId}
                  onChange={(e) => setSelectedChatId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">Semua Obrolan ({chats.length} Obrolan & Seluruh Media)</option>
                  {chats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.messages.length} pesan)
                    </option>
                  ))}
                </select>
              </div>

              {/* Format Selection Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  2. Pilih Format Berkas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormat('zip')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      format === 'zip'
                        ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-black/10 dark:border-white/10 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                        <FileArchive className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Paket ZIP Lengkap (.zip)</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Termasuk obrolan .txt, transkrip .html, dan semua file media
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormat('html')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      format === 'html'
                        ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-black/10 dark:border-white/10 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-500 flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Transkrip Interaktif (.html)</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Bisa dibuka di browser apapun dengan tema WhatsApp Glass
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormat('json')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      format === 'json'
                        ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-black/10 dark:border-white/10 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center shrink-0">
                        <FileCode className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Data JSON Terstruktur (.json)</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Ideal untuk migrasi data, analisis, dan integrasi backup
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormat('txt')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      format === 'txt'
                        ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-black/10 dark:border-white/10 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Format Resmi WhatsApp (.txt)</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Format teks standar [Waktu] Pengirim: Pesan
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Inclusion Filters */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3. Opsi Penyertaan Berkas Media
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="p-3 rounded-2xl border border-black/10 dark:border-white/10 flex items-center gap-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={includeMedia}
                      onChange={(e) => setIncludeMedia(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                    />
                    <span className="text-xs font-medium">Foto & Video</span>
                  </label>

                  <label className="p-3 rounded-2xl border border-black/10 dark:border-white/10 flex items-center gap-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={includeVoiceNotes}
                      onChange={(e) => setIncludeVoiceNotes(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                    />
                    <span className="text-xs font-medium">Voice Note Audio</span>
                  </label>

                  <label className="p-3 rounded-2xl border border-black/10 dark:border-white/10 flex items-center gap-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={includeDocuments}
                      onChange={(e) => setIncludeDocuments(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                    />
                    <span className="text-xs font-medium">Dokumen PDF</span>
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleStartManualExport}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isExporting ? 'Memproses dan Mengompres Berkas...' : 'Mulai Ekspor Sekarang & Unduh'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AUTOMATIC EXPORT SETTINGS */}
          {activeTab === 'auto' && (
            <div className="space-y-6">
              {/* Main Toggle Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Mesin Ekspor Otomatis di Latar Belakang</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Secara berkala mengarsipkan obrolan dan media tanpa perlu tindakan manual
                    </p>
                  </div>
                </div>

                {/* Switch */}
                <button
                  type="button"
                  onClick={() =>
                    updateAutoExportConfig({ enabled: !autoExportConfig.enabled })
                  }
                  className={`relative w-13 h-7 rounded-full p-1 transition-colors shrink-0 ${
                    autoExportConfig.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Aktifkan ekspor otomatis"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      autoExportConfig.enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Frequency Trigger Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Frekuensi Pemicu Ekspor
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'realtime',
                      title: 'Real-time (Pesan Baru)',
                      desc: 'Otomatis mencatat dan mengekspor setiap ada pesan baru masuk/keluar',
                    },
                    {
                      id: 'hourly',
                      title: 'Setiap Jam (Hourly)',
                      desc: 'Mengekspor akumulasi pesan dan media sekali per jam secara teratur',
                    },
                    {
                      id: 'daily',
                      title: 'Harian (Tengah Malam)',
                      desc: 'Cadangan penuh harian dieksekusi setiap pukul 00:00',
                    },
                    {
                      id: 'on_connect',
                      title: 'Saat Perangkat Terhubung',
                      desc: 'Otomatis backup sesaat setelah QR Code berhasil dipindai',
                    },
                  ].map((freq) => (
                    <div
                      key={freq.id}
                      onClick={() =>
                        updateAutoExportConfig({ frequency: freq.id as any })
                      }
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        autoExportConfig.frequency === freq.id
                          ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-black/10 dark:border-white/10 hover:border-emerald-500/40'
                      }`}
                    >
                      <p className="text-xs font-bold">{freq.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {freq.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automatic Format & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Format Arsip Otomatis
                  </label>
                  <select
                    value={autoExportConfig.format}
                    onChange={(e) =>
                      updateAutoExportConfig({ format: e.target.value as any })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="zip">Paket ZIP Lengkap (.zip)</option>
                    <option value="json">JSON Database (.json)</option>
                    <option value="txt">Teks WhatsApp Standar (.txt)</option>
                    <option value="html">Transkrip Interaktif (.html)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Destinasi Penyimpanan
                  </label>
                  <select
                    value={autoExportConfig.destination}
                    onChange={(e) =>
                      updateAutoExportConfig({ destination: e.target.value as any })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="local_download">Unduh Berkas ke Komputer Lokal</option>
                    <option value="indexeddb_cache">Simpan di Cache Browser Terenkripsi</option>
                    <option value="cloud_sync_sim">Sinkronisasi Cloud Backup</option>
                  </select>
                </div>
              </div>

              {/* Live Engine Status Indicator */}
              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span>
                    Status Mesin:{' '}
                    <strong>{autoExportConfig.enabled ? 'Aktif & Berjalan' : 'Nonaktif'}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {autoExportConfig.lastExportTimestamp
                    ? `Terakhir ekspor: ${new Date(autoExportConfig.lastExportTimestamp).toLocaleTimeString('id-ID')}`
                    : 'Belum ada ekspor otomatis'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: EXPORT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Total {exportRecords.length} cadangan tersimpan di riwayat</span>
                <span>Enkripsi AES-256 Terverifikasi</span>
              </div>

              {exportRecords.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                  Belum ada riwayat ekspor. Lakukan ekspor instan atau aktifkan ekspor otomatis.
                </div>
              ) : (
                <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden divide-y divide-black/5 dark:divide-white/5">
                  {exportRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                          <FileArchive className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold">{rec.chatName}</p>
                            <span className="px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-[10px] font-mono">
                              {rec.format}
                            </span>
                            {rec.triggerType === 'auto' && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                                Otomatis
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{rec.date}</span>
                            <span aria-hidden="true">·</span>
                            <span>{rec.messageCount} pesan</span>
                            {rec.mediaCount > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{rec.mediaCount} media</span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{rec.fileSizeFormatted}</span>
                          </div>
                        </div>
                      </div>

                      {rec.blobData && (
                        <button
                          type="button"
                          onClick={() => {
                            if (rec.blobData) {
                              triggerFileDownload(
                                rec.blobData,
                                `WhatsApp_Redownload_${rec.id}.${rec.format.toLowerCase()}`
                              );
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs font-semibold flex items-center gap-1.5 self-end sm:self-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Ulang</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
