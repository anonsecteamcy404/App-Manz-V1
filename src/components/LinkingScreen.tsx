import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import {
  Smartphone,
  QrCode,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Laptop,
  Radio,
  Flame,
} from 'lucide-react';

export const LinkingScreen: React.FC = () => {
  const {
    connectionState,
    syncProgress,
    syncStatusText,
    pairingCode,
    startPairing,
    startRealWhatsAppBackend,
    realQrCodeDataUrl,
    realBackendStatus,
    phoneInfo,
    darkMode,
    setDarkMode,
  } = useWhatsApp();

  const [connectionMode, setConnectionMode] = useState<'real' | 'demo'>('real');
  const [activeTab, setActiveTab] = useState<'qr' | 'code'>('qr');
  const [phoneNumberInput, setPhoneNumberInput] = useState(phoneInfo.phoneNumber);
  const [qrTimer, setQrTimer] = useState(60);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoadingRealQr, setIsLoadingRealQr] = useState(false);

  // Auto-request real QR when in 'real' mode
  useEffect(() => {
    if (connectionMode === 'real' && connectionState === 'disconnected' && !realQrCodeDataUrl) {
      setIsLoadingRealQr(true);
      fetch('/api/whatsapp/start', { method: 'POST' })
        .then(() => setIsLoadingRealQr(false))
        .catch(() => setIsLoadingRealQr(false));
    }
  }, [connectionMode, connectionState, realQrCodeDataUrl]);

  // Countdown timer
  useEffect(() => {
    if (connectionState !== 'disconnected') return;
    const timer = setInterval(() => {
      setQrTimer((prev) => (prev > 1 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, [connectionState]);

  const handleCopyCode = () => {
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

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-slate-100">
      {/* Dynamic Ambient Glass Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top mini glass bar */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center backdrop-blur-md shadow-lg shadow-emerald-500/10">
            <Smartphone className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              WhatsApp iGlass
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                Backend Baileys Real Aktif
              </span>
            </h1>
            <p className="text-xs text-slate-400">Hubungkan sesi aman & ekspor otomatis</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/api/source-zip"
            download="iGlass-WA-Companion-SourceCode.zip"
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-xs font-semibold text-emerald-300 backdrop-blur-md transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>📦 Unduh Source Code (.zip)</span>
          </a>
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-slate-200 backdrop-blur-md transition-all"
            aria-label="Ubah Tema"
          >
            {darkMode ? '🌙 Gelap' : '☀️ Terang'}
          </button>
        </div>
      </header>

      {/* Main Glass Card Container */}
      <main className="relative z-10 w-full max-w-4xl rounded-3xl ios-glass-card shadow-2xl p-6 md:p-10 my-16 border border-white/20">
        {connectionState === 'syncing' ? (
          /* Handshake & Syncing State */
          <div className="py-12 flex flex-col items-center text-center max-w-md mx-auto">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <div className="absolute inset-2 rounded-full bg-emerald-500/10 backdrop-blur-md flex items-center justify-center">
                <Laptop className="w-8 h-8 text-emerald-400 animate-bounce" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Menyinkronkan Perangkat Tertaut</h2>
            <p className="text-sm text-slate-300 mb-6">{syncStatusText}</p>

            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10 mb-3">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-emerald-300 tabular-nums">{syncProgress}% selesai</span>

            <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Enkripsi end-to-end terverifikasi oleh protokol Signal</span>
            </div>
          </div>
        ) : (
          /* Normal QR / Pairing Code Selection */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Column: Instructions & Tab switch */}
            <div className="md:col-span-7 space-y-5">
              {/* Connection Mode Selector (Real vs Demo) */}
              <div className="p-1 rounded-2xl bg-black/40 border border-white/15 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setConnectionMode('real')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    connectionMode === 'real'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                  <span>Koneksi WhatsApp Asli (Real HP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConnectionMode('demo')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    connectionMode === 'demo'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-300" />
                  <span>Mode Demo Interaktif</span>
                </button>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                  {connectionMode === 'real'
                    ? 'Protokol Multi-Device WhatsApp Asli'
                    : 'Pratinjau Antarmuka Demo'}
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1 tracking-tight">
                  Tautkan WhatsApp ke Layar Ini
                </h2>
                <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
                  {connectionMode === 'real'
                    ? 'Pindai kode QR asli di sebelah kanan dengan kamera WhatsApp di ponsel Anda (Pengaturan > Perangkat Tertaut > Tautkan Perangkat).'
                    : 'Jelajahi antarmuka iOS Glass, kirim pesan simulasi, dan uji fitur pencadangan otomatis tanpa perlu HP saat ini.'}
                </p>
              </div>

              {/* Segmented Control for Method */}
              <div className="inline-flex p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('qr')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'qr'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  Pindai Kode QR
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'code'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  Tautkan dengan Nomor HP
                </button>
              </div>

              {/* Step by Step in Indonesian */}
              {activeTab === 'qr' ? (
                <ol className="space-y-3 text-xs md:text-sm text-slate-200">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center text-xs font-bold shrink-0">
                      1
                    </span>
                    <span>
                      Buka aplikasi <strong>WhatsApp</strong> di ponsel Anda.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center text-xs font-bold shrink-0">
                      2
                    </span>
                    <span>
                      Ketuk <strong>Pengaturan</strong> (iOS) atau <strong>Menu ⋮</strong> (Android) &gt; pilih{' '}
                      <strong>Perangkat Tertaut</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center text-xs font-bold shrink-0">
                      3
                    </span>
                    <span>
                      Ketuk <strong>Tautkan Perangkat</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center text-xs font-bold shrink-0">
                      4
                    </span>
                    <span>
                      Arahkan kamera ponsel Anda ke kode QR di layar sebelah kanan.
                    </span>
                  </li>
                </ol>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">Nomor WhatsApp Anda</label>
                    <input
                      type="text"
                      value={phoneNumberInput}
                      onChange={(e) => setPhoneNumberInput(e.target.value)}
                      placeholder="+62 812-xxxx-xxxx"
                      className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/30 border border-white/15">
                    <span className="text-lg md:text-xl font-mono font-extrabold tracking-widest text-emerald-300">
                      {pairingCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="ml-auto px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-200 transition-all flex items-center gap-1.5"
                    >
                      {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : null}
                      {isCopied ? 'Tersalin' : 'Salin'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Trigger Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {connectionMode === 'real' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'code') {
                        startRealWhatsAppBackend(phoneNumberInput);
                      } else {
                        handleRefreshQr();
                      }
                    }}
                    className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRealQr ? 'animate-spin' : ''}`} />
                    <span>{isLoadingRealQr ? 'Menghubungkan ke WhatsApp...' : 'Perbarui QR WhatsApp Asli'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startPairing(activeTab)}
                    className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <span>Masuk Mode Demo Langsung</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {connectionMode === 'real' && (
                  <button
                    type="button"
                    onClick={() => startPairing('qr')}
                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/15 transition-all text-center"
                    title="Uji coba langsung jika HP sedang tidak di dekat Anda"
                  >
                    Coba Demo Tanpa HP
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Visual QR Code or Pairing Graphic */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative p-6 rounded-3xl bg-white/95 dark:bg-slate-900/90 shadow-2xl border border-white/30 backdrop-blur-xl flex flex-col items-center text-center">
                {/* QR Code Canvas */}
                <div className="relative w-56 h-56 rounded-2xl p-2 bg-white flex items-center justify-center overflow-hidden border border-slate-200 shadow-inner">
                  {realQrCodeDataUrl ? (
                    /* Real QR Code generated by Baileys WhatsApp Server! */
                    <img
                      src={realQrCodeDataUrl}
                      alt="Kode QR WhatsApp Asli"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    /* Fallback / Loading QR Code */
                    <div className="relative w-full h-full flex items-center justify-center">
                      <svg
                        viewBox="0 0 100 100"
                        className="w-full h-full text-slate-900 opacity-90"
                        fill="currentColor"
                      >
                        <rect x="5" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                        <rect x="9" y="9" width="20" height="20" rx="2" fill="#ffffff" />
                        <rect x="13" y="13" width="12" height="12" rx="2" fill="#059669" />

                        <rect x="67" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                        <rect x="71" y="9" width="20" height="20" rx="2" fill="#ffffff" />
                        <rect x="75" y="13" width="12" height="12" rx="2" fill="#059669" />

                        <rect x="5" y="67" width="28" height="28" rx="4" fill="#0f172a" />
                        <rect x="9" y="71" width="20" height="20" rx="2" fill="#ffffff" />
                        <rect x="13" y="75" width="12" height="12" rx="2" fill="#059669" />

                        <rect x="38" y="10" width="6" height="6" rx="1" fill="#0f172a" />
                        <rect x="48" y="8" width="6" height="6" rx="1" fill="#0f172a" />
                        <rect x="38" y="22" width="6" height="6" rx="1" fill="#0f172a" />
                        <rect x="52" y="24" width="6" height="6" rx="1" fill="#059669" />

                        <rect x="10" y="40" width="6" height="6" rx="1" fill="#0f172a" />
                        <rect x="22" y="42" width="6" height="6" rx="1" fill="#059669" />
                        <rect x="40" y="40" width="20" height="20" rx="4" fill="#059669" />
                        <circle cx="50" cy="50" r="5" fill="#ffffff" />

                        <rect x="68" y="42" width="6" height="6" rx="1" fill="#0f172a" />
                        <rect x="80" y="40" width="6" height="6" rx="1" fill="#0f172a" />
                        <rect x="72" y="52" width="6" height="6" rx="1" fill="#059669" />

                        <rect x="40" y="70" width="8" height="8" rx="1" fill="#0f172a" />
                        <rect x="55" y="72" width="8" height="8" rx="1" fill="#0f172a" />
                        <rect x="48" y="84" width="8" height="8" rx="1" fill="#059669" />
                        <rect x="70" y="70" width="6" height="6" rx="1" fill="#0f172a" />
                        <rect x="82" y="82" width="12" height="12" rx="2" fill="#0f172a" />
                      </svg>
                      {isLoadingRealQr && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-600">
                          <RefreshCw className="w-8 h-8 animate-spin" />
                          <span className="text-[11px] font-bold mt-2">Mengambil QR Asli...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Animated Scanning Laser Line */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10b981] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* QR Timer & Refresh Info */}
                <div className="mt-4 flex items-center justify-between w-full text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                    Segarkan ({qrTimer}d)
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshQr}
                    className="text-emerald-500 hover:text-emerald-400 font-semibold text-xs"
                  >
                    Muat Ulang
                  </button>
                </div>
              </div>

              {/* Server Status Badge */}
              <div className="mt-4 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-slate-300 flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    realBackendStatus === 'connected'
                      ? 'bg-emerald-400'
                      : realBackendStatus === 'qr_ready'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-400'
                  }`}
                />
                <span>
                  {realBackendStatus === 'connected'
                    ? 'WhatsApp Asli Terhubung!'
                    : realBackendStatus === 'qr_ready'
                    ? 'QR Asli Siap Dipindai'
                    : 'Backend Multi-Device Siap'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="relative z-10 text-xs text-slate-400 text-center max-w-xl">
        <p>
          iGlass WA Companion mendukung protokol WhatsApp Multi-Device resmi via WebSocket terenkripsi.
          Riwayat obrolan, kontak, dan berkas media disinkronkan langsung ke komputer lokal Anda tanpa perantara server pihak ketiga.
        </p>
      </footer>
    </div>
  );
};
