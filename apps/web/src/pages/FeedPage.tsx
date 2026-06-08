import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../shared/firebase';
import { useAuth } from '../shared/auth';

// Типизация для объекта поста в ленте
type Post = {
  id: string;             // Уникальный идентификатор документа поста в Firestore
  authorId: string;       // UID автора поста
  authorName: string;     // Имя автора
  authorGroup: string;    // Академическая группа автора (например, ИВТ-21)
  text: string;           // Текст публикации
  tags: string[];         // Список хештегов (например, ['#новости', '#учеба'])
  category: string;       // Категория публикации (Объявления, Мероприятия и т.д.)
  createdAt?: Date;       // Дата создания (преобразуется из Firestore Timestamp)
  likesCount: number;     // Количество лайков
  commentsCount: number;  // Количество комментариев
  bookmarksCount: number; // Количество добавлений в закладки
  likedBy: string[];      // Массив UID пользователей, которые лайкнули пост
  bookmarkedBy: string[]; // Массив UID пользователей, добавивших пост в закладки
};

// Типизация для комментария к посту
type Comment = {
  id: string;             // Уникальный идентификатор документа комментария
  authorName: string;     // Имя автора комментария
  text: string;           // Текст комментария
  createdAt?: Date;       // Дата создания комментария
};

// Пропсы для компонента FeedPage (получает строку поиска из шапки приложения)
type FeedPageProps = {
  searchQuery: string;
};

// Доступные категории для фильтрации и создания постов
const categories = ['Все', 'Объявления', 'Мероприятия', 'Учёба', 'Подработка'];
const POSTS_PAGE_SIZE = 20;
const COMMENTS_LIMIT = 30;

const mapPostDoc = (docSnap: QueryDocumentSnapshot) => {
  const data = docSnap.data() as Omit<Post, 'id'>;
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined
  };
};

export const FeedPage = ({ searchQuery }: FeedPageProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const redirectToLogin = () => {
    navigate('/login', { state: { from: '/' } });
  };

  // Состояния компонента
  const [posts, setPosts] = useState<Post[]>([]); // Все загруженные посты
  const [loading, setLoading] = useState(true); // Статус загрузки ленты
  const [composerOpen, setComposerOpen] = useState(false); // Открыто ли модальное окно создания поста
  const [composerText, setComposerText] = useState(''); // Текст нового поста в форме
  const [composerTags, setComposerTags] = useState(''); // Теги нового поста (строка ввода)
  const [composerGroup, setComposerGroup] = useState(user?.group ?? 'ИВТ-21'); // Группа, от которой пишется пост
  const [filterCategory, setFilterCategory] = useState('Все'); // Текущая выбранная категория для фильтрации
  const [composerCategory, setComposerCategory] = useState('Объявления'); // Выбранная категория для нового поста
  const [actionNotice, setActionNotice] = useState<string | null>(null); // Уведомления об операциях (ошибки, успехи)
  const [commentPostId, setCommentPostId] = useState<string | null>(null); // ID поста, для которого сейчас открыты комментарии
  const [commentText, setCommentText] = useState(''); // Текст вводимого комментария
  const [comments, setComments] = useState<Comment[]>([]); // Список комментариев для выбранного поста
  const [olderPosts, setOlderPosts] = useState<Post[]>([]);
  const [lastPostDoc, setLastPostDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Эффект 1: realtime только для первой страницы ленты (лимит чтений Firestore)
  useEffect(() => {
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(POSTS_PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const nextPosts = snapshot.docs.map(mapPostDoc);
      setPosts(nextPosts);
      setLastPostDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
      setHasMorePosts(snapshot.docs.length === POSTS_PAGE_SIZE);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const mergedPosts = useMemo(() => {
    const firstPageIds = new Set(posts.map((post) => post.id));
    const older = olderPosts.filter((post) => !firstPageIds.has(post.id));
    return [...posts, ...older];
  }, [posts, olderPosts]);

  const loadMorePosts = useCallback(async () => {
    if (!lastPostDoc || loadingMore || !hasMorePosts) return;
    setLoadingMore(true);
    try {
      const nextQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastPostDoc),
        limit(POSTS_PAGE_SIZE)
      );
      const snapshot = await getDocs(nextQuery);
      const nextPosts = snapshot.docs.map(mapPostDoc);
      setOlderPosts((current) => {
        const ids = new Set(current.map((post) => post.id));
        return [...current, ...nextPosts.filter((post) => !ids.has(post.id))];
      });
      setLastPostDoc(snapshot.docs[snapshot.docs.length - 1] ?? lastPostDoc);
      setHasMorePosts(snapshot.docs.length === POSTS_PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMorePosts, lastPostDoc, loadingMore]);

  // Эффект 2: Синхронизация группы автора в форме с данными текущего профиля при их загрузке
  useEffect(() => {
    if (user?.group) {
      setComposerGroup(user.group);
    }
  }, [user?.group]);

  // Эффект 3: Realtime-подписка на комментарии к конкретному посту при его развертывании
  useEffect(() => {
    // Если комментарии не развернуты ни для одного поста, очищаем стейт и выходим
    if (!commentPostId) {
      setComments([]);
      return;
    }
    // Ссылка на подколлекцию "comments" внутри документа выбранного поста в коллекции "posts"
    const commentsRef = collection(db, 'posts', commentPostId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'), limit(COMMENTS_LIMIT));

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const nextComments = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<Comment, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined
        };
      });
      setComments(nextComments);
    });

    return () => unsubscribe();
  }, [commentPostId]);

  // Вычисляемое свойство: фильтрация постов по категории и поисковому запросу
  // useMemo предотвращает лишние пересчеты при каждом рендере, если зависимости не изменились
  const filteredPosts = useMemo(() => {
    const queryLower = searchQuery.trim().toLowerCase();
    return mergedPosts.filter((post) => {
      // Проверка на соответствие выбранной категории
      const matchesCategory = filterCategory === 'Все' || post.category === filterCategory;
      // Создаем единую строку для поиска по имени автора, группе, тексту поста и тегам
      const haystack = `${post.authorName} ${post.authorGroup} ${post.text} ${post.tags.join(' ')}`.toLowerCase();
      // Проверяем, содержит ли строка поисковый запрос
      const matchesQuery = !queryLower || haystack.includes(queryLower);
      return matchesCategory && matchesQuery;
    });
  }, [mergedPosts, searchQuery, filterCategory]);

  // Функция переключения лайка (поставить/убрать лайк)
  const handleToggleLike = async (post: Post) => {
    if (!user) {
      redirectToLogin();
      return;
    }
    const ref = doc(db, 'posts', post.id);
    const hasLiked = post.likedBy?.includes(user.uid); // Проверяем, лайкал ли пользователь этот пост ранее

    // Транзакционное обновление в Firestore:
    // - Добавляем или удаляем UID пользователя из массива likedBy с помощью arrayUnion / arrayRemove
    // - Увеличиваем или уменьшаем likesCount атомарно с помощью increment()
    await updateDoc(ref, {
      likedBy: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      likesCount: increment(hasLiked ? -1 : 1)
    });
  };

  // Функция открытия/закрытия блока комментариев под постом
  const handleComment = (postId: string) => {
    setCommentPostId((current) => (current === postId ? null : postId));
    setCommentText(''); // Очищаем поле ввода комментария
  };

  // Функция отправки нового комментария
  const handleSubmitComment = async (postId: string) => {
    if (!user) {
      redirectToLogin();
      return;
    }
    if (!commentText.trim()) {
      setActionNotice('Комментарий пустой. Добавьте текст и отправьте ещё раз.');
      return;
    }

    // Добавляем новый комментарий в подколлекцию "comments" внутри документа поста
    const commentsRef = collection(db, 'posts', postId, 'comments');
    await addDoc(commentsRef, {
      authorName: user.name,
      authorId: user.uid,
      text: commentText.trim(),
      createdAt: serverTimestamp() // Метка времени сервера Firebase
    });

    // Атомарно увеличиваем счетчик комментариев в основном документе поста на 1
    await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
    setCommentText(''); // Очищаем поле
    setActionNotice('Комментарий добавлен и виден в ленте.');
  };

  // Функция публикации нового поста
  const handleCreatePost = async () => {
    if (!user) {
      redirectToLogin();
      return;
    }
    if (!composerText.trim()) {
      setActionNotice('Добавьте текст поста, чтобы опубликовать.');
      return;
    }

    // Обработка тегов: разделяем по запятой, убираем пробелы, добавляем символ '#' в начало, если его нет
    const tags = composerTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

    // Добавляем документ в коллекцию "posts" в Firestore
    await addDoc(collection(db, 'posts'), {
      authorId: user.uid,
      authorName: user.name,
      authorGroup: composerGroup || user.group || 'Моя группа',
      text: composerText.trim(),
      tags,
      category: composerCategory,
      createdAt: serverTimestamp(), // Время сервера Firebase
      likesCount: 0,
      commentsCount: 0,
      bookmarksCount: 0,
      likedBy: [],
      bookmarkedBy: []
    });

    // Сбрасываем стейты формы
    setComposerText('');
    setComposerTags('');
    setComposerOpen(false); // Закрываем модальное окно
    setActionNotice('Пост опубликован и добавлен в ленту.');
  };

  return (
    <div className="flex flex-col gap-5">
      {!user && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#3390ec]/30 bg-[#e7f3ff] px-4 py-3 text-sm text-[#3390ec] dark:border-[#3a8be0]/30 dark:bg-slate-900/70 dark:text-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <p>Вы не вошли. Чтобы публиковать, лайкать и комментировать — войдите в аккаунт.</p>
          <button
            type="button"
            onClick={redirectToLogin}
            className="rounded-lg bg-[#3390ec] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2886c6] dark:bg-[#3a8be0] dark:hover:bg-[#2e78c6]"
          >
            Войти
          </button>
        </div>
      )}

      {actionNotice && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-[#e7f3ff] px-4 py-3 text-sm text-[#3390ec] dark:bg-slate-900/70 dark:text-slate-200 dark:border dark:border-slate-800">
          <p>{actionNotice}</p>
          <button
            onClick={() => setActionNotice(null)}
            className="text-xs font-medium hover:underline text-[#3390ec] dark:text-slate-300"
          >
            Скрыть
          </button>
        </div>
      )}

      {/* Заголовок страницы и кнопка создания нового поста */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Лента</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-0.5">Новости кампуса и объявления</p>
        </div>
        <button
          onClick={() => (user ? setComposerOpen(true) : redirectToLogin())}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3390ec] to-[#2886c6] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#3390ec]/20 hover:shadow-lg hover:shadow-[#3390ec]/30 hover:-translate-y-0.5 transition-all dark:from-[#3a8be0] dark:to-[#2e78c6] dark:shadow-[#3a8be0]/20 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          {user ? 'Новый пост' : 'Войти, чтобы публиковать'}
        </button>
      </div>

      {/* Кнопки переключения категорий (фильтр) */}
      <div className="flex flex-wrap gap-2 pb-2">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setFilterCategory(item)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 shadow-sm ${filterCategory === item
              ? 'bg-gradient-to-r from-[#3390ec] to-[#2886c6] text-white dark:from-[#3a8be0] dark:to-[#2e78c6] shadow-md scale-105'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50 dark:hover:bg-slate-800'
              }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Лоадер при первоначальной загрузке постов */}
      {loading && (
        <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm border border-gray-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
          Загружаем ленту...
        </div>
      )}

      {/* Список постов */}
      <div className="flex flex-col gap-3">
        {filteredPosts.map((post, index) => {
          // Проверяем, лайкнул ли авторизованный пользователь данный конкретный пост
          const liked = user ? post.likedBy?.includes(user.uid) : false;
          return (
            <article
              key={post.id}
              className="group rounded-2xl bg-white p-5 shadow-sm border border-gray-100 dark:bg-[#1e293b]/60 dark:backdrop-blur-sm dark:border-slate-800/60 hover:shadow-md hover:border-[#3390ec]/30 dark:hover:border-[#3a8be0]/40 hover:-translate-y-0.5 transition-all duration-300"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start gap-3.5">
                {/* Аватарка автора (первая буква имени) с красивым градиентом */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#7c9ecf] to-[#5a84c2] flex items-center justify-center text-white font-bold text-lg shadow-inner flex-shrink-0">
                  {post.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {/* Имя и метаданные автора поста (группа, дата публикации) */}
                      <h3 className="font-bold text-gray-900 dark:text-white dark:group-hover:text-blue-100 transition-colors">{post.authorName}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                        <span className="font-medium text-gray-600 dark:text-slate-300">{post.authorGroup}</span>
                        <span>•</span>
                        <span>{post.createdAt ? post.createdAt.toLocaleDateString() : 'Недавно'}</span>
                      </div>
                    </div>
                    {/* Бейдж категории поста */}
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[11px] font-semibold text-blue-600 border border-blue-100/50 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20 whitespace-nowrap">
                      {post.category}
                    </span>
                  </div>
                  {/* Основной текст поста */}
                  <p className="mt-3 text-[15px] leading-relaxed text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{post.text}</p>
                  
                  {/* Отрисовка тегов (если они есть) */}
                  {post.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded-md bg-gray-50 text-xs font-medium text-gray-600 border border-gray-100 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Кнопки взаимодействий: Лайк и Комментарии */}
                  <div className="mt-4 flex items-center gap-6 text-[13px] font-semibold text-gray-500 dark:text-slate-400">
                    {/* Кнопка Лайка с микро-анимацией pop-эффекта */}
                    <button
                      onClick={() => handleToggleLike(post)}
                      className={`group flex items-center gap-1.5 transition-colors ${liked ? 'text-red-500' : 'text-gray-500 dark:text-slate-400 hover:text-red-500/80'
                        }`}
                    >
                      <style>{`@keyframes likePop { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }`}</style>
                      <svg
                        className={`w-5 h-5 transition-transform group-active:scale-95 ${liked ? 'animate-[likePop_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]' : ''}`}
                        fill={liked ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={liked ? 0 : 1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className={`text-[13px] font-medium transition-colors ${liked ? 'text-red-500' : ''}`}>{post.likesCount ?? 0}</span>
                    </button>

                    {/* Кнопка раскрытия комментариев */}
                    <button
                      onClick={() => handleComment(post.id)}
                      className="group flex items-center gap-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
                    >
                      <svg className="w-5 h-5 transition-transform group-active:scale-95" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-[13px] font-medium">{post.commentsCount ?? 0}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Блок комментариев (рендерится только если этот пост выбран) */}
              {commentPostId === post.id && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:bg-slate-900/60 dark:border-slate-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Комментарии</p>
                  
                  {/* Список уже отправленных комментариев */}
                  <div className="mt-3 flex flex-col gap-2">
                    {comments.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-slate-400">Пока нет комментариев</p>
                    )}
                    {comments.map((comment) => (
                      <div key={comment.id} className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900 dark:border dark:border-slate-800">
                        <p className="text-xs font-medium text-gray-600 dark:text-slate-300">{comment.authorName}</p>
                        <p className="mt-1 text-sm text-gray-700 dark:text-slate-200">{comment.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Форма добавления нового комментария */}
                  <div className="mt-3 flex gap-2">
                    <input
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Написать комментарий..."
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#3390ec] focus:ring-2 focus:ring-[#e7f3ff] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-[#1e3a5f]"
                    />
                    <button
                      onClick={() => handleSubmitComment(post.id)}
                      className="rounded-lg bg-[#3390ec] px-4 py-2 text-sm font-medium text-white hover:bg-[#2886c6] transition dark:bg-[#3a8be0] dark:hover:bg-[#2e78c6]"
                    >
                      Отправить
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {/* Заглушка, если ничего не найдено по поиску или фильтрам */}
        {!loading && filteredPosts.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm border border-gray-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>Ничего не найдено</p>
          </div>
        )}
        {!loading && hasMorePosts && filterCategory === 'Все' && !searchQuery.trim() && (
          <button
            type="button"
            onClick={loadMorePosts}
            disabled={loadingMore}
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-[#3390ec] hover:bg-gray-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-[#60a5fa] dark:hover:bg-slate-800"
          >
            {loadingMore ? 'Загружаем...' : 'Показать ещё'}
          </button>
        )}
      </div>

      {/* Модальное окно создания нового поста (Composer) */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-800">
            {/* Шапка модального окна */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Новый пост</h3>
              <button
                onClick={() => setComposerOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition dark:hover:bg-slate-800"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Поля формы нового поста */}
            <div className="flex flex-col gap-3">
              {/* Поле ввода текста поста */}
              <textarea
                value={composerText}
                onChange={(event) => setComposerText(event.target.value)}
                placeholder="Что нового?"
                className="w-full min-h-[120px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#3390ec] focus:bg-white resize-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {/* Поле ввода группы */}
              <input
                value={composerGroup}
                onChange={(event) => setComposerGroup(event.target.value)}
                placeholder="Группа"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#3390ec] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {/* Поле ввода тегов через запятую */}
              <input
                value={composerTags}
                onChange={(event) => setComposerTags(event.target.value)}
                placeholder="Теги через запятую"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#3390ec] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {/* Кнопки выбора категории для поста */}
              <div className="flex flex-wrap gap-2">
                {categories
                  .filter((item) => item !== 'Все') // Фильтруем "Все", так как пост должен принадлежать конкретной категории
                  .map((item) => (
                    <button
                      key={item}
                      onClick={() => setComposerCategory(item)}
                      className={`rounded-lg px-3 py-1 text-sm font-medium transition ${composerCategory === item
                        ? 'bg-[#3390ec] text-white dark:bg-[#3a8be0]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                    >
                      {item}
                    </button>
                  ))}
              </div>
            </div>
            {/* Кнопки управления формой (Отмена и Опубликовать) */}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setComposerOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Отмена
              </button>
              <button
                onClick={handleCreatePost}
                className="px-5 py-2 rounded-lg bg-[#3390ec] text-sm font-medium text-white hover:bg-[#2886c6] transition dark:bg-[#3a8be0] dark:hover:bg-[#2e78c6]"
              >
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
