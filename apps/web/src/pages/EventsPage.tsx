import { useEffect, useState } from 'react';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../shared/firebase';
import { useAuth } from '../shared/auth';

// Типизация объекта события (мероприятия)
type EventItem = {
  id: string;          // Уникальный идентификатор документа события в Firestore
  title: string;       // Название мероприятия
  date: string;        // Дата и время (строка в формате ISO из datetime-local)
  place: string;       // Место проведения
  organizer: string;   // Имя организатора (студента)
  organizerId: string; // UID организатора
  attendees: string[]; // Массив UID студентов, которые подтвердили свое участие (RSVP)
  createdAt?: Date;    // Дата создания записи о мероприятии
};

// Функция форматирования даты в человекочитаемый вид на русском языке
// Например: "25 мая в 18:30" вместо "2026-05-25T18:30"
const formatEventDate = (dateString: string) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return dateString; // Возвращаем исходную строку, если произошла ошибка парсинга
  }
};

export const EventsPage = () => {
  // Получаем текущего авторизованного пользователя
  const { user } = useAuth();

  // Состояния компонента
  const [events, setEvents] = useState<EventItem[]>([]); // Список всех мероприятий
  const [title, setTitle] = useState(''); // Поле ввода: Название события
  const [date, setDate] = useState(''); // Поле ввода: Дата и время
  const [place, setPlace] = useState(''); // Поле ввода: Место проведения
  const [notice, setNotice] = useState(''); // Уведомления об успехе или ошибке

  // Эффект: Realtime подписка на коллекцию "events" в БД Firestore.
  // Запрашивает события, отсортированные по времени создания в обратном порядке (сначала новые)
  useEffect(() => {
    const eventsQuery = query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(30));
    
    // Подписываемся на обновления коллекции. При любых изменениях в БД стейт обновляется в реальном времени.
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const nextEvents = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<EventItem, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          // Преобразуем Timestamp Firebase в объект Date для работы в JS/React
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined
        };
      });
      setEvents(nextEvents);
    });

    return () => unsubscribe(); // Отписка от обновлений при размонтировании
  }, []);

  // Функция создания нового мероприятия
  const handleCreate = async () => {
    if (!user) {
      setNotice('Войдите, чтобы создавать события.');
      return;
    }
    if (!title.trim() || !date.trim() || !place.trim()) {
      setNotice('Заполните все поля.');
      return;
    }

    // Сохраняем новое событие в коллекцию "events" в Firestore
    await addDoc(collection(db, 'events'), {
      title: title.trim(),
      date: date.trim(),
      place: place.trim(),
      organizer: user.name,
      organizerId: user.uid,
      attendees: [user.uid], // Создатель автоматически добавляется в список идущих (attendees)
      createdAt: serverTimestamp() // Метка времени сервера Firebase
    });

    // Очищаем форму
    setTitle('');
    setDate('');
    setPlace('');
    setNotice('Событие добавлено.');
  };

  // Функция переключения статуса "Иду / Не иду" на мероприятие (RSVP)
  const toggleRsvp = async (event: EventItem) => {
    if (!user) {
      setNotice('Войдите, чтобы отвечать на приглашения.');
      return;
    }

    const ref = doc(db, 'events', event.id);
    const going = event.attendees?.includes(user.uid); // Проверяем, записан ли текущий пользователь в список

    // Обновляем массив участников в Firestore с использованием arrayRemove / arrayUnion
    await updateDoc(ref, {
      attendees: going ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Шапка страницы */}
      <div className="flex flex-col gap-2 mb-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">События</h2>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-0.5">Мероприятия и встречи</p>
      </div>

      {/* Форма создания события */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 dark:bg-[#1e293b]/60 dark:backdrop-blur-sm dark:border-slate-800/60">
        <p className="text-[15px] font-semibold text-gray-800 dark:text-slate-200 mb-4">Создать событие</p>
        <div className="grid gap-3.5 md:grid-cols-3">
          {/* Поле названия */}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Название"
            className="w-full rounded-xl border border-transparent bg-gray-50 dark:bg-slate-900/80 px-4 py-3 text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300/50 dark:focus:border-blue-500/30 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 dark:text-slate-100"
          />
          {/* Выбор даты и времени */}
          <input
            type="datetime-local"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            placeholder="Дата и время"
            className="w-full rounded-xl border border-transparent bg-gray-50 dark:bg-slate-900/80 px-4 py-3 text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300/50 dark:focus:border-blue-500/30 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 text-gray-800 dark:text-slate-200 [color-scheme:light] dark:[color-scheme:dark]"
          />
          {/* Поле места */}
          <input
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Место"
            className="w-full rounded-xl border border-transparent bg-gray-50 dark:bg-slate-900/80 px-4 py-3 text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300/50 dark:focus:border-blue-500/30 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 dark:text-slate-100"
          />
        </div>
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400">События видны всем студентам</p>
          <button
            onClick={handleCreate}
            className="rounded-xl bg-gradient-to-r from-[#3390ec] to-[#2886c6] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#3390ec]/20 hover:shadow-lg hover:shadow-[#3390ec]/30 hover:-translate-y-0.5 transition-all dark:from-[#3a8be0] dark:to-[#2e78c6] dark:shadow-[#3a8be0]/20 active:scale-95"
          >
            Создать
          </button>
        </div>
        {/* Вывод плашки обратной связи */}
        {notice && (
          <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
            {notice}
          </div>
        )}
      </div>

      {/* Отрисовка списка карточек событий */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          // Проверяем, идет ли текущий авторизованный пользователь на данное мероприятие
          const going = user ? event.attendees?.includes(user.uid) : false;
          return (
            <div key={event.id} className="group rounded-2xl bg-white p-5 shadow-sm border border-gray-100 dark:bg-[#1e293b]/60 dark:backdrop-blur-sm dark:border-slate-800/60 hover:shadow-md hover:-translate-y-1 hover:border-[#3390ec]/30 dark:hover:border-[#3a8be0]/40 transition-all duration-300 flex flex-col">
              <div className="flex items-start gap-4">
                {/* Симпатичная иконка календаря */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e7f3ff] to-[#c4e0ff] dark:from-blue-500/20 dark:to-blue-600/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <svg className="w-7 h-7 text-[#3390ec] dark:text-[#60a5fa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                {/* Описание события: Название, Дата, Место, Организатор */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="font-bold text-[18px] text-gray-900 dark:text-slate-100 leading-snug mb-1">{event.title}</h3>
                  <div className="flex flex-col mb-3">
                    <p className="text-[14px] font-medium text-[#3390ec] dark:text-[#60a5fa] drop-shadow-sm mb-1">{formatEventDate(event.date)}</p>
                    <p className="text-[14px] text-gray-700 dark:text-slate-300">{event.place}</p>
                  </div>
                  <p className="text-[13px] font-medium text-gray-400 dark:text-slate-500">Организатор: <span className="text-gray-500 dark:text-slate-400">{event.organizer}</span></p>
                </div>
              </div>

              {/* Нижняя панель карточки: количество участников и интерактивная кнопка RSVP */}
              <div className="mt-auto pt-5">
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700/50 pt-4">
                  {/* Счетчик участников */}
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-slate-400">
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {event.attendees?.length ?? 0}
                  </span>
                  {/* Кнопка с градиентом при согласии прийти */}
                  <button
                    onClick={() => toggleRsvp(event)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${going
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20'
                      }`}
                  >
                    {going ? '✓ Иду' : 'Пойду'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {/* Заглушка при отсутствии событий */}
        {events.length === 0 && (
          <div className="col-span-full rounded-xl bg-white dark:bg-slate-900 p-8 text-center text-gray-500 dark:text-slate-400 shadow-sm border border-gray-100">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>Событий пока нет</p>
          </div>
        )}
      </div>
    </div>
  );
};
