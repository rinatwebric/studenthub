import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../shared/firebase';
import { useAuth } from '../shared/auth';

// Тип для дней недели: 1 - Понедельник, 6 - Суббота
type WeekDay = 1 | 2 | 3 | 4 | 5 | 6;

// Словарь локализации интерфейса на русский язык
const T = {
  monShort: 'Пн',
  mon: 'Понедельник',
  tueShort: 'Вт',
  tue: 'Вторник',
  wedShort: 'Ср',
  wed: 'Среда',
  thuShort: 'Чт',
  thu: 'Четверг',
  friShort: 'Пт',
  fri: 'Пятница',
  satShort: 'Сб',
  sat: 'Суббота',
  day: 'День',
  fillGroup: 'Заполните группу в профиле.',
  fillFields: 'Заполните все поля.',
  added: 'Пара добавлена.',
  schedule: 'Расписание',
  scheduleStudy: 'Расписание занятий',
  addLesson: 'Добавить пару',
  timePlaceholder: 'Время (например: 09:00-10:30)',
  titlePlaceholder: 'Название предмета',
  placePlaceholder: 'Аудитория',
  saveByGroup: 'Расписание сохраняется по группе',
  add: 'Добавить',
  schedulePrefix: 'Расписание:',
  noLessons: 'На этот день пар пока нет',
  readOnly: 'Вы можете только смотреть расписание.',
  editorOnly: 'Добавлять пары могут только Admin и Moderator.',
  confirmDeleteLesson: 'Удалить эту пару из расписания?',
  lessonDeleted: 'Пара удалена.',
  delete: 'Удалить',
  deleteFailed: 'Не удалось удалить пару.'
} as const;

// Структурированный массив дней недели для вывода кнопок выбора и заголовков
const WEEK_DAYS: Array<{ id: WeekDay; short: string; full: string }> = [
  { id: 1, short: T.monShort, full: T.mon },
  { id: 2, short: T.tueShort, full: T.tue },
  { id: 3, short: T.wedShort, full: T.wed },
  { id: 4, short: T.thuShort, full: T.thu },
  { id: 5, short: T.friShort, full: T.fri },
  { id: 6, short: T.satShort, full: T.sat }
];

// Функция определения текущего дня недели при загрузке страницы.
// Если сегодня воскресенье (0), возвращает понедельник (1).
const getInitialDay = (): WeekDay => {
  const day = new Date().getDay();
  if (day === 0) return 1;
  if (day >= 1 && day <= 6) return day as WeekDay;
  return 1;
};

// Типизация отдельного занятия (пары)
type Lesson = {
  id: string;        // Уникальный идентификатор пары (генерируется на основе таймстампа)
  time: string;      // Время проведения (например, "09:00-10:30")
  title: string;     // Название предмета (например, "Высшая математика")
  place: string;     // Аудитория или формат (например, "Ауд. 403" или "Дистанционно")
  day?: WeekDay;     // День недели занятия
};

// Типизация документа расписания в Firestore
type ScheduleDoc = {
  group: string;     // Группа, к которой относится расписание (например, "ИВТ-21")
  lessons: Lesson[]; // Массив пар
  ownerId?: string;  // Кто последний редактировал/создавал расписание
};

export const SchedulePage = () => {
  // Получаем текущего авторизованного пользователя
  const { user } = useAuth();

  // Состояния компонента
  const [lessons, setLessons] = useState<Lesson[]>([]); // Полный список пар для группы пользователя
  const [selectedDay, setSelectedDay] = useState<WeekDay>(getInitialDay); // Текущий выбранный день недели в табах
  const [title, setTitle] = useState(''); // Поле ввода: Название предмета
  const [time, setTime] = useState(''); // Поле ввода: Время
  const [place, setPlace] = useState(''); // Поле ввода: Аудитория
  const [notice, setNotice] = useState(''); // Текст уведомления (ошибки/успех)

  // Флаг роли: редактировать расписание могут только Администраторы (Admin) и Модераторы (Moderator)
  const isScheduleEditor = user?.role === 'Admin' || user?.role === 'Moderator';

  // Вычисляемое название выбранного дня на русском языке для заголовка таблицы
  const selectedDayLabel = WEEK_DAYS.find((day) => day.id === selectedDay)?.full ?? T.day;

  // Вычисляемый список занятий конкретно на выбранный день недели с сортировкой по времени начала
  const lessonsForSelectedDay = useMemo(
    () =>
      lessons
        .filter((lesson) => (lesson.day ?? 1) === selectedDay)
        .sort((a, b) => a.time.localeCompare(b.time)), // Сортировка по строке времени
    [lessons, selectedDay]
  );

  // Эффект: Realtime подписка на расписание конкретной группы из БД Firestore.
  // Документ в коллекции "schedules" имеет ID, равный названию группы (например, "ИВТ-21").
  useEffect(() => {
    if (!user?.group) {
      return; // Если у пользователя в профиле не указана группа, расписание загрузить невозможно
    }
    const ref = doc(collection(db, 'schedules'), user.group);
    
    // onSnapshot обеспечивает автоматическое обновление расписания при любых изменениях в БД
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (!snapshot.exists()) {
        setLessons([]); // Если расписания для группы еще нет в БД, обнуляем список
        return;
      }
      const data = snapshot.data() as ScheduleDoc;
      setLessons(data.lessons ?? []); // Сохраняем массив пар из документа
    });

    return () => unsubscribe(); // Отписка при закрытии страницы
  }, [user?.group]);

  // Функция добавления новой пары (только для админов/модераторов)
  const handleAdd = async () => {
    if (!isScheduleEditor) {
      setNotice(T.editorOnly);
      return;
    }
    if (!user?.group) {
      setNotice(T.fillGroup);
      return;
    }
    if (!title.trim() || !time.trim() || !place.trim()) {
      setNotice(T.fillFields);
      return;
    }

    // Создаем объект нового занятия
    const ref = doc(collection(db, 'schedules'), user.group);
    const nextLesson: Lesson = {
      id: String(Date.now()), // Используем текущее время в миллисекундах как уникальный ID пары
      time: time.trim(),
      title: title.trim(),
      place: place.trim(),
      day: selectedDay
    };

    // Сохраняем обновленный массив в Firestore.
    // merge: true позволяет сохранить документ, даже если какие-то другие поля обновляются параллельно.
    await setDoc(
      ref,
      {
        group: user.group,
        lessons: [...lessons, nextLesson], // Добавляем новую пару к уже существующим
        ownerId: user.uid
      },
      { merge: true }
    );

    // Сбрасываем поля формы
    setTitle('');
    setTime('');
    setPlace('');
    setNotice(T.added);
  };

  // Функция удаления пары из расписания
  const handleDeleteLesson = async (lessonId: string) => {
    if (!isScheduleEditor) {
      setNotice(T.editorOnly);
      return;
    }
    if (!user?.group) {
      setNotice(T.fillGroup);
      return;
    }
    const confirmed = window.confirm(T.confirmDeleteLesson);
    if (!confirmed) {
      return; // Отмена удаления пользователем
    }

    // Фильтруем массив пар, исключая удаляемую по её ID
    const nextLessons = lessons.filter((lesson) => lesson.id !== lessonId);
    try {
      const ref = doc(collection(db, 'schedules'), user.group);
      // Записываем отфильтрованный массив обратно в документ группы
      await setDoc(ref, { lessons: nextLessons }, { merge: true });
      setNotice(T.lessonDeleted);
    } catch (error) {
      console.error('Delete lesson error:', error);
      setNotice(T.deleteFailed);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Шапка страницы */}
      <div className="flex flex-col gap-2 mb-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{T.schedule}</h2>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-0.5">{T.scheduleStudy}</p>
      </div>

      {/* Панель добавления пар: рендерится только для Админов и Модераторов */}
      {isScheduleEditor ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 dark:bg-[#1e293b]/60 dark:backdrop-blur-sm dark:border-slate-800/60 transition-all">
          <p className="text-[15px] font-semibold text-gray-800 dark:text-slate-200 mb-4">{T.addLesson}</p>
          <div className="grid gap-3.5 md:grid-cols-4">
            {/* Выбор дня недели */}
            <select
              value={selectedDay}
              onChange={(event) => setSelectedDay(Number(event.target.value) as WeekDay)}
              className="w-full rounded-xl border border-transparent bg-gray-50 dark:bg-slate-900/80 px-4 py-3 text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300/50 dark:focus:border-blue-500/30 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/10 transition-all cursor-pointer dark:text-slate-100"
            >
              {WEEK_DAYS.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.short} - {day.full}
                </option>
              ))}
            </select>
            {/* Поле ввода времени */}
            <input
              value={time}
              onChange={(event) => setTime(event.target.value)}
              placeholder={T.timePlaceholder}
              className="w-full rounded-xl border border-transparent bg-gray-50 dark:bg-slate-900/80 px-4 py-3 text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300/50 dark:focus:border-blue-500/30 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 dark:text-slate-100"
            />
            {/* Поле ввода названия */}
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={T.titlePlaceholder}
              className="w-full rounded-xl border border-transparent bg-gray-50 dark:bg-slate-900/80 px-4 py-3 text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300/50 dark:focus:border-blue-500/30 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 dark:text-slate-100"
            />
            {/* Поле ввода аудитории */}
            <input
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder={T.placePlaceholder}
              className="w-full rounded-xl border border-transparent bg-gray-50 dark:bg-slate-900/80 px-4 py-3 text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300/50 dark:focus:border-blue-500/30 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 dark:text-slate-100"
            />
          </div>
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{T.saveByGroup}</p>
            <button
              onClick={handleAdd}
              className="rounded-xl bg-gradient-to-r from-[#3390ec] to-[#2886c6] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#3390ec]/20 hover:shadow-lg hover:shadow-[#3390ec]/30 hover:-translate-y-0.5 transition-all dark:from-[#3a8be0] dark:to-[#2e78c6] dark:shadow-[#3a8be0]/20 active:scale-95"
            >
              {T.add}
            </button>
          </div>
          {/* Информационные плашки */}
          {notice && (
            <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
              {notice}
            </div>
          )}
        </div>
      ) : (
        // Блок информации о правах доступа (для обычных студентов)
        <div className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm border border-gray-100 dark:border-slate-800">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{T.readOnly}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{T.editorOnly}</p>
        </div>
      )}

      {/* Таблица/список расписания на выбранный день */}
      <div className="rounded-2xl bg-white dark:bg-[#1e293b]/60 dark:backdrop-blur-sm shadow-sm border border-gray-100 dark:border-slate-800/60 overflow-hidden">
        {/* Панель переключения дней (Пн - Сб) */}
        <div className="px-5 py-4 bg-gray-50/80 border-b border-gray-100 dark:bg-slate-900/60 dark:border-slate-800/50">
          <h3 className="text-[15px] font-semibold text-gray-800 dark:text-slate-200 mb-4">{T.schedulePrefix} {selectedDayLabel}</h3>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
            {WEEK_DAYS.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDay(day.id)}
                className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-all flex-shrink-0 ${selectedDay === day.id
                    ? 'bg-gradient-to-r from-[#3390ec] to-[#2886c6] text-white shadow-md shadow-[#3390ec]/20 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100/80 border border-gray-200/60 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50 dark:hover:bg-slate-800'
                  }`}
              >
                {day.short}
              </button>
            ))}
          </div>
        </div>

        {/* Список пар */}
        <div className="divide-y divide-gray-100 dark:divide-slate-800/60">
          {lessonsForSelectedDay.length === 0 ? (
            // Заглушка, если на выбранный день нет занятий
            <div className="p-10 text-center text-gray-400 dark:text-slate-500">
              <svg className="w-14 h-14 mx-auto mb-4 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[15px] font-medium">{T.noLessons}</p>
            </div>
          ) : (
            // Отрисовка пар
            lessonsForSelectedDay.map((item) => (
              <div key={item.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors">
                {/* Время */}
                <div className="w-16 text-[15px] font-bold text-[#3390ec] dark:text-[#60a5fa]">{item.time}</div>
                {/* Название предмета и аудитория */}
                <div className="flex-1 min-w-0 border-l-2 border-blue-100 dark:border-blue-500/20 pl-4 py-0.5">
                  <p className="font-semibold text-[15px] text-gray-900 dark:text-slate-100 leading-tight">{item.title}</p>
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-1">{item.place}</p>
                </div>
                {/* Кнопка удаления пары (видна только редакторам расписания при наведении) */}
                {isScheduleEditor && (
                  <button
                    type="button"
                    onClick={() => handleDeleteLesson(item.id)}
                    className="opacity-0 group-hover:opacity-100 rounded-lg px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
                  >
                    {T.delete}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
