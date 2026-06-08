interface ChatInputProps {
  messageText: string;
  setMessageText: (text: string) => void;
  handleSendMessage: () => void;
}

export const ChatInput = ({ messageText, setMessageText, handleSendMessage }: ChatInputProps) => {
  return (
    <div className="border-t border-gray-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Сообщение..."
          className="flex-1 rounded-full border border-transparent bg-gray-100 px-4 py-2 text-[15px] outline-none transition-all placeholder:text-gray-500 focus:border-blue-400/30 focus:bg-white focus:ring-4 focus:ring-blue-100/50 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500/30 dark:focus:bg-slate-900 dark:focus:ring-blue-500/10 sm:px-5 sm:py-2.5"
        />

        {messageText.trim() && (
          <button
            onClick={handleSendMessage}
            className="rounded-full bg-gradient-to-br from-[#3390ec] to-[#2886c6] p-2 text-white shadow-sm transition-all hover:scale-105 hover:shadow-md active:scale-95 sm:p-2.5"
          >
            <svg className="ml-0.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
