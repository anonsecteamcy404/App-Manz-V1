import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import {
  Smartphone,
  QrCode,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Laptop,
  Radio,
  EyeOff,
  Zap,
  Lock,
  Download,
  Copy,
} from 'lucide-react';

export const LinkingScreen: React.FC = () => {
  const {
    connectionState,
    syncProgress,
    syncStatusText,
    pairingCode,
    startRealWhatsAppBackend,
    realQrCodeDataUrl,
    realBackendStatus,
    phoneInfo,
    darkMode,
    setDarkMode,
  } = useWhatsApp();

  const [activeTab, setActiveTab] = useState<'qr' | 'code'>('qr');
  const [phoneNumberInput, setPhoneNumberInput] = useState(phoneInfo.phoneNumber);
  const [qrTimer, setQrTimer] = useState(60);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoadingRealQr, setIsLoadingRealQr] = useState(false);

  // Auto-request real QR when disconnected
  useEffect(() => {
    if (connectionState === 'disconnected' && !realQrCodeDataUrl) {
      setIsLoadingRealQr(true);
      fetch('/api/whatsapp/start', { method: 'POST' })
        .then(() => setIsLoadingRealQr(false))
        .catch(() => setIsLoadingRealQr(false));
    }
  }, [connectionState, realQrCodeDataUrl]);

  // Countdown timer for QR refresh
  useEffect(() => {
    if (connectionState !== 'disconnected') return;
    const timer = setInterval(() => {
      setQrTimer((prev) => (prev > 1 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, [connectionState]);

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard?.writeText(pairingCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRefreshQr = () => {
    setIsLoadingRealQr(true);
    setQrTimer(60);
    fetch('/api/whatsapp/start', { method: 'POST' })
      .then(() => setIsLoadingRealQr(false))
      .catch(() => setIsLoadingRealQr(false));
  };

  const handleRequestPairingCode = () => {
    if (!phoneNumberInput.trim()) return;
    setIsLoadingRealQr(true);
    startRealWhatsAppBackend(phoneNumberInput.trim()).finally(() => {
      setIsLoadingRealQr(false);
    });
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-3 sm:p-5 md:p-8 overflow-x-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-slate-100">
      {/* Dynamic iOS 26 Liquid Glass Ambient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] bg-emerald-500/20 rounded-full blur-[100px] sm:blur-[130px] animate-liquid-orb" />
        <div className="absolute bottom-1/4 right-1/4 w-[320px] sm:w-[440px] h-[320px] sm:h-[440px] bg-teal-400/18 rounded-full blur-[110px] sm:blur-[140px] animate-liquid-orb-slow" />
        <div className="absolute top-1/3 right-1/3 w-[280px] sm:w-[380px] h-[280px] sm:h-[380px] bg-indigo-500/16 rounded-full blur-[90px] sm:blur-[120px] animate-liquid-orb" />
      </div>

      {/* Top Header - in natural document flow so it never overlaps content on phone screens */}
      <header className="relative w-full max-w-5xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4 mb-3 sm:mb-6 z-20 pt-1">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl ios-glass-card flex items-center justify-center shadow-lg shadow-emerald-500/15 shrink-0">
            <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-white truncate">
                WhatsApp <span className="text-emerald-400">iGlass</span>
              </h1>
              <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1 shrink-0">
                <Radio className="w-2 h-2 text-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">100% Real Engine</span>
                <span className="sm:hidden">Real</span>
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block truncate">
              Profil Asli Otomatis · Floating Chat Boom · Anti-Centang Biru · Buka 1x Lihat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <a
            href="/api/source-zip"
            download="iGlass-WA-Companion-SourceCode.zip"
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl ios-liquid-capsule text-[11px] sm:text-xs font-bold text-emerald-300 flex items-center gap-1 sm:gap-1.5 ios-liquid-btn shadow-md"
            title="Unduh Source Code (.zip)"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Source Code (.zip)</span>
            <span className="sm:hidden">ZIP</span>
          </a>
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl ios-glass-subtle text-xs font-bold text-slate-200 ios-liquid-btn"
            aria-label="Ubah Tema"
          >
            {darkMode ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Liquid Glass Container */}
      <main className="relative z-10 w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-1 sm:my-3">
        <div className="w-full rounded-[24px] sm:rounded-[36px] ios-glass-card p-4 sm:p-6 md:p-9 shadow-2xl border border-white/20">
          {connectionState === 'syncing' ? (
            /* Handshake & Syncing State */
            <div className="py-10 sm:py-16 flex flex-col items-center text-center max-w-md mx-auto">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                <div className="absolute inset-2 rounded-full bg-emerald-500/10 backdrop-blur-md flex items-center justify-center">
                  <Laptop className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 animate-bounce" />
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Menyinkronkan Perangkat Tertaut</h2>
              <p className="text-xs sm:text-sm text-slate-300 mb-6">{syncStatusText}</p>

              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10 mb-3">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-emerald-300 tabular-nums">{syncProgress}% selesai</span>

              <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Enkripsi end-to-end terverifikasi protokol Signal WhatsApp</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Feature Highlights Grid: responsive 2x2 on mobile, 4 columns on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <div className="p-2 sm:p-3 rounded-2xl ios-glass-subtle flex items-center sm:flex-col sm:items-start gap-2 sm:gap-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs font-bold text-white block truncate">Floating Boom</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-300 block truncate">Melayang di tiap chat</span>
                  </div>
                </div>

                <div className="p-2 sm:p-3 rounded-2xl ios-glass-subtle flex items-center sm:flex-col sm:items-start gap-2 sm:gap-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs font-bold text-white block truncate">Anti Centang Biru</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-300 block truncate">Buka & balas tetap abu</span>
                  </div>
                </div>

                <div className="p-2 sm:p-3 rounded-2xl ios-glass-subtle flex items-center sm:flex-col sm:items-start gap-2 sm:gap-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
                    <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs font-bold text-white block truncate">Buka 1x Lihat</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-300 block truncate">Simpan foto/video 1x</span>
                  </div>
                </div>

                <div className="p-2 sm:p-3 rounded-2xl ios-glass-subtle flex items-center sm:flex-col sm:items-start gap-2 sm:gap-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs font-bold text-white block truncate">Profil & Status</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-300 block truncate">Foto profil WA asli</span>
                  </div>
                </div>
              </div>

              {/* Title & Method Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-emerald-400">
                    Koneksi Langsung WhatsApp Multi-Device (Semua Mod Awal OFF — Bebas Atur)
                  </span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-0.5">
                    Tautkan WhatsApp Asli Anda
                  </h2>
                </div>

                {/* Segmented Control for Method */}
                <div className="inline-flex p-1 rounded-2xl ios-glass-subtle shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('qr')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ios-liquid-btn ${
                      activeTab === 'qr'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Pindai QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('code')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ios-liquid-btn ${
                      activeTab === 'code'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Nomor HP (8 Digit)</span>
                  </button>
                </div>
              </div>

              {/* Main Content Area: Responsive Layout (Side-by-side on desktop, stacked & clean on mobile) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8 items-center pt-1">
                {/* When on Mobile and QR tab is active, put QR Code right on top so user sees it instantly! */}
                {activeTab === 'qr' && (
                  <div className="md:hidden flex flex-col items-center justify-center p-3 sm:p-5 rounded-3xl ios-glass-card text-center space-y-3">
                    <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-2xl p-2 bg-white flex items-center justify-center overflow-hidden border border-slate-200 shadow-xl">
                      {realQrCodeDataUrl ? (
                        <img
                          src={realQrCodeDataUrl}
                          alt="Kode QR WhatsApp Asli"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="relative w-full h-full flex flex-col items-center justify-center text-slate-700 p-4">
                          <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mb-2" />
                          <span className="text-xs font-bold text-slate-800">Menyiapkan QR Asli...</span>
                          <span className="text-[10px] text-slate-500 mt-1">
                            Menghubungi WebSocket WhatsApp
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10b981] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="flex items-center justify-between w-full max-w-xs text-xs text-slate-300 px-1">
                      <span className="flex items-center gap-1.5 font-medium text-[11px]">
                        <RefreshCw className="w-3 h-3 text-emerald-400" />
                        Otomatis ({qrTimer}d)
                      </span>
                      <button
                        type="button"
                        onClick={handleRefreshQr}
                        className="text-emerald-400 hover:text-emerald-300 font-bold text-xs ios-liquid-btn"
                      >
                        Muat Ulang QR
                      </button>
                    </div>
                  </div>
                )}

                {/* Instructions / Number Input column */}
                <div className="md:col-span-7 space-y-4">
                  {activeTab === 'qr' ? (
                    <div className="space-y-3.5">
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Pindai kode QR asli di atas (atau di sebelah kanan) dengan WhatsApp di HP Anda untuk menghubungkan secara aman:
                      </p>
                      <ol className="space-y-2.5 text-xs sm:text-sm text-slate-200">
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center text-xs font-bold shrink-0">
                            1
                          </span>
                          <span>Buka aplikasi <strong>WhatsApp</strong> di ponsel Anda.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center text-xs font-bold shrink-0">
                            2
                          </span>
                          <span>
                            Ketuk <strong>Pengaturan</strong> (iOS) atau <strong>Menu ⋮</strong> (Android) &gt; pilih{' '}
                            <strong>Perangkat Tertaut</strong>.
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center text-xs font-bold shrink-0">
                            3
                          </span>
                          <span>Ketuk <strong>Tautkan Perangkat</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center text-xs font-bold shrink-0">
                            4
                          </span>
                          <span>Arahkan kamera ponsel Anda ke kode QR yang tersedia.</span>
                        </li>
                      </ol>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleRefreshQr}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 ios-liquid-btn"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRealQr ? 'animate-spin' : ''}`} />
                          <span>{isLoadingRealQr ? 'Menghubungi Server WhatsApp...' : 'Segarkan Kode QR Sekarang'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Phone Number Pairing Code Tab */
                    <div className="space-y-4">
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Masukkan nomor WhatsApp Anda untuk meminta 8 digit kode tautan resmi langsung dari server WhatsApp:
                      </p>

                      <div className="space-y-2">
                        <label className="text-xs text-slate-300 font-semibold block">
                          Nomor WhatsApp (Contoh: 0812xxxx atau 62812xxxx)
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={phoneNumberInput}
                            onChange={(e) => setPhoneNumberInput(e.target.value)}
                            placeholder="081234567890"
                            className="flex-1 px-4 py-2.5 rounded-2xl ios-glass-subtle text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs sm:text-sm font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleRequestPairingCode}
                            disabled={isLoadingRealQr}
                            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold shadow-md ios-liquid-btn shrink-0 flex items-center justify-center gap-2"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>{isLoadingRealQr ? 'Meminta...' : 'Minta Kode 8 Digit'}</span>
                          </button>
                        </div>
                      </div>

                      {pairingCode ? (
                        <div className="p-4 rounded-3xl ios-liquid-capsule border border-emerald-400/40 space-y-2 animate-spring-pop">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wider text-slate-300 font-bold">
                              Kode Tautan 8 Digit Anda:
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyCode}
                              className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold text-white flex items-center gap-1.5 ios-liquid-btn"
                            >
                              {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <div className="text-center py-2">
                            <span className="text-2xl sm:text-3xl font-mono font-extrabold tracking-widest text-emerald-300 bg-black/30 px-5 py-1.5 rounded-2xl inline-block border border-emerald-500/30">
                              {pairingCode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 text-center">
                            Notifikasi dari WhatsApp akan masuk di HP Anda. Ketuk notifikasi dan masukkan 8 digit kode di atas.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl ios-glass-subtle text-xs text-slate-400 flex items-start gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>
                            Kode 8 digit dibuat langsung oleh server WhatsApp resmi secara terenkripsi dan otomatis tersambung saat Anda memasukkannya di HP.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Visual QR Code for Desktop View (`hidden md:flex`) */}
                <div className="hidden md:flex md:col-span-5 flex-col items-center justify-center">
                  <div className="relative p-6 rounded-[28px] ios-glass-card flex flex-col items-center text-center shadow-xl border border-white/20">
                    <div className="relative w-60 h-60 rounded-2xl p-2 bg-white flex items-center justify-center overflow-hidden border border-slate-200 shadow-inner">
                      {realQrCodeDataUrl ? (
                        <img
                          src={realQrCodeDataUrl}
                          alt="Kode QR WhatsApp Asli"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="relative w-full h-full flex flex-col items-center justify-center text-slate-700 p-4">
                          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                          <span className="text-xs font-bold text-slate-800">Menyiapkan QR Asli...</span>
                          <span className="text-[11px] text-slate-500 mt-1">
                            Menghubungi WebSocket Multi-Device WhatsApp
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10b981] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="mt-4 flex items-center justify-between w-full text-xs text-slate-300 px-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                        Otomatis segarkan ({qrTimer}d)
                      </span>
                      <button
                        type="button"
                        onClick={handleRefreshQr}
                        className="text-emerald-400 hover:text-emerald-300 font-bold text-xs ios-liquid-btn"
                      >
                        Muat Ulang QR
                      </button>
                    </div>
                  </div>

                  <div className="mt-3.5 px-4 py-1.5 rounded-full ios-liquid-capsule text-xs text-slate-200 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        realBackendStatus === 'connected'
                          ? 'bg-emerald-400'
                          : realBackendStatus === 'qr_ready'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span className="font-semibold text-[11px]">
                      {realBackendStatus === 'connected'
                        ? 'WhatsApp Asli Terhubung!'
                        : realBackendStatus === 'qr_ready'
                        ? 'QR Asli Siap Dipindai'
                        : 'Socket Multi-Device Siap'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer info */}
      <footer className="relative z-10 text-[11px] sm:text-xs text-slate-400 text-center max-w-2xl mx-auto py-2">
        <p>
          iGlass WA Companion menggunakan protokol resmi WhatsApp Multi-Device dengan antarmuka <strong>iOS 26 Liquid Glass</strong>, sinkronisasi profil asli realtime, dan <strong>Floating Chat Boom</strong>.
        </p>
      </footer>
    </div>
  );
};
