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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-slate-100">
      {/* Dynamic iOS 26 Liquid Glass Ambient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[420px] h-[420px] bg-emerald-500/22 rounded-full blur-[110px] pointer-events-none animate-liquid-orb" />
      <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[420px] bg-teal-400/18 rounded-full blur-[120px] pointer-events-none animate-liquid-orb-slow" />
      <div className="absolute top-1/3 right-1/3 w-[340px] h-[340px] bg-indigo-500/16 rounded-full blur-[110px] pointer-events-none animate-liquid-orb" />

      {/* Top mini liquid glass bar */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl ios-glass-card flex items-center justify-center shadow-lg shadow-emerald-500/15">
            <Smartphone className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
              WhatsApp iGlass Liquid Pro
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                100% Real Multi-Device Engine
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Profil Asli Otomatis · Floating Chat Boom · Anti-Centang Biru · Buka 1x Lihat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/api/source-zip"
            download="iGlass-WA-Companion-SourceCode.zip"
            className="px-3.5 py-2 rounded-2xl ios-liquid-capsule text-xs font-bold text-emerald-300 flex items-center gap-1.5 ios-liquid-btn"
          >
            <span>📦 Unduh Source Code (.zip)</span>
          </a>
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="px-3.5 py-2 rounded-2xl ios-glass-subtle text-xs font-bold text-slate-200 ios-liquid-btn"
            aria-label="Ubah Tema"
          >
            {darkMode ? '🌙 Gelap' : '☀️ Terang'}
          </button>
        </div>
      </header>

      {/* Main Liquid Glass Card Container */}
      <main className="relative z-10 w-full max-w-4xl rounded-[32px] ios-glass-card p-6 md:p-10 my-16 animate-spring-pop">
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
              <span>Enkripsi end-to-end terverifikasi oleh protokol Signal WhatsApp</span>
            </div>
          </div>
        ) : (
          /* Real QR / Pairing Code Selection */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Column: Instructions & Tab switch */}
            <div className="md:col-span-7 space-y-5">
              {/* Feature Highlights Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl ios-glass-subtle flex flex-col gap-1">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-bold text-white">Floating Boom</span>
                  <span className="text-[10px] text-slate-300">Melayang di tiap chat</span>
                </div>
                <div className="p-3 rounded-2xl ios-glass-subtle flex flex-col gap-1">
                  <EyeOff className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-bold text-white">Anti Centang Biru</span>
                  <span className="text-[10px] text-slate-300">Buka & balas tetap abu</span>
                </div>
                <div className="p-3 rounded-2xl ios-glass-subtle flex flex-col gap-1">
                  <Lock className="w-4 h-4 text-teal-400" />
                  <span className="text-[11px] font-bold text-white">Buka 1x Lihat</span>
                  <span className="text-[10px] text-slate-300">Simpan foto/video 1x</span>
                </div>
                <div className="p-3 rounded-2xl ios-glass-subtle flex flex-col gap-1">
                  <Download className="w-4 h-4 text-sky-400" />
                  <span className="text-[11px] font-bold text-white">Profil & Status</span>
                  <span className="text-[10px] text-slate-300">Foto profil WA asli</span>
                </div>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-400">
                  Koneksi Langsung WhatsApp Multi-Device (Semua Mod Awal OFF — Bebas Atur)
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1 tracking-tight">
                  Tautkan WhatsApp Asli Anda
                </h2>
                <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
                  Pindai kode QR asli di sebelah kanan menggunakan kamera WhatsApp di HP Anda, atau tautkan menggunakan kode angka 8 digit. Foto profil asli, obrolan, status, dan media langsung disinkronkan secara real-time.
                </p>
              </div>

              {/* Segmented Control for Method */}
              <div className="inline-flex p-1 rounded-2xl ios-glass-subtle">
                <button
                  type="button"
                  onClick={() => setActiveTab('qr')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ios-liquid-btn ${
                    activeTab === 'qr'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  Pindai Kode QR
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ios-liquid-btn ${
                    activeTab === 'code'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
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
                    <label className="text-xs text-slate-300 font-medium">
                      Masukkan Nomor WhatsApp Aktif (Contoh: 0812xxxx atau 62812xxxx)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={phoneNumberInput}
                        onChange={(e) => setPhoneNumberInput(e.target.value)}
                        placeholder="081234567890"
                        className="flex-1 px-4 py-2.5 rounded-2xl ios-glass-subtle text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleRequestPairingCode}
                        disabled={isLoadingRealQr}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold ios-liquid-btn shrink-0"
                      >
                        Minta Kode
                      </button>
                    </div>
                  </div>
                  {pairingCode ? (
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl ios-liquid-capsule animate-spring-pop">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-300 block">
                          Kode Tautan WhatsApp Anda:
                        </span>
                        <span className="text-lg md:text-2xl font-mono font-extrabold tracking-widest text-emerald-300">
                          {pairingCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="ml-auto px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white flex items-center gap-1.5 ios-liquid-btn"
                      >
                        {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : null}
                        {isCopied ? 'Tersalin' : 'Salin Kode'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Ketik nomor WhatsApp Anda lalu klik <strong>Minta Kode</strong> untuk mendapatkan 8 digit kode tautan resmi dari server WhatsApp.
                    </p>
                  )}
                </div>
              )}

              {/* Action Trigger Button */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'code') {
                      handleRequestPairingCode();
                    } else {
                      handleRefreshQr();
                    }
                  }}
                  className="flex-1 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 ios-liquid-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRealQr ? 'animate-spin' : ''}`} />
                  <span>
                    {isLoadingRealQr
                      ? 'Menghubungkan ke Server WhatsApp...'
                      : activeTab === 'code'
                      ? 'Perbarui Kode Tautan Nomor HP'
                      : 'Perbarui Kode QR WhatsApp Asli'}
                  </span>
                </button>
              </div>
            </div>

            {/* Right Column: Visual QR Code */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative p-6 rounded-[28px] ios-glass-card flex flex-col items-center text-center">
                {/* QR Code Canvas */}
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

                  {/* Animated Scanning Laser Line */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10b981] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* QR Timer & Refresh Info */}
                <div className="mt-4 flex items-center justify-between w-full text-xs text-slate-300">
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

              {/* Server Status Badge */}
              <div className="mt-4 px-4 py-2 rounded-full ios-liquid-capsule text-xs text-slate-200 flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    realBackendStatus === 'connected'
                      ? 'bg-emerald-400'
                      : realBackendStatus === 'qr_ready'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="font-semibold">
                  {realBackendStatus === 'connected'
                    ? 'WhatsApp Asli Terhubung!'
                    : realBackendStatus === 'qr_ready'
                    ? 'QR Asli Siap Dipindai'
                    : 'Socket Multi-Device Siap'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="relative z-10 text-xs text-slate-400 text-center max-w-2xl">
        <p>
          iGlass WA Companion menggunakan protokol resmi WhatsApp Multi-Device dengan desain <strong>iOS 26 Liquid Glass</strong>, sinkronisasi profil asli otomatis, dan <strong>Floating Chat Boom</strong>.
        </p>
      </footer>
    </div>
  );
};
