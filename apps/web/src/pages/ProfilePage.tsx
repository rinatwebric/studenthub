import { useState } from 'react';
import { useAuth } from '../shared/auth';

// Словарь локализации интерфейса страницы профиля
const T = {
  profile: 'Профиль',
  profileSubtitle: 'Ваши настройки и данные',
  profileUpdated: 'Профиль обновлён.',
  userFallback: 'Пользователь',
  groupMissing: 'Группа не указана',
  emailMissing: 'Email не указан',
  mainInfo: 'Основная информация',
  name: 'Имя',
  namePlaceholder: 'Ваше имя',
  emailLogin: 'Email (логин)',
  group: 'Группа',
  groupPlaceholder: 'Например: ИВТ-21',
  faculty: 'Факультет',
  facultyPlaceholder: 'Ваш факультет',
  about: 'О себе',
  aboutPlaceholder: 'Расскажите о себе...',
  save: 'Сохранить',
  logout: 'Выйти'
} as const;

export const ProfilePage = () => {
  // Извлекаем методы и данные пользователя из контекста аутентификации (useAuth)
  const { user, updateProfile, logout } = useAuth();

  // Локальные состояния для полей редактирования профиля (инициализируем текущими данными пользователя)
  const [name, setName] = useState(user?.name ?? '');
  const [group, setGroup] = useState(user?.group ?? '');
  const [faculty, setFaculty] = useState(user?.faculty ?? '');
  const [about, setAbout] = useState(user?.about ?? '');
  const [message, setMessage] = useState(''); // Для вывода уведомлений об обновлении
  // Если пользователь не авторизован, ничего не рендерим
  if (!user) {
    return null;
  }

  // Функция сохранения текстовых полей профиля
  const handleSave = async () => {
    // Вызывает updateProfile из shared/auth, который отправляет запрос на обновление документа users/{uid} в Firestore
    await updateProfile({ name, group, faculty, about });
    setMessage(T.profileUpdated);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Заголовок страницы */}
      <div className="flex flex-col gap-2 mb-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{T.profile}</h2>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-0.5">{T.profileSubtitle}</p>
      </div>

      {/* Верхний блок: Аватарка, Имя, Группа и Email */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-[#1e293b]/60 dark:backdrop-blur-sm dark:border-slate-800/60 flex flex-col md:flex-row items-center gap-6">
        <div className="relative group">
          {/* Декоративное свечение позади аватара */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#3390ec] to-purple-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#7c9ecf] to-[#5a84c2] text-3xl font-bold text-white shadow-sm dark:border-slate-800">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
        {/* Краткая информация */}
        <div className="text-center md:text-left flex-1">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{name || T.userFallback}</h3>
          <p className="text-[15px] font-medium text-[#3390ec] dark:text-[#60a5fa] mt-1">{group || T.groupMissing}</p>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-1.5 flex items-center justify-center md:justify-start gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {user.email || T.emailMissing}
          </p>
        </div>
      </div>

      {/* Форма редактирования профиля */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-[#1e293b]/60 dark:backdrop-blur-sm dark:border-slate-800/60">
        <h3 className="text-[17px] font-bold text-gray-900 dark:text-white mb-5">{T.mainInfo}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Редактирование имени */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-500 dark:text-slate-400 mb-1.5 ml-1">{T.name}</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={T.namePlaceholder}
              className="w-full rounded-xl border border-transparent bg-gray-50 dark:bg-slate-900/80 px-4 py-3 text-[15px] outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300/50 dark:focus:border-blue-500/30 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 dark:text-slate-100"
            />
          </div>
          {/* Email (только для чтения, изменить нельзя, так как это логин Firebase Auth) */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-500 dark:text-slate-400 mb-1.5 ml-1">{T.emailLogin}</label>
            <input
              value={user.email || ''}
              readOnly
              className="w-full rounded-xl border border-transparent bg-gray-100/70 dark:bg-slate-900/40 px-4 py-3 text-[15px] text-gray-500 dark:text-slate-400 cursor-not-allowed"
            />
          </div>
          {/* Редактирование группы */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-500 dark:text-slate-400 mb-1.5 ml-1">{T.group}</label>
            <input
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              placeholder={T.groupPlaceholder}
              className="w-full rounded-xl border border-transparent bg-gray-50 dark:bg-slate-900/80 px-4 py-3 text-[15px] outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300/50 dark:focus:border-blue-500/30 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 dark:text-slate-100"
            />
          </div>
          {/* Редактирование факультета */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-500 dark:text-slate-400 mb-1.5 ml-1">{T.faculty}</label>
            <input
              value={faculty}
              onChange={(event) => setFaculty(event.target.value)}
              placeholder={T.facultyPlaceholder}
              className="w-full rounded-xl border border-transparent bg-gray-50 dark:bg-slate-900/80 px-4 py-3 text-[15px] outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300/50 dark:focus:border-blue-500/30 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 dark:text-slate-100"
            />
          </div>
          {/* Редактирование текстового поля "О себе" */}
          <div className="md:col-span-2">
            <label className="block text-[13px] font-semibold text-gray-500 dark:text-slate-400 mb-1.5 ml-1">{T.about}</label>
            <textarea
              value={about}
              onChange={(event) => setAbout(event.target.value)}
              placeholder={T.aboutPlaceholder}
              rows={3}
              className="w-full rounded-xl border border-transparent bg-gray-50 dark:bg-slate-900/80 px-4 py-3 text-[15px] outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300/50 dark:focus:border-blue-500/30 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 dark:text-slate-100 resize-none"
            />
          </div>
        </div>

        {/* Сообщение об успешном сохранении */}
        {message && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
            {message}
          </div>
        )}

        {/* Кнопки Сохранить и Выйти */}
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800/60 flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            className="rounded-xl bg-gradient-to-r from-[#3390ec] to-[#2886c6] px-8 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#3390ec]/20 hover:shadow-lg hover:shadow-[#3390ec]/30 hover:-translate-y-0.5 transition-all dark:from-[#3a8be0] dark:to-[#2e78c6] dark:shadow-[#3a8be0]/20 active:scale-95"
          >
            {T.save}
          </button>
          <button
            onClick={logout}
            className="rounded-xl border border-gray-200 dark:border-slate-700/50 px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-500 hover:border-red-100 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/20 transition-all"
          >
            {T.logout}
          </button>
        </div>
      </div>
    </div>
  );
};
