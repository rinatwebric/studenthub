import { Message } from '../../../shared/types';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  showSenderName: boolean;
  senderName: string;
  showDate: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  formatDate: (date?: Date | any) => string;
  formatTime: (date?: Date | any) => string;
}

export const MessageItem = ({
  message,
  isOwn,
  showSenderName,
  senderName,
  showDate,
  isFirstInGroup,
  isLastInGroup,
  formatDate,
  formatTime
}: MessageItemProps) => {
  return (
    <div>
      {showDate && message.createdAt && (
        <div className="my-4 flex justify-center">
          <span className="rounded-lg bg-[rgba(255,255,255,0.9)] px-3 py-1 text-xs text-gray-500 shadow-sm dark:text-slate-500">
            {formatDate(message.createdAt)}
          </span>
        </div>
      )}

      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${!isLastInGroup ? 'mb-0.5' : 'mb-2'}`}>
        <div
          className={`
            max-w-[82%] sm:max-w-[70%] px-3.5 py-2 shadow-sm
            ${isOwn
              ? `bg-gradient-to-br from-[#3390ec] to-[#2886c6] text-white ${isFirstInGroup ? 'rounded-2xl rounded-br-md' : isLastInGroup ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-r-md'}`
              : `bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-100 ${isFirstInGroup ? 'rounded-2xl rounded-bl-md' : isLastInGroup ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-l-md'}`}
          `}
        >
          {showSenderName && (
            <p className="mb-1 text-[11px] font-semibold text-[#3390ec] dark:text-sky-300">
              {senderName}
            </p>
          )}

          {message.voiceUrl ? (
            <p className={`text-sm italic ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-slate-400'}`}>
              Голосовое сообщение (медиа отключено)
            </p>
          ) : message.imageUrl ? (
            <p className={`text-sm italic ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-slate-400'}`}>
              Фото (медиа отключено)
            </p>
          ) : (
            <p className={`whitespace-pre-wrap text-[15px] leading-relaxed ${isOwn ? 'text-white' : 'text-gray-900 dark:text-slate-100'}`}>{message.text}</p>
          )}

          <div className={`mt-1.5 flex items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[11px] font-medium ${isOwn ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'}`}>{formatTime(message.createdAt)}</span>
            {isOwn && (
              <svg className="h-3.5 w-3.5 text-blue-100" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
