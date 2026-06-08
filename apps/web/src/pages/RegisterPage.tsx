import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth';

export const RegisterPage = () => {
  // Получаем функцию регистрации из контекста useAuth
  const { register } = useAuth();
  
  // Локальные состояния формы регистрации
  const [name, setName] = useState(''); // Имя и Фамилия
  const [email, setEmail] = useState(''); // Электронная почта
  const [password, setPassword] = useState(''); // Пароль
  const [confirmPassword, setConfirmPassword] = useState(''); // Подтверждение пароля
  const [error, setError] = useState(''); // Ошибка
  const [loading, setLoading] = useState(false); // Статус отправки формы
  
  const navigate = useNavigate();

  // Обработчик отправки формы регистрации
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Предотвращаем стандартную отправку HTML-формы

    // Валидация: проверяем, что все поля заполнены
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Заполните все поля.');
      return;
    }
    
    // Валидация: сверяем пароль и подтверждение пароля
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      // Вызываем метод регистрации из auth-контекста.
      // Он создает аккаунт в Firebase Auth и автоматически создает карточку пользователя в Firestore (users/{uid})
      await register(email.trim(), password.trim(), name.trim());
      // Переходим на главную страницу после успешного создания профиля
      navigate('/');
    } catch (err) {
      setError('Не удалось создать аккаунт.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-mesh-bg flex min-h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="auth-card rounded-2xl p-8 md:p-10">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="font-display text-3xl font-bold text-white mb-2">Регистрация</h2>
            <p className="text-sm text-slate-400">
              Создайте аккаунт, чтобы стать частью сообщества
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-4">
              {/* Поле ввода имени */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-blue-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Имя и фамилия"
                  className="w-full pl-12 pr-4 py-4 bg-[#0b0e14] border border-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Поле ввода Email */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-blue-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@university.ru"
                  className="w-full pl-12 pr-4 py-4 bg-[#0b0e14] border border-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Поле ввода пароля */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-blue-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Пароль"
                  className="w-full pl-12 pr-4 py-4 bg-[#0b0e14] border border-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Поле повтора пароля */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-blue-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Подтвердите пароль"
                  className="w-full pl-12 pr-4 py-4 bg-[#0b0e14] border border-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Вывод сообщения об ошибке */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-medium">
                {error}
              </div>
            )}

            {/* Кнопка отправки формы */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Создаём...
                </span>
              ) : 'Создать аккаунт'}
            </button>
          </form>

          {/* Ссылка на переход к форме логина */}
          <div className="mt-8 text-center text-xs font-semibold text-gray-500 dark:text-slate-500">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              Войти
            </Link>
          </div>
        </div>

        {/* Копирайт подвал */}
        <div className="mt-8 text-center animate-fade-up opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
            &copy; 2026 StudentHub Academic Portal • Campus Network
          </p>
        </div>
      </div>
    </section>
  );
};
