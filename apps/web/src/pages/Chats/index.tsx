import { useChatData } from './hooks/useChatData';
import { CallOverlay } from './components/CallOverlay';
import { MessageItem } from './components/MessageItem';
import { ChatInput } from './components/ChatInput';
import { ChatHeader } from './components/ChatHeader';
import { ChatList } from './components/ChatList';

export const ChatsPage = () => {
  const {
    user, chats, activeChatId, setActiveChatId, messages, messageText, setMessageText, newChatEmail, setNewChatEmail, notice, setNotice,
    showAccountSearch, setShowAccountSearch, accountSearchMode, setAccountSearchMode, accountQuery, setAccountQuery, accountResults, setAccountResults, accountNotice, setAccountNotice,
    showGroupCreate, setShowGroupCreate, groupTitle, setGroupTitle, groupEmails, setGroupEmails, groupNotice, setGroupNotice,
    callNotice, callStatus, incomingCall, contactActionChatId, setContactActionChatId,
    isMicMuted, isSpeakerOn, callDuration, showChatList, setShowChatList, showActionsMenu, setShowActionsMenu,
    messagesEndRef, remoteAudioRef,
    activeChat, callingPartner, isGroupChat,
    getChatAvatar, getChatInitial, getMemberName, formatTime, formatDate, formatDuration,
    handleSendMessage, handleCreateChat, handleAccountSearch, openAddContactPanel, handleRemoveContact,
    handleCreateGroupChat,
    handleStartCall, handleAcceptCall, handleDeclineCall, handleHangUp, toggleMic, toggleSpeaker,
    startLongPress, cancelLongPress, openChatWithAccount, longPressTriggeredRef, handleClearChatHistory
  } = useChatData();

  return (
    <div className="h-screen bg-white dark:bg-slate-900 flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <ChatList
          showChatList={showChatList}
          setShowChatList={setShowChatList}
          chats={chats}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          showActionsMenu={showActionsMenu}
          setShowActionsMenu={setShowActionsMenu}
          showAccountSearch={showAccountSearch}
          setShowAccountSearch={setShowAccountSearch}
          accountSearchMode={accountSearchMode}
          setAccountSearchMode={setAccountSearchMode}
          accountNotice={accountNotice}
          setAccountNotice={setAccountNotice}
          accountResults={accountResults}
          setAccountResults={setAccountResults}
          accountQuery={accountQuery}
          setAccountQuery={setAccountQuery}
          handleAccountSearch={handleAccountSearch}
          showGroupCreate={showGroupCreate}
          setShowGroupCreate={setShowGroupCreate}
          groupNotice={groupNotice}
          setGroupNotice={setGroupNotice}
          groupTitle={groupTitle}
          setGroupTitle={setGroupTitle}
          groupEmails={groupEmails}
          setGroupEmails={setGroupEmails}
          handleCreateGroupChat={handleCreateGroupChat}
          newChatEmail={newChatEmail}
          setNewChatEmail={setNewChatEmail}
          notice={notice}
          handleCreateChat={handleCreateChat}
          contactActionChatId={contactActionChatId}
          setContactActionChatId={setContactActionChatId}
          handleRemoveContact={handleRemoveContact}
          getChatAvatar={getChatAvatar}
          getChatInitial={getChatInitial}
          formatTime={formatTime}
          startLongPress={startLongPress}
          cancelLongPress={cancelLongPress}
          openChatWithAccount={openChatWithAccount}
          longPressTriggeredRef={longPressTriggeredRef}
        />

        <main className={`${!showChatList ? 'flex' : 'hidden'} lg:flex flex-1 flex-col bg-[#dfe5ea] dark:bg-slate-950`}>
          {activeChat ? (
            <>
              <ChatHeader
                showChatList={showChatList}
                setShowChatList={setShowChatList}
                setActiveChatId={setActiveChatId}
                activeChat={activeChat}
                getChatAvatar={getChatAvatar}
                getChatInitial={getChatInitial}
                openAddContactPanel={openAddContactPanel}
                handleStartCall={handleStartCall}
                handleClearChatHistory={handleClearChatHistory}
                callStatus={callStatus}
                handleHangUp={handleHangUp}
              />

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {callNotice && (
                  <div className="flex justify-center">
                    <span className="px-3 py-1 bg-white dark:bg-slate-900 rounded-full text-xs text-gray-500 dark:text-slate-500 shadow-sm">{callNotice}</span>
                  </div>
                )}

                {callStatus === 'ringing' && incomingCall && (
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 bg-[#e7f3ff] dark:bg-slate-900 text-[#3390ec] dark:text-[#60a5fa] px-3 py-1 rounded-full text-xs">
                      <span>Входящий звонок</span>
                      <button onClick={handleAcceptCall} className="px-2 py-0.5 bg-[#3390ec] text-white rounded-full">Принять</button>
                      <button onClick={handleDeclineCall} className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-[#3390ec] rounded-full">Отклонить</button>
                    </div>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-gray-500 dark:text-slate-500">
                    <div>
                      <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>Нет сообщений</p>
                      <p className="text-sm mt-1">Напишите первым</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.senderId === user?.uid;
                    const showSenderName = isGroupChat && !isOwn;
                    const senderName = showSenderName ? getMemberName(message.senderId) : "";
                    const showDate = index === 0 || Boolean(messages[index - 1]?.createdAt && message.createdAt && formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt));
                    const isFirstInGroup = index === 0 || messages[index - 1].senderId !== message.senderId;
                    const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.senderId !== message.senderId;
                    return (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isOwn={isOwn}
                        showSenderName={showSenderName}
                        senderName={senderName}
                        showDate={showDate}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                        formatDate={formatDate}
                        formatTime={formatTime}
                      />
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <ChatInput
                messageText={messageText}
                setMessageText={setMessageText}
                handleSendMessage={handleSendMessage}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-slate-500">
              <div>
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-[#e7f3ff] dark:bg-slate-900 flex items-center justify-center">
                  <svg className="w-16 h-16 text-[#3390ec] dark:text-[#60a5fa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-800 mb-2">StudentHub Messenger</h3>
                <p className="text-sm">Выберите чат для начала общения</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <audio ref={remoteAudioRef} autoPlay playsInline className="absolute h-0 w-0 opacity-0 pointer-events-none" />

      <CallOverlay
        callStatus={callStatus}
        callingPartner={callingPartner}
        callDuration={callDuration}
        isMicMuted={isMicMuted}
        isSpeakerOn={isSpeakerOn}
        formatDuration={formatDuration}
        getChatAvatar={getChatAvatar}
        handleAcceptCall={handleAcceptCall}
        handleDeclineCall={handleDeclineCall}
        handleHangUp={handleHangUp}
        toggleMic={toggleMic}
        toggleSpeaker={toggleSpeaker}
      />
    </div>
  );
};
