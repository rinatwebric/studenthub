import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../shared/firebase';

// Типизация строки пользователя для таблицы управления
type UserRow = {
  id: string;                         // Уникальный ID пользователя (UID из Firebase Auth)
  name: string;                       // Имя пользователя
  email: string;                      // Электронная почта
  role: 'Student' | 'Moderator' | 'Admin'; // Роль пользователя в системе
};

// Типизация поста в админ-панели
type AdminPost = {
  id: string;
  authorName: string;
  authorGroup?: string;
  text: string;
  createdAt?: Date;
  commentsCount?: number;
};

// Типизация комментария в админ-панели
type AdminComment = {
  id: string;
  authorName: string;
  text: string;
  createdAt?: Date;
};

// Типизация события в админ-панели
type AdminEvent = {
  id: string;
  title: string;
  date: string;
  place: string;
  organizer: string;
  organizerId: string;
  attendees?: string[];
  createdAt?: Date;
};

export const AdminPage = () => {
  // Локальные состояния админки
  const [users, setUsers] = useState<UserRow[]>([]); // Список зарегистрированных пользователей
  const [notice, setNotice] = useState(''); // Системные уведомления/ошибки
  const [posts, setPosts] = useState<AdminPost[]>([]); // Список всех постов для модерации
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null); // Выбранный пост для модерации комментариев
  const [comments, setComments] = useState<AdminComment[]>([]); // Комментарии к выбранному посту
  const [events, setEvents] = useState<AdminEvent[]>([]); // Список всех событий для модерации

  // Эффект 1: Однократная загрузка списка пользователей из Firestore при входе в админку.
  // Используется getDocs (разовый запрос) вместо onSnapshot для оптимизации запросов и трафика
  useEffect(() => {
    const loadUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const nextUsers = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as UserRow;
        return { ...data, id: docSnap.id };
      });
      setUsers(nextUsers);
    };
    loadUsers();
  }, []);

  // Эффект 2: Realtime подписка на посты для быстрого удаления спама/некорректных публикаций
  useEffect(() => {
    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const nextPosts = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<AdminPost, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined
        };
      });
      setPosts(nextPosts);
    });
    return () => unsubscribe();
  }, []);

  // Эффект 3: Realtime подписка на мероприятия для модерации встреч
  useEffect(() => {
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(eventsRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const nextEvents = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<AdminEvent, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined
        };
      });
      setEvents(nextEvents);
    });
    return () => unsubscribe();
  }, []);

  // Эффект 4: Realtime подписка на комментарии к выбранному для модерации посту
  useEffect(() => {
    if (!selectedPostId) {
      setComments([]);
      return;
    }
    const commentsRef = collection(db, 'posts', selectedPostId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const nextComments = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<AdminComment, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined
        };
      });
      setComments(nextComments);
    });
    return () => unsubscribe();
  }, [selectedPostId]);

  // Функция изменения роли пользователя (например, сделать Администратором или Модератором)
  const handleRoleChange = async (userId: string, role: UserRow['role']) => {
    // Записываем новую роль в документ пользователя users/{uid} в Firestore
    await updateDoc(doc(db, 'users', userId), { role });
    // Обновляем состояние локально для мгновенного отображения изменений в UI
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, role } : user)));
    setNotice('Роль обновлена.');
  };

  // Функция удаления аккаунта пользователя из базы данных
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Удалить пользователя?')) {
      return;
    }
    // Удаляем документ пользователя из коллекции users
    await deleteDoc(doc(db, 'users', userId));
    // Обновляем стейт, отфильтровывая удаленного
    setUsers((current) => current.filter((user) => user.id !== userId));
    setNotice('Пользователь удалён.');
  };

  // Функция удаления публикации (поста)
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Удалить пост и все комментарии?')) {
      return;
    }
    // Перед удалением поста нужно очистить его подколлекцию комментариев (firebase не удаляет вложенные коллекции автоматически)
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const snapshot = await getDocs(commentsRef);
    
    // Удаляем все комментарии параллельно
    await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
    
    // Удаляем основной документ поста
    await deleteDoc(doc(db, 'posts', postId));
    
    // Сбрасываем выбранный пост, если удален именно он
    setSelectedPostId((current) => (current === postId ? null : current));
    setNotice('Пост удалён.');
  };

  // Функция удаления конкретного комментария
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm('Удалить комментарий?')) {
      return;
    }
    // Удаляем документ комментария из подколлекции posts/{postId}/comments/{commentId}
    await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
    setNotice('Комментарий удалён.');
  };

  // Функция удаления события
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Удалить событие?')) {
      return;
    }
    // Удаляем документ из коллекции events
    await deleteDoc(doc(db, 'events', eventId));
    setNotice('Событие удалено.');
  };

  return (
    <section className="flex flex-col gap-6 p-4">
      {/* Заголовок админки */}
      <header className="mb-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Админ-панель</h2>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-1">Управление ролями и модерация контента.</p>
      </header>

      {/* Оповещения */}
      {notice && (
        <div className="rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
          {notice}
        </div>
      )}

      {/* Раздел 1: Управление пользователями и их ролями */}
      <div className="rounded-2xl border border-gray-100 dark:border-slate-800/60 bg-white p-6 shadow-sm dark:bg-[#1e293b]/60 dark:backdrop-blur-sm">
        <h3 className="text-[17px] font-bold text-gray-900 dark:text-white mb-5">Пользователи ({users.length})</h3>
        <div className="flex flex-col gap-3">
          {users.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400">Пользователей нет.</p>}
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 p-4 border border-gray-100 dark:border-slate-800/50 hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors">
              <div>
                <p className="text-[15px] font-bold text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-[13px] font-medium text-gray-500 dark:text-slate-400 mt-0.5">{user.email}</p>
              </div>
              {/* Переключатели ролей: Student, Moderator, Admin и кнопка удаления */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {(['Student', 'Moderator', 'Admin'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(user.id, role)}
                    className={`rounded-full px-4 py-1.5 font-semibold transition-all ${user.role === role
                        ? 'bg-gradient-to-r from-[#3390ec] to-[#2886c6] text-white shadow-md shadow-[#3390ec]/20 scale-105'
                        : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 border border-gray-200/60 dark:border-slate-700/50 dark:hover:bg-slate-700'
                      }`}
                  >
                    {role}
                  </button>
                ))}
                <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-700 mx-1 hidden sm:block"></div>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="rounded-full px-4 py-1.5 font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Раздел 2: Модерация постов и комментариев */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Список постов */}
        <div className="rounded-2xl border border-gray-100 dark:border-slate-800/60 bg-white p-6 shadow-sm dark:bg-[#1e293b]/60 dark:backdrop-blur-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[17px] font-bold text-gray-900 dark:text-white">Посты</h3>
            <span className="text-[13px] font-semibold text-[#3390ec] bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full">{posts.length} шт.</span>
          </div>
          <div className="flex flex-col gap-4">
            {posts.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400">Постов нет.</p>}
            {posts.map((post) => (
              <div key={post.id} className={`rounded-2xl border ${selectedPostId === post.id ? 'border-[#3390ec] dark:border-[#3a8be0] shadow-sm' : 'border-gray-100 dark:border-slate-800/50'} bg-white dark:bg-slate-900/50 p-5 transition-all`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white">{post.authorName}</p>
                    {post.authorGroup && <p className="text-[13px] font-medium text-[#3390ec] dark:text-[#60a5fa] mt-0.5">{post.authorGroup}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Кнопка раскрытия комментариев к конкретному посту в правой панели */}
                    <button
                      onClick={() => setSelectedPostId(post.id)}
                      className={`text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${selectedPostId === post.id ? 'bg-[#3390ec] text-white' : 'text-[#3390ec] hover:bg-blue-50 dark:hover:bg-blue-500/10'}`}
                    >
                      Комментарии
                    </button>
                    {/* Кнопка удаления поста */}
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-[13px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
                <p className="mt-4 text-[15px] text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {post.text}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800/50 flex items-center text-[13px] font-medium text-gray-500 dark:text-slate-400">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {post.commentsCount ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Правая панель: Список комментариев к выбранному посту */}
        <div className="rounded-2xl border border-gray-100 dark:border-slate-800/60 bg-white p-6 shadow-sm dark:bg-[#1e293b]/60 dark:backdrop-blur-sm self-start sticky top-6">
          <h3 className="text-[17px] font-bold text-gray-900 dark:text-white mb-5">Модерация ответов</h3>
          {!selectedPostId && (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-[14px] font-medium text-gray-500 dark:text-slate-400">Выберите пост для просмотра его комментариев.</p>
            </div>
          )}
          {selectedPostId && (
            <div className="flex flex-col gap-3">
              {comments.length === 0 && <p className="text-[14px] text-gray-500 dark:text-slate-400 text-center py-4">Комментариев нет.</p>}
              {comments.map((comment) => (
                <div key={comment.id} className="group rounded-xl border border-gray-100 dark:border-slate-800/50 bg-gray-50/50 dark:bg-slate-900/50 p-4 hover:border-blue-100 dark:hover:border-blue-500/20 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-bold text-gray-900 dark:text-slate-200">{comment.authorName}</p>
                    <button
                      onClick={() => handleDeleteComment(selectedPostId, comment.id)}
                      className="opacity-0 group-hover:opacity-100 text-[12px] font-semibold text-red-500 hover:text-red-600 transition-all px-2 py-1 rounded bg-red-50 dark:bg-red-500/10"
                    >
                      Удалить
                    </button>
                  </div>
                  <p className="mt-1.5 text-[14px] text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{comment.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Раздел 3: Модерация событий */}
      <div className="rounded-2xl border border-gray-100 dark:border-slate-800/60 bg-white p-6 shadow-sm dark:bg-[#1e293b]/60 dark:backdrop-blur-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-bold text-gray-900 dark:text-white">События</h3>
          <span className="text-[13px] font-semibold text-[#3390ec] bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full">{events.length} шт.</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {events.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400 col-span-full">Событий нет.</p>}
          {events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-gray-100 dark:border-slate-800/50 bg-gray-50/50 dark:bg-slate-900/50 p-5 hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-bold text-gray-900 dark:text-white">{event.title}</p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[13px] font-medium text-[#3390ec] dark:text-[#60a5fa]">{event.date}</p>
                    <p className="text-[13px] font-medium text-gray-500 dark:text-slate-400">{event.place}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[12px] font-medium text-gray-400 dark:text-slate-500">
                    <span>Орг: <span className="text-gray-600 dark:text-slate-300">{event.organizer}</span></span>
                    <span className="flex items-center">
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {event.attendees?.length ?? 0}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
