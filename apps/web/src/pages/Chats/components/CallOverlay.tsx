import { Chat } from '../../../shared/types';

interface CallOverlayProps {
  callStatus: 'idle' | 'calling' | 'ringing' | 'active';
  callingPartner?: Chat;
  callDuration: number;
  isMicMuted: boolean;
  isSpeakerOn: boolean;
  formatDuration: (seconds: number) => string;
  getChatAvatar: (chat?: Chat) => string | undefined;
  handleAcceptCall: () => void;
  handleDeclineCall: () => void;
  handleHangUp: () => void;
  toggleMic: () => void;
  toggleSpeaker: () => void;
}

export const CallOverlay = ({
  callStatus,
  callingPartner,
  callDuration,
  isMicMuted,
  isSpeakerOn,
  formatDuration,
  getChatAvatar,
  handleAcceptCall,
  handleDeclineCall,
  handleHangUp,
  toggleMic,
  toggleSpeaker,
}: CallOverlayProps) => {
  if (callStatus === 'idle') return null;

  const callStyles = `
    @keyframes ripple {
      0% { transform: scale(1); opacity: 0.4; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .animate-ripple {
      animation: ripple 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    @keyframes bounce-slow {
      0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
      50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
    }
    .animate-bounce-slow {
      animation: bounce-slow 2s infinite;
    }
  `;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <style>{callStyles}</style>
      {/* Background with blur */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-all duration-500" />
      
      {/* Main Container */}
      <div className="relative w-full max-w-md aspect-[9/16] sm:aspect-auto sm:h-[600px] rounded-[2.5rem] bg-slate-900/40 border border-white/10 shadow-2xl flex flex-col items-center justify-between p-8 overflow-hidden">
        
        {/* Top section: Info */}
        <div className="w-full text-center mt-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-400 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${callStatus === 'active' ? 'bg-green-400' : 'bg-blue-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${callStatus === 'active' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
            </span>
            {callStatus === 'calling' && 'Звоним...'}
            {callStatus === 'ringing' && 'Входящий звонок'}
            {callStatus === 'active' && 'Звонок активен'}
          </div>
          
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {callingPartner?.title || 'StudentHub'}
          </h2>
          
          {callStatus === 'active' && (
            <p className="text-xl font-mono text-white/60 tabular-nums">
              {formatDuration(callDuration)}
            </p>
          )}
        </div>

        {/* Middle section: Avatar */}
        <div className="relative">
          {(callStatus === 'calling' || callStatus === 'ringing') && (
            <>
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ripple" />
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ripple" style={{ animationDelay: '0.6s' }} />
              <div className="absolute inset-0 rounded-full bg-blue-500/5 animate-ripple" style={{ animationDelay: '1.2s' }} />
            </>
          )}
          
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-white/10 overflow-hidden shadow-2xl bg-slate-800 flex items-center justify-center">
            {getChatAvatar(callingPartner) ? (
              <img 
                src={getChatAvatar(callingPartner)!} 
                alt={callingPartner?.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-5xl font-bold">
                {callingPartner?.title?.[0] || 'S'}
              </div>
            )}
          </div>
        </div>

        {/* Bottom section: Actions */}
        <div className="w-full mb-8 space-y-8">
          
          {callStatus === 'ringing' ? (
            <div className="flex items-center justify-around w-full px-4">
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleDeclineCall}
                  className="group w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
                >
                  <svg className="w-8 h-8 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </button>
                <span className="text-xs text-white/60 font-medium">Отклонить</span>
              </div>
              
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleAcceptCall}
                  className="group w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 animate-bounce-slow"
                >
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </button>
                <span className="text-xs text-white/60 font-medium">Принять</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8">
              <div className="flex items-center justify-center gap-8">
                <button
                  onClick={toggleMic}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isMicMuted ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-white/10 text-white border border-white/20'}`}
                >
                  {isMicMuted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={toggleSpeaker}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${!isSpeakerOn ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-white/10 text-white border border-white/20'}`}
                >
                  {isSpeakerOn ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
              </div>

              <button
                onClick={handleHangUp}
                className="group w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
              >
                <svg className="w-8 h-8 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
