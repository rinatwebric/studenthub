
import { Chat } from '../../../shared/types';

interface ChatListProps {
  showChatList: boolean;
  setShowChatList: (show: boolean) => void;
  chats: Chat[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  showActionsMenu: boolean;
  setShowActionsMenu: (val: any) => void;
  showAccountSearch: boolean;
  setShowAccountSearch: (val: any) => void;
  accountSearchMode: 'chat' | 'group';
  setAccountSearchMode: (val: any) => void;
  accountNotice: string;
  setAccountNotice: (val: string) => void;
  accountResults: any[];
  setAccountResults: (val: any[]) => void;
  accountQuery: string;
  setAccountQuery: (val: string) => void;
  handleAccountSearch: () => void;
  showGroupCreate: boolean;
  setShowGroupCreate: (val: any) => void;
  groupNotice: string;
  setGroupNotice: (val: string) => void;
  groupTitle: string;
  setGroupTitle: (val: string) => void;
  groupEmails: string;
  setGroupEmails: (val: string) => void;
  handleCreateGroupChat: () => void;
  newChatEmail: string;
  setNewChatEmail: (val: string) => void;
  notice: string;
  handleCreateChat: () => void;
  contactActionChatId: string | null;
  setContactActionChatId: (val: string | null) => void;
  handleRemoveContact: (chatId: string) => void;
  getChatAvatar: (chat?: Chat) => string | undefined;
  getChatInitial: (chat?: Chat) => React.ReactNode;
  formatTime: (date?: Date | any) => string;
  startLongPress: (chatId: string) => void;
  cancelLongPress: () => void;
  openChatWithAccount: (target: any) => void;
  longPressTriggeredRef: React.MutableRefObject<boolean>;
}

export const ChatList = ({
  showChatList,
  setShowChatList,
  chats,
  activeChatId,
  setActiveChatId,
  showActionsMenu,
  setShowActionsMenu,
  showAccountSearch,
  setShowAccountSearch,
  accountSearchMode,
  setAccountSearchMode,
  accountNotice,
  setAccountNotice,
  accountResults,
  setAccountResults,
  accountQuery,
  setAccountQuery,
  handleAccountSearch,
  showGroupCreate,
  setShowGroupCreate,
  groupNotice,
  setGroupNotice,
  groupTitle,
  setGroupTitle,
  groupEmails,
  setGroupEmails,
  handleCreateGroupChat,
  newChatEmail,
  setNewChatEmail,
  notice,
  handleCreateChat,
  contactActionChatId,
  setContactActionChatId,
  handleRemoveContact,
  getChatAvatar,
  getChatInitial,
  formatTime,
  startLongPress,
  cancelLongPress,
  openChatWithAccount,
  longPressTriggeredRef
}: ChatListProps) => {
  const activeChat = chats.find(c => c.id === activeChatId);
  return (
        <aside





          className={`





            ${showChatList ? 'flex' : 'hidden'} 





            lg:flex 





            w-full 





            lg:w-[380px] 





            flex-col 





            bg-white dark:bg-slate-900 
          `}





        >





          {/* Search/Header */}
          <div className="p-3">
            <div className="px-2 pt-1 pb-3">
              <h2 className="text-[22px] font-bold text-gray-900 dark:text-slate-100 tracking-tight">Чаты</h2>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-[#8b939c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Поиск или новый чат"
                  className="w-full pl-10 pr-4 py-[9px] bg-[#f0f2f5] dark:bg-[#1c242f] lg:dark:bg-[#1a222c] rounded-full text-[14.5px] outline-none focus:ring-2 focus:ring-[#81b1d0]/50 dark:focus:ring-[#81b1d0]/30 dark:text-slate-100 dark:placeholder:text-[#64748b] transition shadow-sm dark:shadow-none"
                />





              </div>





              {/* ⋮ Three-dot actions menu */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowActionsMenu((prev: any) => !prev)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${showActionsMenu
                    ? 'bg-[#3390ec]/15 text-[#3390ec] dark:bg-blue-500/20 dark:text-blue-400 scale-95'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400'
                    }`}
                  title="Действия"
                  aria-label="Действия"
                >
                  <svg
                    className={`w-5 h-5 transition-transform duration-200 ${showActionsMenu ? 'rotate-90' : 'rotate-0'}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>

                {showActionsMenu && (
                  <div
                    className="absolute right-0 top-11 z-50 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700/60 overflow-hidden"
                    style={{ animation: 'menuSlideIn 0.15s ease-out' }}
                  >
                    <style>{`@keyframes menuSlideIn { from { opacity: 0; transform: scale(0.95) translateY(-6px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
                    <button
                      onClick={() => {
                        setShowActionsMenu(false);
                        setShowAccountSearch((prev: any) => !prev);
                        setShowGroupCreate(false);
                        setAccountSearchMode(activeChat && (activeChat.isGroup || activeChat.members.length > 2) ? 'group' : 'chat');
                        setAccountNotice('');
                        setAccountResults([]);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors group"
                    >
                      <span className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </span>
                      <span className="font-medium">Добавить контакт</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowActionsMenu(false);
                        setShowGroupCreate((prev: any) => !prev);
                        setShowAccountSearch(false);
                        setGroupNotice('');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors group"
                    >
                      <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                        <svg className="w-4 h-4 text-[#3390ec]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-5-3.87M17 20H7m10 0v-2c0-.65-.1-1.28-.29-1.87M7 20H2v-2a4 4 0 015-3.87M7 20v-2c0-.65.1-1.28.29-1.87m0 0a5.002 5.002 0 019.42 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </span>
                      <span className="font-medium">Создать группу</span>
                    </button>
                  </div>
                )}
              </div>






            </div>











            {newChatEmail === 'new' && (
              <div className="mb-3 p-3 bg-[#f5f5f5] dark:bg-slate-900/70 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">Создать новый чат</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email пользователя"
                    value={newChatEmail === 'new' ? '' : newChatEmail}
                    onChange={(e) => setNewChatEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-[#3390ec]"
                  />
                  <button
                    onClick={handleCreateChat}
                    className="px-4 py-2 bg-[#3390ec] text-white rounded-lg text-sm font-medium hover:bg-[#2886c6] transition"
                  >
                    Создать
                  </button>
                </div>
                {notice && <p className="text-xs text-red-500 mt-2">{notice}</p>}
              </div>
            )}

            {showGroupCreate && (
              <div className="mb-3 p-3 bg-[#e7f3ff] rounded-xl dark:bg-slate-900/70 dark:border dark:border-slate-800">
                <p className="text-sm text-gray-700 dark:text-slate-200 mb-2">Создать групповой чат</p>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Название группы"
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    className="px-3 py-2 border border-[#bfdbfe] rounded-lg text-sm outline-none focus:border-[#3390ec] dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:border-slate-800 dark:focus:border-[#60a5fa]"
                  />
                  <textarea
                    placeholder="Email участников через запятую"
                    value={groupEmails}
                    onChange={(e) => setGroupEmails(e.target.value)}
                    rows={2}
                    className="px-3 py-2 border border-[#bfdbfe] rounded-lg text-sm outline-none focus:border-[#3390ec] resize-none dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:border-slate-800 dark:focus:border-[#60a5fa]"
                  />
                  <button
                    onClick={handleCreateGroupChat}
                    className="self-end px-4 py-2 bg-[#3390ec] text-white rounded-lg text-sm font-medium hover:bg-[#2886c6] transition"
                  >
                    Создать группу
                  </button>
                </div>
                {groupNotice && <p className="text-xs text-red-500 mt-2">{groupNotice}</p>}
              </div>
            )}

            {showAccountSearch && (





              <div className="mb-3 p-3 bg-[#fff7ed] rounded-xl dark:bg-slate-900/70 dark:border dark:border-slate-800">





                <p className="text-sm text-gray-700 dark:text-slate-200 mb-2">{accountSearchMode === 'group' ? 'Добавить пользователя в группу' : 'Поиск контактов'}</p>





                <div className="flex gap-2">





                  <input





                    type="text"





                    placeholder={accountSearchMode === 'group' ? 'Имя или email для добавления' : 'Имя или email'}





                    value={accountQuery}





                    onChange={(e) => setAccountQuery(e.target.value)}





                    className="flex-1 px-3 py-2 border border-[#fed7aa] rounded-lg text-sm outline-none focus:border-[#f97316] dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:border-slate-800 dark:focus:border-[#f59e0b]"





                  />





                  <button





                    onClick={handleAccountSearch}





                    className="px-4 py-2 bg-[#f97316] text-white rounded-lg text-sm font-medium hover:bg-[#ea580c] transition dark:bg-[#f59e0b] dark:hover:bg-[#d97706]"





                  >





                    Найти





                  </button>





                </div>





                {accountNotice && <p className="text-xs text-red-500 mt-2">{accountNotice}</p>}





                {accountResults.length > 0 && (





                  <div className="mt-3 space-y-2">





                    {accountResults.map((acc) => (





                      <div key={acc.id} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-[#fde68a]">





                        <div className="w-8 h-8 rounded-full bg-[#f59e0b] text-white flex items-center justify-center text-sm font-semibold">





                          {(acc.name || acc.email || 'U')[0].toUpperCase()}





                        </div>





                        <div className="flex-1 min-w-0">





                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{acc.name || acc.email}</p>





                          <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{acc.email}</p>





                        </div>





                        <button





                          onClick={() => openChatWithAccount(acc)}





                          className="px-3 py-1.5 bg-[#f59e0b] text-white rounded-full text-xs font-medium hover:bg-[#d97706]"





                        >





                          {accountSearchMode === 'group' ? 'Добавить' : 'Открыть'}





                        </button>





                      </div>





                    ))}





                  </div>





                )}





              </div>





            )}











          </div>











          {/* Chat List */}





          <div className="flex-1 overflow-y-auto">





            {chats.length === 0 ? (





              <div className="p-8 text-center text-gray-500 dark:text-slate-500">





                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">





                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />





                </svg>





                <p>Нет чатов</p>





                <p className="text-sm mt-1">Создайте новый чат</p>





              </div>





            ) : (





              chats.map((chat) => (
                <div key={chat.id} className="w-full">
                  <button
                    onClick={() => {
                      if (longPressTriggeredRef.current) {
                        longPressTriggeredRef.current = false;
                        return;
                      }
                      setActiveChatId(chat.id);
                      setShowChatList(false);
                    }}
                    onPointerDown={() => startLongPress(chat.id)}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContactActionChatId(chat.id);
                    }}
                    className={`w-full flex items-center gap-3 p-3 transition hover:bg-[#f5f7fa] dark:hover:bg-slate-700/50 ${activeChatId === chat.id ? 'bg-[#e7f3ff] dark:bg-slate-800' : ''
                      }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#7c9ecf] overflow-hidden flex items-center justify-center text-white font-medium text-lg flex-shrink-0">
                      {getChatAvatar(chat) ? (
                        <img src={getChatAvatar(chat)} alt={chat.title} className="h-full w-full object-cover" />
                      ) : (
                        getChatInitial(chat)
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-slate-100 truncate">{chat.title}</p>
                        {chat.updatedAt && (
                          <span className="text-xs text-gray-400 dark:text-slate-500">{formatTime(chat.updatedAt)}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-slate-500 truncate">
                        {chat.lastMessage || 'Нет сообщений'}
                      </p>
                    </div>
                  </button>
                  {contactActionChatId === chat.id && (
                    <div
                      className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-red-50/80 to-transparent dark:from-red-900/20 dark:to-transparent border-t border-red-100/50 dark:border-red-500/10 overflow-hidden"
                      style={{ animation: 'slideDownFromTop 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                      <style>{`@keyframes slideDownFromTop { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                      <span className="text-[13px] font-medium text-red-600/90 dark:text-red-400/90 flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Удалить чат?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setContactActionChatId(null)}
                          className="px-3 py-1.5 rounded-full text-[13px] font-semibold text-gray-500 hover:bg-gray-200/50 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200 transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => handleRemoveContact(chat.id)}
                          className="px-3 py-1.5 rounded-full text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-500/20 active:scale-95 transition-all"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))





            )}





          </div>





        </aside>
  );
};
