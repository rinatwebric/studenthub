import { useState } from 'react';
import { Chat } from '../../../shared/types';

interface ChatHeaderProps {
  showChatList: boolean;
  setShowChatList: (show: boolean) => void;
  setActiveChatId: (id: string | null) => void;
  activeChat: Chat;
  getChatAvatar: (chat?: Chat) => string | undefined;
  getChatInitial: (chat?: Chat) => React.ReactNode;
  openAddContactPanel: () => void;
  handleStartCall: () => void;
  handleClearChatHistory: () => void;
  callStatus: string;
  handleHangUp: () => void;
}

export const ChatHeader = ({
  showChatList,
  setShowChatList,
  setActiveChatId,
  activeChat,
  getChatAvatar,
  getChatInitial,
  openAddContactPanel,
  handleStartCall,
  handleClearChatHistory,
  callStatus,
  handleHangUp,
}: ChatHeaderProps) => {
  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);

  return (
    <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm relative">
      {!showChatList && (
        <button
          onClick={() => { setShowChatList(true); setActiveChatId(null); }}
          className="p-1.5 -ml-1.5 lg:hidden text-gray-500 hover:bg-gray-100 rounded-full transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Назад к чатам"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div className="w-10 h-10 rounded-full bg-[#7c9ecf] overflow-hidden flex items-center justify-center text-white font-medium shrink-0">
        {getChatAvatar(activeChat) ? (
          <img src={getChatAvatar(activeChat)} alt={activeChat.title} className="h-full w-full object-cover" />
        ) : (
          getChatInitial(activeChat)
        )}
      </div>

      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-slate-100">{activeChat.title}</p>
        <p className="text-xs text-gray-500 dark:text-slate-500">был(а) в сети недавно</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* ⋮ Chat Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowChatOptionsMenu((prev) => !prev)}
            onBlur={(e) => {
              if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                setTimeout(() => setShowChatOptionsMenu(false), 150);
              }
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${showChatOptionsMenu
              ? 'bg-[#3390ec]/15 text-[#3390ec] dark:bg-blue-500/20 dark:text-blue-400 scale-95'
              : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400'
              }`}
            title="Меню чата"
            aria-label="Меню чата"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${showChatOptionsMenu ? 'rotate-90' : 'rotate-0'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {showChatOptionsMenu && (
            <div
              className="absolute right-0 top-11 z-50 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700/60 overflow-hidden"
              style={{ animation: 'menuSlideIn 0.15s ease-out' }}
            >
              {(activeChat.isGroup || activeChat.members.length > 2) && (
                <button
                  onClick={() => {
                    setShowChatOptionsMenu(false);
                    openAddContactPanel();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13.5px] text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium">Добавить контакт</span>
                </button>
              )}

              {(!activeChat.isGroup && activeChat.members.length <= 2) && (
                <button
                  onClick={() => {
                    setShowChatOptionsMenu(false);
                    handleStartCall();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13.5px] text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="font-medium">Позвонить</span>
                </button>
              )}

              <div className="h-px bg-gray-100 dark:bg-slate-700/60 mx-3" />

              <button
                onClick={() => {
                  setShowChatOptionsMenu(false);
                  handleClearChatHistory();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[13.5px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <svg className="w-4 h-4 text-red-500/80 dark:text-red-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="font-medium">Очистить историю</span>
              </button>
            </div>
          )}
        </div>

        {callStatus !== 'idle' && (
          <button
            onClick={handleHangUp}
            className="px-3 py-1 rounded-full border border-red-200 bg-red-50 text-xs font-semibold text-red-600"
          >
            Завершить
          </button>
        )}
      </div>
    </header>
  );
};
