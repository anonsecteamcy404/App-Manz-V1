import React, { useState } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import {
  ShieldCheck,
  EyeOff,
  LockOpen,
  Download,
  Trash2,
  Ghost,
  Zap,
  Sliders,
  CheckCircle2,
  Sparkles,
  UserPlus,
  Activity,
  Power,
} from 'lucide-react';

export const ModSettingsView: React.FC = () => {
  const { modConfig, updateModConfig, boomStatus, stopChatBoom } = useWhatsApp();
  const [savedToast, setSavedToast] = useState(false);

  const triggerSaved = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const handleToggleMod = (key: keyof typeof modConfig, value: boolean) => {
    updateModConfig({ [key]: value });
    triggerSaved();
  };

  const handleToggleAntiBan = (
    key: keyof typeof modConfig.antiBanGuard,
    value: boolean | number
  ) => {
    const nextGuard = {
      ...modConfig.antiBanGuard,
      [key]: value,
    };
    // Automatically enable master guard if any sub-feature is turned on
    if (typeof value === 'boolean' && value === true && key !== 'enabled') {
      nextGuard.enabled = true;
    }
    updateModConfig({
      antiBanGuard: nextGuard,
    });
    triggerSaved();
  };

  const handleSetAllFeatures = (turnOn: boolean) => {
    updateModConfig({
      antiBlueTick: turnOn,
      antiBlueTickOnReply: turnOn,
      antiViewOnce: turnOn,
      autoSaveStatus: turnOn,
      antiRevokeMessage: turnOn,
      hideOnlineStatus: turnOn,
      antiBanGuard: {
        ...modConfig.antiBanGuard,
        enabled: turnOn,
        humanTypingSimulation: turnOn,
        adaptiveJitterDelay: turnOn,
        invisibleZeroWidthVariation: turnOn,
        autoWarmupNewContacts: turnOn,
      },
    });
    triggerSaved();
  };

  const activeCount = [
    modConfig.antiBlueTick,
    modConfig.antiBlueTickOnReply,
    modConfig.antiViewOnce,
    modConfig.autoSaveStatus,
    modConfig.antiRevokeMessage,
    modConfig.hideOnlineStatus,
    modConfig.antiBanGuard.enabled,
  ].filter(Boolean).length;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 animate-spring-pop">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl ios-glass-card">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
              iGlass Liquid Mod v3.0
            </span>
            <span className="px-2.5 py-0.5 rounded-full ios-glass-subtle text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {activeCount} / 7 Modul Aktif
            </span>
            {savedToast && (
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-400 text-[10px] font-bold flex items-center gap-1 animate-spring-pop">
                <CheckCircle2 className="w-3 h-3" /> Tersinkron ke Server WA
              </span>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
            Pusat Kontrol Mod Privasi & Anti-Ban
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Secara bawaan seluruh fitur diatur <strong>OFF</strong>. Nyalakan fitur yang Anda butuhkan secara manual atau aktifkan sekaligus.
          </p>
        </div>

        {/* Master 1-Click Enable / Disable All Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSetAllFeatures(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 ios-liquid-btn"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Nyalakan Semua</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetAllFeatures(false)}
            className="px-3.5 py-2.5 rounded-2xl ios-glass-subtle hover:bg-rose-500/15 text-slate-700 dark:text-slate-200 hover:text-rose-400 text-xs font-bold ios-liquid-btn"
          >
            Matikan Semua
          </button>
        </div>
      </div>

      {/* Live Chat Boom Monitor if active */}
      {boomStatus.isRunning && (
        <div className="p-4 rounded-3xl ios-liquid-capsule text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-spring-pop">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center animate-pulse">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-amber-300">
                Chat Boom Sedang Berjalan ({boomStatus.sent}/{boomStatus.total} terkirim)
              </p>
              <p className="text-[11px] text-white/80">
                Pesan: "{boomStatus.text || ''}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={stopChatBoom}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shrink-0 ios-liquid-btn"
          >
            Hentikan Boom
          </button>
        </div>
      )}

      {/* Grid Section 1: WhatsApp Mod & Stealth Features */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5 px-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>1. Modul Privasi Siluman & Pembuka Media</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Anti Blue Tick on Read */}
          <div className="p-4 rounded-3xl ios-glass-card flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Anti Centang Biru (Saat Buka Chat)
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      modConfig.antiBlueTick
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {modConfig.antiBlueTick ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Saat Anda membuka dan membaca pesan lawan bicara, di HP mereka tetap centang dua abu-abu.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleMod('antiBlueTick', !modConfig.antiBlueTick)}
              className={`w-12 h-7 rounded-full transition-colors p-1 shrink-0 ios-liquid-btn ${
                modConfig.antiBlueTick ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-600/40'
              }`}
              aria-label="Toggle Anti Centang Biru Saat Buka Chat"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  modConfig.antiBlueTick ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Anti Blue Tick even after Reply */}
          <div className="p-4 rounded-3xl ios-glass-card flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Anti Centang Biru (Saat Balas Chat)
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      modConfig.antiBlueTickOnReply
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {modConfig.antiBlueTickOnReply ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Walaupun Anda sudah membalas pesan mereka, pesan lawan bicara tetap tidak berubah menjadi centang biru.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleMod('antiBlueTickOnReply', !modConfig.antiBlueTickOnReply)}
              className={`w-12 h-7 rounded-full transition-colors p-1 shrink-0 ios-liquid-btn ${
                modConfig.antiBlueTickOnReply
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-600/40'
              }`}
              aria-label="Toggle Anti Centang Biru Saat Balas"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  modConfig.antiBlueTickOnReply ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Anti View Once (1x Lihat Unlocker) */}
          <div className="p-4 rounded-3xl ios-glass-card flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                <LockOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Buka & Unduh Foto/Video 1x Lihat
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      modConfig.antiViewOnce
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {modConfig.antiViewOnce ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Membuka kunci semua foto, video, dan voice note sekali lihat (1x lihat) secara otomatis agar bisa dilihat & diunduh berkali-kali.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleMod('antiViewOnce', !modConfig.antiViewOnce)}
              className={`w-12 h-7 rounded-full transition-colors p-1 shrink-0 ios-liquid-btn ${
                modConfig.antiViewOnce
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-600/40'
              }`}
              aria-label="Toggle Buka 1x Lihat"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  modConfig.antiViewOnce ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Status Downloader */}
          <div className="p-4 rounded-3xl ios-glass-card flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-400/30 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Unduh Status / Story Kontak Otomatis
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      modConfig.autoSaveStatus
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {modConfig.autoSaveStatus ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Simpan foto & video dari Status WhatsApp kontak secara otomatis tanpa terlihat di daftar penonton mereka.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleMod('autoSaveStatus', !modConfig.autoSaveStatus)}
              className={`w-12 h-7 rounded-full transition-colors p-1 shrink-0 ios-liquid-btn ${
                modConfig.autoSaveStatus
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-600/40'
              }`}
              aria-label="Toggle Unduh Status Otomatis"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  modConfig.autoSaveStatus ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Anti Revoke / Delete Message */}
          <div className="p-4 rounded-3xl ios-glass-card flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-400/30 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Anti Hapus / Tarik Pesan (Anti-Revoke)
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      modConfig.antiRevokeMessage
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {modConfig.antiRevokeMessage ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Pesan yang ditarik oleh pengirim tetap tampil utuh di layar Anda dan tidak ikut terhapus.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleMod('antiRevokeMessage', !modConfig.antiRevokeMessage)}
              className={`w-12 h-7 rounded-full transition-colors p-1 shrink-0 ios-liquid-btn ${
                modConfig.antiRevokeMessage
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-600/40'
              }`}
              aria-label="Toggle Anti Hapus Pesan"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  modConfig.antiRevokeMessage ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Ghost Online Mode */}
          <div className="p-4 rounded-3xl ios-glass-card flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-400/30 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                <Ghost className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Ghost Mode (Sembunyikan Status Online)
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      modConfig.hideOnlineStatus
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {modConfig.hideOnlineStatus ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Bekukan status kehadiran sehingga akun Anda tidak terlihat "Online" atau "Sedang mengetik".
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleMod('hideOnlineStatus', !modConfig.hideOnlineStatus)}
              className={`w-12 h-7 rounded-full transition-colors p-1 shrink-0 ios-liquid-btn ${
                modConfig.hideOnlineStatus
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-600/40'
              }`}
              aria-label="Toggle Ghost Mode"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  modConfig.hideOnlineStatus ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Anti-Ban & Anti-Limit Engine */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2. Mesin Proteksi Anti-Ban, Anti-Spam & Anti-Limit</span>
          </h3>

          <button
            type="button"
            onClick={() => handleToggleAntiBan('enabled', !modConfig.antiBanGuard.enabled)}
            className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ios-liquid-btn ${
              modConfig.antiBanGuard.enabled
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                : 'ios-glass-subtle text-slate-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Master Anti-Ban: {modConfig.antiBanGuard.enabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="p-5 rounded-3xl ios-glass-card space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Human Typing Simulation */}
            <div className="p-3.5 rounded-2xl ios-glass-subtle flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Simulasi Mengetik Manusia (Human Typing)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kirim sinyal mengetik alami sebelum pesan terkirim agar tidak terdeteksi bot
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleToggleAntiBan(
                    'humanTypingSimulation',
                    !modConfig.antiBanGuard.humanTypingSimulation
                  )
                }
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ios-liquid-btn ${
                  modConfig.antiBanGuard.humanTypingSimulation ? 'bg-emerald-500' : 'bg-slate-600/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    modConfig.antiBanGuard.humanTypingSimulation ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Adaptive Jitter Delay */}
            <div className="p-3.5 rounded-2xl ios-glass-subtle flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 text-teal-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Jeda Acak Adaptif (Adaptive Jitter + Cooldown)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Acak interval pengiriman pesan & jeda istirahat tiap 10 pesan beruntun
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleToggleAntiBan(
                    'adaptiveJitterDelay',
                    !modConfig.antiBanGuard.adaptiveJitterDelay
                  )
                }
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ios-liquid-btn ${
                  modConfig.antiBanGuard.adaptiveJitterDelay ? 'bg-emerald-500' : 'bg-slate-600/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    modConfig.antiBanGuard.adaptiveJitterDelay ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Invisible Zero-Width Hash */}
            <div className="p-3.5 rounded-2xl ios-glass-subtle flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Variasi Hash Tak Kasat Mata (Anti-Spam Filter)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sisipkan karakter zero-width unik saat Chat Boom agar tiap pesan memiliki hash berbeda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleToggleAntiBan(
                    'invisibleZeroWidthVariation',
                    !modConfig.antiBanGuard.invisibleZeroWidthVariation
                  )
                }
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ios-liquid-btn ${
                  modConfig.antiBanGuard.invisibleZeroWidthVariation
                    ? 'bg-emerald-500'
                    : 'bg-slate-600/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    modConfig.antiBanGuard.invisibleZeroWidthVariation
                      ? 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Auto Warmup New Contacts */}
            <div className="p-3.5 rounded-2xl ios-glass-subtle flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserPlus className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Anti-Limit Pesan ke Nomor Baru (Contact Warm-Up)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Lakukan handshake presence otomatis sebelum mengirim chat ke nomor yang belum disimpan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleToggleAntiBan(
                    'autoWarmupNewContacts',
                    !modConfig.antiBanGuard.autoWarmupNewContacts
                  )
                }
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ios-liquid-btn ${
                  modConfig.antiBanGuard.autoWarmupNewContacts ? 'bg-emerald-500' : 'bg-slate-600/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    modConfig.antiBanGuard.autoWarmupNewContacts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Delay Range Sliders */}
          <div className="pt-3 border-t border-black/5 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Jeda Minimum Antar Pesan (Min Jitter)</span>
                <span className="font-mono text-emerald-400">{modConfig.antiBanGuard.minDelayMs} ms</span>
              </div>
              <input
                type="range"
                min={600}
                max={3000}
                step={100}
                value={modConfig.antiBanGuard.minDelayMs}
                onChange={(e) => handleToggleAntiBan('minDelayMs', Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Jeda Maksimum Antar Pesan (Max Jitter)</span>
                <span className="font-mono text-emerald-400">{modConfig.antiBanGuard.maxDelayMs} ms</span>
              </div>
              <input
                type="range"
                min={1200}
                max={6000}
                step={200}
                value={modConfig.antiBanGuard.maxDelayMs}
                onChange={(e) => handleToggleAntiBan('maxDelayMs', Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
