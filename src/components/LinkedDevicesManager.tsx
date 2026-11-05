import React from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import { Laptop, Smartphone, ShieldCheck, LogOut, Globe, Clock, X } from 'lucide-react';

export const LinkedDevicesManager: React.FC = () => {
  const {
    linkedSessions,
    unlinkSession,
    disconnectDevice,
    phoneInfo,
    setIsLinkedDevicesOpen,
  } = useWhatsApp();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Perangkat Tertaut</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola sesi aktif WhatsApp Anda di komputer dan tablet lain
          </p>
        </div>
      </div>

      {/* Main Paired Phone Card */}
      <div className="p-6 rounded-3xl ios-glass-card border border-white/20 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ponsel Utama: {phoneInfo.model}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                Tersinkronisasi
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
              {phoneInfo.phoneNumber} · {phoneInfo.network}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Baterai: {phoneInfo.battery}% {phoneInfo.isCharging ? '(Mengisi Daya)' : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={disconnectDevice}
          className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Perangkat Ini</span>
        </button>
      </div>

      {/* Active Sessions List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Sesi Browser & Aplikasi Aktif ({linkedSessions.length})
        </h3>

        <div className="rounded-3xl ios-glass-card border border-white/20 divide-y divide-black/5 dark:divide-white/5 overflow-hidden shadow-sm">
          {linkedSessions.map((session) => (
            <div
              key={session.id}
              className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {session.name}
                    </p>
                    {session.isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                        Sesi Ini
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {session.lastActive}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      {session.location} ({session.ipAddress})
                    </span>
                  </div>
                </div>
              </div>

              {!session.isCurrent ? (
                <button
                  type="button"
                  onClick={() => unlinkSession(session.id)}
                  className="px-3 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium border border-transparent hover:border-rose-500/20 transition-colors self-end sm:self-center"
                >
                  Cabut Akses
                </button>
              ) : (
                <span className="text-xs text-emerald-500 font-semibold self-end sm:self-center">
                  Aktif Sekarang
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security Guarantee Notice */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Keamanan Enkripsi End-to-End Multidevice</p>
          <p className="text-[11px] opacity-90 leading-relaxed">
            Pesan, media, dan panggilan Anda tetap terenkripsi secara end-to-end langsung ke ponsel Anda.
            Kunci sesi disimpan secara privat di dalam peramban web ini dan otomatis dimusnahkan saat Anda menekan tombol keluar.
          </p>
        </div>
      </div>
    </div>
  );
};
