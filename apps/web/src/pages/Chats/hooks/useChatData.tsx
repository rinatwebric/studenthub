import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  endAt,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAt,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../../shared/firebase';
import { useAuth } from '../../../shared/auth';
import { Chat, Contact, Message, AccountResult } from '../../../shared/types';

// Функция для исправления испорченной кодировки (кракозябр), которая может возникать 
// при передаче кириллицы через Capacitor или старые версии Firebase/браузеров.
const sanitizeMojibake = (value: string): string => {
  if (!value) return '';
  let next = value;
  // Пробуем дважды декодировать через URL-кодирование (помогает при двойном UTF-8 кодировании)
  for (let i = 0; i < 2; i += 1) {
    try {
      const fixed = decodeURIComponent(escape(next));
      if (fixed === next) break;
      next = fixed;
    } catch {
      break;
    }
  }
  // Проверка на символы CP1251 (популярная кодировка Windows-1251),
  // если обнаружено много совпадений, конвертируем массив байт обратно в UTF-8
  const cp1251Chars = next.match(/[\u0420\u0421]/gu)?.length ?? 0;
  if (cp1251Chars >= 4) {
    const bytes: number[] = [];
    let canDecodeCp1251 = true;
    for (const char of next) {
      const code = char.charCodeAt(0);
      if (code <= 0x7f) bytes.push(code);
      else if (code <= 0xff) bytes.push(code);
      else if (code === 0x401) bytes.push(0xa8); // Буква Ё
      else if (code === 0x451) bytes.push(0xb8); // Буква ё
      else if (code >= 0x410 && code <= 0x44f) bytes.push(code - 0x350); // Кириллица А-я
      else {
        canDecodeCp1251 = false;
        break;
      }
    }
    if (canDecodeCp1251) {
      try {
        const fixed = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
        if (fixed) next = fixed;
      } catch {}
    }
  }
  return next;
};

const MESSAGES_LIMIT = 80;
const USER_SEARCH_LIMIT = 15;

const mapUserToContact = (id: string, data: { name?: string; email?: string; photoURL?: string }): Contact => {
  const safeName = sanitizeMojibake(data.name ?? '');
  const safeEmail = sanitizeMojibake(data.email ?? '');
  return {
    id,
    name: safeName || (safeEmail ? safeEmail.split('@')[0] : 'Пользователь'),
    email: safeEmail,
    photoURL: data.photoURL
  };
};

// Главный хук мессенджера, управляющий всеми чатами, сообщениями, звонками и записью звука
export const useChatData = () => {
  // Получаем текущего авторизованного пользователя и функцию обновления его профиля из контекста
  const { user, updateProfile } = useAuth();
  
  // Список ID чатов, которые пользователь скрыл (удалил из своего списка видимых)
  const hiddenChatIds = user?.hiddenChatIds ?? [];

  // Состояния для хранения чатов, активного чата и сообщений
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Текст вводимого сообщения
  const [messageText, setMessageText] = useState('');
  // Почта для быстрого создания чата с новым пользователем
  const [newChatEmail, setNewChatEmail] = useState('');
  
  // Уведомления об ошибках или статусах операций
  const [notice, setNotice] = useState('');
  
  // Состояния для поиска аккаунтов (пользователей)
  const [showAccountSearch, setShowAccountSearch] = useState(false);
  const [accountSearchMode, setAccountSearchMode] = useState<'chat' | 'group'>('chat');
  const [accountQuery, setAccountQuery] = useState('');
  const [accountResults, setAccountResults] = useState<AccountResult[]>([]);
  const [accountNotice, setAccountNotice] = useState('');
  
  // Состояния для создания группового чата
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupEmails, setGroupEmails] = useState('');
  const [groupNotice, setGroupNotice] = useState('');
  
  // Состояния для WebRTC аудио-звонков
  const [callNotice, setCallNotice] = useState('');
  // Возможные статусы звонка: idle (нет звонка), calling (исходящий гудок), ringing (входящий гудок), active (разговор)
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'active'>('idle');
  // Данные входящего звонка (кто звонит, в каком чате и ID сессии звонка)
  const [incomingCall, setIncomingCall] = useState<{ id: string; callerId: string; chatId: string } | null>(null);
  
  // Профили участников чатов (подгружаются по требованию, без подписки на всю коллекцию users)
  const [memberProfiles, setMemberProfiles] = useState<Record<string, Contact>>({});
  // ID чата, над которым производится действие (например, долгое нажатие для удаления/скрытия)
  const [contactActionChatId, setContactActionChatId] = useState<string | null>(null);
  
  // Управление микрофоном и динамиком/звуком в звонке
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0); // Длительность звонка в секундах
  
  // Состояния для записи голосовых сообщений
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  // ID проигрываемого сейчас голосового сообщения (для анимации и остановки)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  
  // Управление отображением интерфейса на мобильных устройствах
  const [showChatList, setShowChatList] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  
  // Превью отправляемого изображения и его зум
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  
  // Столбики эквалайзера (waveform) для проигрываемого голосового сообщения (20 штук)
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(0));

  // Определение десктопной версии по ширине экрана (>= 1024px)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  // useRef'ы для хранения Web Audio API контекстов, медиа-рекордера, WebRTC-соединения и отписок
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null); // RequestAnimationFrame ID для эквалайзера
  const pcRef = useRef<RTCPeerConnection | null>(null); // WebRTC Peer Connection
  const localStreamRef = useRef<MediaStream | null>(null); // Локальный аудиопоток (микрофон)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null); // Удаленный аудиоэлемент для вывода звука собеседника
  const callUnsubRef = useRef<(() => void) | null>(null); // Отписка от изменений документа звонка в Firestore
  const candidatesUnsubRef = useRef<(() => void) | null>(null); // Отписка от ICE-кандидатов в Firestore
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]); // Буфер ICE-кандидатов до установки remote SDP
  const applyingRemoteDescriptionRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ссылка на конец списка сообщений для автоскролла
  const imageInputRef = useRef<HTMLInputElement | null>(null); // Ссылка на input выбора картинки
  const loadedProfileIdsRef = useRef<Set<string>>(new Set());

  // Эффект отслеживания изменения ширины экрана для адаптивной верстки
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const handler = () => setIsDesktop(media.matches);
    handler();
    if (media.addEventListener) {
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }
    media.addListener(handler);
    return () => media.removeListener(handler);
  }, []);

  // Таймер длительности разговора во время активного звонка
  useEffect(() => {
    let interval: any;
    if (callStatus === 'active') {
      setCallDuration(0);
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Эффект подписки на список чатов пользователя в реальном времени из Firestore.
  // Загружает все документы из коллекции `chats`, где в массиве `members` есть uid пользователя.
  useEffect(() => {
    if (!user) return;
    const chatsQuery = query(collection(db, 'chats'), where('members', 'array-contains', user.uid), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const nextChats = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<Chat, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          title: sanitizeMojibake(data.title ?? "") || 'Чат',
          lastMessage: sanitizeMojibake(data.lastMessage ?? ""),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined
        };
      });
      // Фильтруем чаты, которые пользователь скрыл (поместил в hiddenChatIds)
      const visibleChats = nextChats.filter((chat) => !hiddenChatIds.includes(chat.id));
      setChats(visibleChats);
      
      // Если активный чат стал скрытым, сбрасываем его
      if (activeChatId && hiddenChatIds.includes(activeChatId)) {
        setActiveChatId(null);
        setShowChatList(true);
      }
      // На десктопе автоматически открываем первый чат из списка, если ничего не выбрано
      if (!activeChatId && visibleChats.length > 0 && (isDesktop || !showChatList)) {
        setActiveChatId(visibleChats[0].id);
      }
    }, (error) => {
      console.error('Chats snapshot error:', error);
      setNotice('Не удалось загрузить чаты');
    });
    return () => unsubscribe();
  }, [user, activeChatId, isDesktop, showChatList, hiddenChatIds]);

  // Подгружаем профили только участников видимых чатов (разовые getDoc, без realtime на всю коллекцию)
  useEffect(() => {
    if (!user || chats.length === 0) return;
    const memberIds = new Set<string>();
    chats.forEach((chat) => {
      chat.members.forEach((memberId) => {
        if (memberId !== user.uid) memberIds.add(memberId);
      });
    });
    const missingIds = [...memberIds].filter((id) => !loadedProfileIdsRef.current.has(id));
    if (missingIds.length === 0) return;

    let cancelled = false;
    missingIds.forEach((id) => loadedProfileIdsRef.current.add(id));
    Promise.all(
      missingIds.map(async (memberId) => {
        const snap = await getDoc(doc(db, 'users', memberId));
        if (!snap.exists()) return null;
        return mapUserToContact(snap.id, snap.data() as { name?: string; email?: string; photoURL?: string });
      })
    ).then((loaded) => {
      if (cancelled) return;
      const nextProfiles = loaded.filter((item): item is Contact => !!item);
      if (nextProfiles.length === 0) return;
      setMemberProfiles((current) => {
        const merged = { ...current };
        nextProfiles.forEach((profile) => {
          merged[profile.id] = profile;
        });
        return merged;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [chats, user]);

  // Эффект подписки на сообщения активного чата в реальном времени.
  // Загружает документы из коллекции `chats/{activeChatId}/messages`, отсортированные по времени создания.
  useEffect(() => {
    if (!user || !activeChatId) {
      setMessages([]);
      return;
    }
    const messagesQuery = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(MESSAGES_LIMIT)
    );
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const nextMessages = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as Omit<Message, 'id'>;
          return {
            id: docSnap.id,
            ...data,
            text: sanitizeMojibake(data.text ?? ''),
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined
          };
        })
        .reverse();
      setMessages(nextMessages);
    });
    return () => unsubscribe();
  }, [user, activeChatId]);

  // Эффект отслеживания входящих вызовов.
  // Подписывается на коллекцию `calls`, ища документы, где calleeId (получатель) равен uid текущего пользователя,
  // а статус звонка — "ringing" (вызывает).
  useEffect(() => {
    if (!user) return;
    const callsQuery = query(collection(db, 'calls'), where('calleeId', '==', user.uid), where('status', '==', 'ringing'));
    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      if (!snapshot.empty && callStatus === 'idle') {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data() as { callerId: string; chatId: string };
        setIncomingCall({ id: docSnap.id, callerId: data.callerId, chatId: data.chatId });
        setCallStatus('ringing');
        setCallNotice('Входящий звонок...');
      }
    });
    return () => unsubscribe();
  }, [user, callStatus]);

  // Скроллинг вниз при получении новых сообщений
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Мемоизированный объект активного чата
  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId), [chats, activeChatId]);
  
  // Собеседник во время звонка (активный чат или чат входящего звонка)
  const callingPartner = useMemo(() => {
    if (incomingCall) return chats.find((chat) => chat.id === incomingCall.chatId);
    return activeChat;
  }, [incomingCall, activeChat, chats]);

  const isChatOpen = !!activeChat && !showChatList;
  const isGroupChat = Boolean(activeChat && (activeChat.isGroup || activeChat.members.length > 2));

  // Мемоизированный справочник контактов по ID для быстрой выборки O(1)
  const contactById = useMemo(() => new Map(Object.entries(memberProfiles)), [memberProfiles]);

  // Получение аватара для чата (для личного чата возвращает аватар собеседника, для группы — аватар группы)
  const getChatAvatar = (chat?: Chat): string | undefined => {
    if (!chat) return undefined;
    if (!user) return chat.avatar;
    if (chat.isGroup || chat.members.length !== 2) return chat.avatar;
    const otherMemberId = chat.members.find((memberId) => memberId !== user.uid);
    if (!otherMemberId) return chat.avatar;
    return contactById.get(otherMemberId)?.photoURL || chat.avatar;
  };

  // Дефолтная заглушка-инициал, если нет аватара
  const getChatInitial = (_chat?: Chat) => (
    <svg className="w-1/2 h-1/2 opacity-90" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );

  // Получение имени участника чата
  const getMemberName = (memberId: string): string => {
    if (memberId === user?.uid) return user?.name || 'Вы';
    return contactById.get(memberId)?.name || 'Пользователь';
  };

  // Форматирование времени (чч:мм)
  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // Красивое форматирование даты (Сегодня, Вчера или ДД Месяц)
  const formatDate = (date?: Date) => {
    if (!date) return '';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  // Форматирование длительности (минуты:секунды)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Отправка текстового сообщения в Firestore
  const handleSendMessage = async () => {
    if (!user || !activeChatId || !messageText.trim()) return;
    const text = messageText.trim();
    // Добавляем документ сообщения во вложенную коллекцию messages
    await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
      senderId: user.uid,
      text,
      createdAt: serverTimestamp()
    });
    // Обновляем последнее сообщение и дату изменения в самом чате
    const recipientId = activeChat?.members.find((memberId) => memberId !== user.uid);
    await updateDoc(doc(db, 'chats', activeChatId), {
      lastMessage: text,
      updatedAt: serverTimestamp(),
      ...(recipientId ? { members: arrayUnion(user.uid, recipientId) } : {})
    });
    setMessageText('');
  };

  // Отправка картинки: загружает в Firebase Storage, получает публичный URL и отправляет сообщение с imageUrl
  const handleSendImage = async (file: File) => {
    if (!user || !activeChatId || !storage) {
      setNotice('Хранилище не настроено.');
      return;
    }
    try {
      // Создаем ссылку на файл в Storage по пути `chat-images/{chatId}/{timestamp}-{filename}`
      const fileRef = storageRef(storage, `chat-images/${activeChatId}/${Date.now()}-${file.name}`);
      // Загружаем байты файла
      await uploadBytes(fileRef, file);
      // Получаем URL для скачивания
      const imageUrl = await getDownloadURL(fileRef);
      // Записываем сообщение в Firestore
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
        senderId: user.uid,
        text: '',
        imageUrl,
        createdAt: serverTimestamp()
      });
      // Обновляем превью последнего сообщения в чате
      const recipientId = activeChat?.members.find((memberId) => memberId !== user.uid);
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: 'Фото',
        updatedAt: serverTimestamp(),
        ...(recipientId ? { members: arrayUnion(user.uid, recipientId) } : {})
      });
    } catch (error) {
      console.error('Image send error:', error);
      setNotice('Не удалось отправить фото');
    }
  };

  // Создание нового чата один-на-один по email адресу пользователя
  const handleCreateChat = async () => {
    if (!user || !newChatEmail.trim() || !user.email) {
      setNotice(!newChatEmail.trim() ? 'Введите почту пользователя' : 'У вашего аккаунта нет email');
      return;
    }
    const email = newChatEmail.trim().toLowerCase();
    if (email === user.email.toLowerCase()) {
      setNotice('Нельзя создать чат с самим собой');
      return;
    }
    setNotice('Ищем пользователя...');
    try {
      // Ищем в Firestore пользователя с таким email
      const usersQuery = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(usersQuery);
      if (snapshot.empty) {
        setNotice('Пользователь не найден');
        return;
      }
      const target = snapshot.docs[0];
      const targetId = target.id;
      // Если чат уже существует, просто делаем его активным
      const existingChat = chats.find(c => !c.isGroup && c.members.length === 2 && c.members.includes(user.uid) && c.members.includes(targetId));
      if (existingChat) {
        setActiveChatId(existingChat.id);
        setNewChatEmail('');
        setNotice('');
        setShowChatList(false);
        return;
      }
      // Создаем новый документ чата в коллекции `chats`
      const chatDoc = await addDoc(collection(db, 'chats'), {
        title: sanitizeMojibake(target.data().name ?? email),
        members: [user.uid, targetId],
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        lastMessage: ''
      });
      setActiveChatId(chatDoc.id);
      setNewChatEmail('');
      setNotice('');
      setShowChatList(false);
    } catch (error) {
      console.error('Create chat error:', error);
      setNotice('Ошибка создания чата');
    }
  };

  // Поиск пользователей в Firestore по email или префиксу имени (без подписки на всю коллекцию)
  const handleAccountSearch = async () => {
    const term = accountQuery.trim();
    if (!term || !user) {
      setAccountNotice('Введите имя или email');
      setAccountResults([]);
      return;
    }
    setAccountNotice('Ищем...');
    try {
      let snapshot;
      if (term.includes('@')) {
        snapshot = await getDocs(
          query(collection(db, 'users'), where('email', '==', term.toLowerCase()), limit(USER_SEARCH_LIMIT))
        );
      } else {
        snapshot = await getDocs(
          query(
            collection(db, 'users'),
            orderBy('name'),
            startAt(term),
            endAt(`${term}\uf8ff`),
            limit(USER_SEARCH_LIMIT)
          )
        );
      }
      const termLower = term.toLowerCase();
      const results = snapshot.docs
        .filter((docSnap) => docSnap.id !== user.uid)
        .map((docSnap) => {
          const contact = mapUserToContact(docSnap.id, docSnap.data() as { name?: string; email?: string; photoURL?: string });
          return {
            id: contact.id,
            name: contact.name,
            email: contact.email,
            photoURL: contact.photoURL
          };
        })
        .filter(
          (item) =>
            item.name.toLowerCase().includes(termLower) ||
            item.email.toLowerCase().includes(termLower)
        );
      setAccountResults(results);
      setAccountNotice(results.length ? '' : 'Пользователь не найден');
    } catch (error) {
      console.error('Account search error:', error);
      setAccountResults([]);
      setAccountNotice('Ошибка поиска');
    }
  };

  // Открыть панель поиска пользователей
  const openAddContactPanel = () => {
    setShowChatList(true);
    setShowAccountSearch(true);
    setShowGroupCreate(false);
    setAccountSearchMode(activeChat && (activeChat.isGroup || activeChat.members.length > 2) ? 'group' : 'chat');
    setAccountNotice('');
    setAccountResults([]);
  };

  // Скрытие (мягкое удаление) контакта/чата. Чат добавляется в список `hiddenChatIds` в профиле пользователя.
  const handleRemoveContact = async (chatId: string) => {
    if (!user || !updateProfile || !window.confirm('Удалить контакт?')) return;
    const nextHidden = Array.from(new Set([...(user.hiddenChatIds ?? []), chatId]));
    try {
      await updateProfile({ hiddenChatIds: nextHidden });
      setContactActionChatId(null);
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setShowChatList(true);
      }
    } catch (error) {
      console.error('Не удалось скрыть контакт', error);
      window.alert('Не удалось скрыть контакт');
    }
  };

  // Создание группового чата по названию и списку почт участников (через запятую/пробел)
  const handleCreateGroupChat = async () => {
    if (!user) return;
    const title = groupTitle.trim();
    if (!title) {
      setGroupNotice('Введите название группы');
      return;
    }
    // Парсим введенные емейлы
    const rawEmails = groupEmails.split(/[\s,;]+/).map(i => i.trim().toLowerCase()).filter(Boolean);
    const participantEmails = Array.from(new Set(rawEmails)).filter(e => e !== user.email?.toLowerCase());
    if (participantEmails.length < 2) {
      setGroupNotice('Для группы нужно минимум 2 участника');
      return;
    }
    setGroupNotice('Ищем участников...');
    try {
      // Резолвим uid пользователей по их email адресам
      const resolved = await Promise.all(participantEmails.map(async e => {
        const q = query(collection(db, 'users'), where('email', '==', e));
        const s = await getDocs(q);
        return s.empty ? null : { id: s.docs[0].id, email: e };
      }));
      const found = resolved.filter((item): item is { id: string; email: string } => !!item);
      if (found.length !== participantEmails.length) {
        const foundEmails = new Set(found.map(i => i.email));
        setGroupNotice(`Пользователи не найдены: ${participantEmails.filter(e => !foundEmails.has(e)).join(', ')}`);
        return;
      }
      const memberIds = Array.from(new Set([user.uid, ...found.map(i => i.id)]));
      // Добавляем групповой чат с флагом isGroup: true
      const chatDoc = await addDoc(collection(db, 'chats'), {
        title: sanitizeMojibake(title),
        members: memberIds,
        isGroup: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        lastMessage: ''
      });
      setGroupTitle('');
      setGroupEmails('');
      setShowGroupCreate(false);
      setActiveChatId(chatDoc.id);
      setShowChatList(false);
    } catch (error) {
      console.error('Create group chat error:', error);
      setGroupNotice('Ошибка создания группового чата');
    }
  };

  // Старт записи голосового сообщения с микрофона с помощью MediaRecorder API
  const startRecording = async () => {
    try {
      // Запрашиваем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      // Накапливаем аудиоданные в массив chunks
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        // Конвертируем кусочки в полноценный webm аудиофайл
        setRecordingBlob(new Blob(chunks, { type: 'audio/webm' }));
        // Останавливаем все дорожки медиапотока (чтобы выключить индикатор записи в браузере)
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      // Запускаем таймер времени записи
      recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setNotice('Нет доступа к микрофону');
    }
  };

  // Остановка записи голосового сообщения
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  // Отправка голосового: файл в Storage, в Firestore только URL (экономия лимита документов)
  const sendVoiceMessage = async () => {
    if (!user || !activeChatId || !recordingBlob) return;
    if (!storage) {
      setNotice('Хранилище не настроено.');
      return;
    }
    try {
      const fileRef = storageRef(storage, `chat-voice/${activeChatId}/${Date.now()}.webm`);
      await uploadBytes(fileRef, recordingBlob);
      const voiceUrl = await getDownloadURL(fileRef);
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
        senderId: user.uid,
        text: '',
        voiceUrl,
        voiceDuration: recordingTime,
        createdAt: serverTimestamp()
      });
      const recipientId = activeChat?.members.find((m) => m !== user.uid);
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: `Голосовое (${recordingTime}с)`,
        updatedAt: serverTimestamp(),
        ...(recipientId ? { members: arrayUnion(user.uid, recipientId) } : {})
      });
      setRecordingBlob(null);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error sending voice message:', error);
      setNotice('Ошибка отправки голосового');
    }
  };

  // Воспроизведение голосового сообщения и построение эквалайзера с помощью Web Audio API
  const playVoiceMessage = (message: Message) => {
    if (message.voiceUrl && audioRef.current) {
      audioRef.current.src = message.voiceUrl;
      audioRef.current.onerror = () => {
        setNotice('Ошибка воспроизведения аудио');
        setPlayingVoiceId(null);
        setWaveformBars(Array(20).fill(0));
      };
      try {
        // Создаем контекст Web Audio API, если он еще не инициализирован
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        
        // Создаем ноду анализатора спектра звука
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        
        // Подключаем аудиоэлемент к ноде-источнику один раз
        if (!(audioRef.current as any)._srcNode) {
          (audioRef.current as any)._srcNode = ctx.createMediaElementSource(audioRef.current);
        }
        (audioRef.current as any)._srcNode.connect(analyser);
        analyser.connect(ctx.destination); // Направляем звук в динамики
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        // Функция анимации спектра для отрисовки "звуковой волны"
        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          const bars: number[] = [];
          const step = Math.max(1, Math.floor(dataArray.length / 20));
          for (let i = 0; i < 20; i++) {
            bars.push(dataArray[Math.min(i * step, dataArray.length - 1)]);
          }
          setWaveformBars(bars);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.warn('Web Audio API waveform init failed:', err);
      }
      audioRef.current.play()
        .then(() => setPlayingVoiceId(message.id))
        .catch(() => setNotice('Не удалось воспроизвести голосовое'));
    }
  };

  const stopVoiceMessage = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingVoiceId(null);
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setWaveformBars(Array(20).fill(0));
  };

  // Очистка сессии звонка: остановка стримов микрофона, закрытие WebRTC-соединения, 
  // сброс локальных состояний и обновление статуса в БД Firestore на "ended".
  const cleanupCall = async (callId?: string) => {
    if (candidatesUnsubRef.current) { candidatesUnsubRef.current(); candidatesUnsubRef.current = null; }
    if (callUnsubRef.current) { callUnsubRef.current(); callUnsubRef.current = null; }
    pendingIceCandidatesRef.current = [];
    applyingRemoteDescriptionRef.current = false;
    
    // Закрываем RTCPeerConnection и обнуляем обработчики событий
    if (pcRef.current) { 
      pcRef.current.ontrack = null; 
      pcRef.current.onicecandidate = null; 
      pcRef.current.close(); 
      pcRef.current = null; 
    }
    // Выключаем захват микрофона
    if (localStreamRef.current) { 
      localStreamRef.current.getTracks().forEach(t => t.stop()); 
      localStreamRef.current = null; 
    }
    // Сбрасываем тег аудио вывода звука собеседника
    if (remoteAudioRef.current) { 
      remoteAudioRef.current.srcObject = null; 
      remoteAudioRef.current.muted = false; 
      remoteAudioRef.current.volume = 1; 
    }
    setCallStatus('idle');
    setIncomingCall(null);
    setCallNotice('Звонок завершён');
    setIsMicMuted(false);
    setIsSpeakerOn(true);
    if (callId) {
      try { 
        // Обновляем статус звонка в БД, чтобы у собеседника он тоже завершился
        await updateDoc(doc(db, 'calls', callId), { status: 'ended', endedAt: serverTimestamp() }); 
      } catch {}
    }
  };

  // Создание экземпляра RTCPeerConnection с бесплатными STUN-серверами Google и Cloudflare.
  // STUN-сервера нужны, чтобы WebRTC узнал публичные IP-адреса и порты участников для прямого P2P соединения.
  // Если настроен TURN-сервер в .env, то также добавляем его для обхода жестких NAT/брандмауэров.
  const createPeerConnection = () => {
    const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];
    if (import.meta.env.VITE_TURN_URL && import.meta.env.VITE_TURN_USERNAME && import.meta.env.VITE_TURN_CREDENTIAL) {
      iceServers.push({ 
        urls: import.meta.env.VITE_TURN_URL, 
        username: import.meta.env.VITE_TURN_USERNAME, 
        credential: import.meta.env.VITE_TURN_CREDENTIAL 
      });
    }
    const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'all' });
    
    // Когда получаем удаленный аудио-трек собеседника, направляем его в HTMLAudioElement
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      }
    };
    return pc;
  };

  // Безопасное добавление ICE-кандидата. Если удаленное описание (remoteDescription) еще не установлено, 
  // буферизуем кандидата в pendingIceCandidatesRef, иначе сразу добавляем в RTCPeerConnection.
  const addIceCandidateSafely = (candidateInit: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc) return;
    if (!pc.remoteDescription && !pc.currentRemoteDescription) { 
      pendingIceCandidatesRef.current.push(candidateInit); 
      return; 
    }
    pc.addIceCandidate(new RTCIceCandidate(candidateInit)).catch(e => console.error('ICE error', e));
  };

  // Применяем накопленные в буфере ICE-кандидаты после того, как установили SDP Offer/Answer собеседника
  const flushPendingIceCandidates = () => {
    const pc = pcRef.current;
    if (!pc || (!pc.remoteDescription && !pc.currentRemoteDescription)) return;
    pendingIceCandidatesRef.current.forEach(c => {
      pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error('ICE error', e));
    });
    pendingIceCandidatesRef.current = [];
  };

  // Инициация исходящего звонка (WebRTC сигналинг через Firestore).
  // 1. Запрашивает доступ к микрофону.
  // 2. Создает RTCPeerConnection и добавляет локальный аудио-трек.
  // 3. Создает локальный SDP Offer и записывает его в документ `calls/{chatId}`.
  // 4. Подписывается на SDP Answer от собеседника и на коллекцию `answerCandidates` для ICE кандидатов.
  const handleStartCall = async () => {
    if (!user || !activeChat || callStatus !== 'idle' || activeChat.members.length !== 2) {
      if (activeChat?.members.length !== 2) setCallNotice('Звонки доступны только в личных чатах');
      return;
    }
    try {
      const calleeId = activeChat.members.find(m => m !== user.uid);
      if (!calleeId) throw new Error('Собеседник не найден');
      const callRef = doc(db, 'calls', activeChat.id);
      
      let localStream: MediaStream;
      try {
        if (!navigator.mediaDevices) {
          throw new Error('Микрофон недоступен: откройте сайт через HTTPS или localhost');
        }
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        console.error('Microphone access denied or error:', err);
        throw new Error(`Нет доступа к микрофону: ${err.message || err.name || err}`);
      }
      
      const pc = createPeerConnection();
      pcRef.current = pc;
      localStreamRef.current = localStream;
      
      // Добавляем микрофонный поток в WebRTC соединение
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
      
      // Генерируем локальные ICE кандидаты и отправляем их в Firestore в подколлекцию offerCandidates
      pc.onicecandidate = (e) => { 
        if (e.candidate) {
          addDoc(collection(callRef, 'offerCandidates'), e.candidate.toJSON()).catch(err => {
            console.error('Failed to add offer candidate:', err);
          });
        }
      };
      
      // Создаем SDP оффер (описание поддерживаемых аудио кодеков и параметров трансляции)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Публикуем звонок в Firestore
      try {
        await setDoc(callRef, {
          chatId: activeChat.id,
          callerId: user.uid,
          calleeId,
          offer: { type: offer.type, sdp: offer.sdp },
          status: 'ringing',
          createdAt: serverTimestamp(),
          participants: [user.uid, calleeId]
        });
      } catch (err: any) {
        console.error('Firestore setDoc call error:', err);
        throw new Error(`Ошибка базы данных Firestore: ${err.message || err.code || err}`);
      }
      
      setCallStatus('calling');
      setCallNotice('Звоним...');
      
      // Слушаем изменения звонка: когда собеседник примет звонок и запишет SDP Answer, мы установим его
      callUnsubRef.current = onSnapshot(callRef, (s) => {
        const d = s.data() as any;
        if (d?.status === 'ended') cleanupCall(callRef.id);
        if (d?.answer && pcRef.current && !pcRef.current.currentRemoteDescription && !applyingRemoteDescriptionRef.current) {
          applyingRemoteDescriptionRef.current = true;
          pcRef.current.setRemoteDescription(new RTCSessionDescription(d.answer))
            .then(() => { 
              flushPendingIceCandidates(); 
              setCallStatus('active'); 
              setCallNotice('Разговор...');
            })
            .catch(err => {
              console.error('Failed to set remote description (answer):', err);
              setCallNotice(`Ошибка WebRTC: ${err.message || err}`);
            })
            .finally(() => applyingRemoteDescriptionRef.current = false);
        }
      });
      
      // Подписываемся на получение ICE кандидатов от собеседника (из answerCandidates)
      candidatesUnsubRef.current = onSnapshot(collection(callRef, 'answerCandidates'), (s) => s.docChanges().forEach(c => { 
        if (c.type === 'added') addIceCandidateSafely(c.doc.data() as any); 
      }));
      
    } catch (error: any) {
      console.error('Failed to start call:', error);
      setCallNotice(`Ошибка запуска звонка: ${error.message || error}`);
      cleanupCall();
    }
  };

  // Принятие входящего звонка (WebRTC сигналинг через Firestore).
  // 1. Загружает SDP Offer звонящего из Firestore.
  // 2. Запрашивает доступ к микрофону и добавляет аудио-трек.
  // 3. Устанавливает SDP Offer как remote description.
  // 4. Генерирует SDP Answer, записывает его в документ звонка и меняет статус на "active".
  // 5. Подписывается на ICE кандидаты звонящего (`offerCandidates`).
  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    try {
      const callRef = doc(db, 'calls', incomingCall.id);
      const s = await getDoc(callRef);
      const d = s.data() as any;
      if (!d?.offer) throw new Error('Данные вызова отсутствуют в базе');
      
      let localStream: MediaStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        console.error('Microphone access denied or error:', err);
        throw new Error(`Нет доступа к микрофону: ${err.message || err.name || err}`);
      }
      
      const pc = createPeerConnection();
      pcRef.current = pc;
      localStreamRef.current = localStream;
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
      
      // Генерируем свои ICE кандидаты и отправляем в answerCandidates
      pc.onicecandidate = (e) => { 
        if (e.candidate) {
          addDoc(collection(callRef, 'answerCandidates'), e.candidate.toJSON()).catch(err => {
            console.error('Failed to add answer candidate:', err);
          });
        }
      };
      
      // Устанавливаем удаленное описание (Offer) звонящего
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(d.offer));
      } catch (err: any) {
        console.error('Failed to set remote offer description:', err);
        throw new Error(`Ошибка WebRTC SDP: ${err.message || err}`);
      }
      
      flushPendingIceCandidates();
      
      // Создаем свой SDP ответ (Answer) и применяем локально
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Записываем Answer в Firestore и переводим статус звонка в "active"
      try {
        await updateDoc(callRef, { 
          answer: { type: answer.type, sdp: answer.sdp }, 
          status: 'active', 
          updatedAt: serverTimestamp() 
        });
      } catch (err: any) {
        console.error('Firestore updateDoc call error:', err);
        throw new Error(`Ошибка обновления статуса звонка: ${err.message || err.code || err}`);
      }
      
      setCallStatus('active');
      setCallNotice('Разговор...');
      
      // Следим, не повесил ли трубку собеседник
      callUnsubRef.current = onSnapshot(callRef, (s2) => { 
        if (s2.data()?.status === 'ended') cleanupCall(callRef.id); 
      });
      
      // Получаем ICE кандидаты от звонящего
      candidatesUnsubRef.current = onSnapshot(collection(callRef, 'offerCandidates'), (s2) => s2.docChanges().forEach(c => { 
        if (c.type === 'added') addIceCandidateSafely(c.doc.data() as any); 
      }));
      
    } catch (error: any) {
      console.error('Failed to accept call:', error);
      setCallNotice(`Ошибка принятия звонка: ${error.message || error}`);
      cleanupCall(incomingCall.id);
    }
  };

  // Сброс звонка: отклонение входящего или сброс активного
  const handleDeclineCall = () => incomingCall && cleanupCall(incomingCall.id);
  const handleHangUp = () => activeChatId && cleanupCall(activeChatId);

  // Полная очистка переписки в активном чате (удаление всех документов сообщений из подколлекции)
  const handleClearChatHistory = async () => {
    if (!activeChatId || !window.confirm('Очистить историю чата?')) return;
    try {
      const q = await getDocs(collection(db, 'chats', activeChatId, 'messages'));
      // Удаляем каждое сообщение по очереди
      await Promise.all(q.docs.map(d => deleteDoc(d.ref)));
      // Сбрасываем превью последнего сообщения чата
      await updateDoc(doc(db, 'chats', activeChatId), { lastMessage: '', updatedAt: serverTimestamp() });
    } catch (e) { console.error(e); }
  };

  // Включение/выключение микрофона во время WebRTC разговора
  const toggleMic = () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !next);
  };

  // Включение/выключение динамика во время WebRTC разговора
  const toggleSpeaker = () => {
    const next = !isSpeakerOn;
    setIsSpeakerOn(next);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !next;
      remoteAudioRef.current.volume = next ? 1 : 0;
    }
  };

  // Добавление контакта из поиска
  const handleAddContact = async (userId: string) => {
    const target = accountResults.find((c) => c.id === userId);
    if (target) openChatWithAccount(target);
  };

  // Начало долгого нажатия на чат для вызова меню действий (удаление/скрытие чата)
  const startLongPress = (chatId: string) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      setContactActionChatId(chatId);
      longPressTriggeredRef.current = true;
    }, 600);
  };

  // Отмена долгого нажатия, если пользователь отпустил палец/мышь раньше 600мс
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Открытие существующего чата с пользователем или создание нового, если чата с ним нет.
  // Также используется для добавления выбранного пользователя в существующий групповой чат.
  const openChatWithAccount = async (target: AccountResult) => {
    if (!user || target.id === user.uid) return;
    if (accountSearchMode === 'group' && activeChatId && isGroupChat) {
      try {
        // Добавление участника в группу
        await updateDoc(doc(db, 'chats', activeChatId), { members: arrayUnion(target.id), updatedAt: serverTimestamp() });
        setShowAccountSearch(false);
      } catch {}
      return;
    }
    const existing = chats.find(c => !c.isGroup && c.members.length === 2 && c.members.includes(user.uid) && c.members.includes(target.id));
    if (existing) { 
      setActiveChatId(existing.id); 
      setShowChatList(false); 
      setShowAccountSearch(false); 
      return; 
    }
    try {
      // Создание нового чата 1-на-1
      const docRef = await addDoc(collection(db, 'chats'), { 
        title: sanitizeMojibake(target.name ?? target.email ?? ""), 
        members: [user.uid, target.id], 
        updatedAt: serverTimestamp(), 
        createdAt: serverTimestamp(), 
        lastMessage: '' 
      });
      setActiveChatId(docRef.id); 
      setShowChatList(false); 
      setShowAccountSearch(false);
    } catch {}
  };

  // Получение читаемого названия чата (для личного чата возвращает имя собеседника)
  const getChatName = (chat: Chat) => {
    if (chat.isGroup || chat.members.length !== 2) return chat.title;
    const other = chat.members.find(m => m !== user?.uid);
    return contactById.get(other ?? "")?.name || chat.title;
  };

  return {
    user, chats, activeChatId, setActiveChatId, messages, messageText, setMessageText, newChatEmail, setNewChatEmail, notice, setNotice,
    showAccountSearch, setShowAccountSearch, accountSearchMode, setAccountSearchMode, accountQuery, setAccountQuery, accountResults, setAccountResults, accountNotice, setAccountNotice,
    showGroupCreate, setShowGroupCreate, groupTitle, setGroupTitle, groupEmails, setGroupEmails, groupNotice, setGroupNotice,
    callNotice, callStatus, incomingCall, contactActionChatId, setContactActionChatId,
    isMicMuted, isSpeakerOn, callDuration, isRecording, recordingTime, recordingBlob, setRecordingBlob, setRecordingTime,
    playingVoiceId, setPlayingVoiceId, showChatList, setShowChatList, showActionsMenu, setShowActionsMenu,
    imagePreview, setImagePreview, imageZoom, setImageZoom, waveformBars, isDesktop,
    messagesEndRef, imageInputRef, audioRef, remoteAudioRef,
    activeChat, callingPartner, isChatOpen, isGroupChat,
    getChatAvatar, getChatInitial, getMemberName, formatTime, formatDate, formatDuration,
    handleSendMessage, handleSendImage, handleCreateChat, handleAccountSearch, openAddContactPanel, handleRemoveContact,
    handleCreateGroupChat, startRecording, stopRecording, sendVoiceMessage, playVoiceMessage, stopVoiceMessage,
    handleStartCall, handleAcceptCall, handleDeclineCall, handleHangUp, toggleMic, toggleSpeaker, handleAddContact, getChatName,
    startLongPress, cancelLongPress, openChatWithAccount, longPressTriggeredRef, handleClearChatHistory
  };
};
