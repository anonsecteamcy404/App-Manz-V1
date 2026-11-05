import React from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';

export const CallsView: React.FC = () => {
  const { calls, contacts, startCall } = useWhatsApp();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Riwayat Panggilan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log panggilan masuk dan keluar real-time dari perangkat WhatsApp Anda
          </p>
        </div>
      </div>

      {/* Quick Start Call Cards */}
      {contacts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Kontak Tersinkronisasi ({contacts.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {contacts.slice(0, 9).map((contact) => (
              <div
                key={contact.id}
                className="p-3.5 rounded-2xl ios-glass-card border border-white/20 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {contact.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {contact.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startCall(contact.id, 'audio')}
                    className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    title="Panggilan audio"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startCall(contact.id, 'video')}
                    className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 transition-colors"
                    title="Panggilan video"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call History List */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Aktivitas Panggilan Terakhir ({calls.length})
        </h3>
        {calls.length === 0 ? (
          <div className="p-10 rounded-3xl ios-glass-card border border-white/15 text-center space-y-2">
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              Belum Ada Panggilan Baru
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Panggilan suara dan video yang masuk ke nomor WhatsApp Anda saat sesi ini aktif akan tercatat secara otomatis di halaman ini.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl ios-glass-card border border-white/20 divide-y divide-black/5 dark:divide-white/5 overflow-hidden shadow-sm">
            {calls.map((call) => {
              const isMissed = call.direction === 'missed';
              const isIncoming = call.direction === 'incoming';

              return (
                <div
                  key={call.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={call.contactAvatar}
                      alt={call.contactName}
                      className="w-11 h-11 rounded-2xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isMissed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {call.contactName}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {isMissed && <PhoneMissed className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                        {isIncoming && <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {!isMissed && !isIncoming && <PhoneOutgoing className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                        <span>{call.timestamp}</span>
                        {call.duration && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[11px]">{call.duration}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => startCall(call.contactId, call.type)}
                      className="p-2.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors"
                      title={`Panggil ulang ${call.type}`}
                    >
                      {call.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    </button>
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
