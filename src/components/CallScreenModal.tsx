import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Video, VideoOff } from 'lucide-react';

export const CallScreenModal: React.FC = () => {
  const { activeCall, endCall } = useWhatsApp();
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);

  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') return;
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeCall]);

  if (!activeCall) return null;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm h-[600px] rounded-3xl ios-glass-card border border-white/20 overflow-hidden flex flex-col justify-between p-8 text-center text-white shadow-2xl">
        {/* Top Call Info */}
        <div className="space-y-3 pt-6">
          <div className="relative w-24 h-24 mx-auto">
            <img
              src={activeCall.contact.avatar}
              alt={activeCall.contact.name}
              className="w-full h-full rounded-full object-cover border-4 border-white/20 shadow-xl"
            />
            {activeCall.status === 'ringing' && (
              <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping pointer-events-none" />
            )}
          </div>

          <div>
            <h3 className="text-xl font-bold tracking-tight">{activeCall.contact.name}</h3>
            <p className="text-xs text-slate-300 font-mono mt-1">
              {activeCall.status === 'ringing' ? 'Memanggil...' : `Tersambung · ${formatTimer(seconds)}`}
            </p>
          </div>

          {activeCall.status === 'connected' && (
            <div className="flex items-center justify-center gap-1.5 h-6">
              {[30, 70, 45, 90, 60, 80, 50, 65, 40].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-emerald-400 rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Video simulation preview box if type is video */}
        {activeCall.type === 'video' && !isVideoDisabled && (
          <div className="w-full h-44 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-slate-900 to-emerald-950">
              <span className="text-xs text-emerald-300 font-medium">Kamera HD Aktif</span>
            </div>
            <div className="absolute bottom-2 right-2 w-16 h-20 rounded-xl bg-slate-800 border border-white/20 overflow-hidden flex items-center justify-center text-[10px] text-slate-300 shadow-md">
              Kamera Anda
            </div>
          </div>
        )}

        {/* Call Controls Bar */}
        <div className="space-y-6 pb-4">
          <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center backdrop-blur-md transition-all active:scale-95 ${
                isMuted ? 'bg-white text-slate-900' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
              aria-label={isMuted ? 'Nyalakan mikrofon' : 'Bisukan mikrofon'}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              type="button"
              onClick={() => setIsSpeaker(!isSpeaker)}
              className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center backdrop-blur-md transition-all active:scale-95 ${
                isSpeaker ? 'bg-white text-slate-900' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
              aria-label={isSpeaker ? 'Matikan speaker' : 'Nyalakan speaker'}
            >
              {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </button>

            {activeCall.type === 'video' && (
              <button
                type="button"
                onClick={() => setIsVideoDisabled(!isVideoDisabled)}
                className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center backdrop-blur-md transition-all active:scale-95 ${
                  isVideoDisabled ? 'bg-white text-slate-900' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                aria-label={isVideoDisabled ? 'Nyalakan video' : 'Matikan video'}
              >
                {isVideoDisabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}
          </div>

          {/* End Call Button */}
          <button
            type="button"
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white mx-auto flex items-center justify-center shadow-lg shadow-rose-600/40 active:scale-95 transition-transform"
            aria-label="Akhiri panggilan"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};
