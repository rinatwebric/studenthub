import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth';

export const LoginPage = () => {
  // Извлекаем методы авторизации из общего контекста useAuth
  const { login, loginWithGoogle } = useAuth();
  
  // Состояния для полей формы ввода, обработки ошибок и статуса загрузки
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Вычисляем путь, на который нужно перенаправить пользователя после успешного входа.
  // Если пользователь пытался зайти на защищенную страницу напрямую (например, /admin),
  // роутер перенаправил его сюда и сохранил исходный путь в location.state.from.
  // Если такого пути нет, перенаправляем на главную страницу "/".
  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from ?? '/';
  }, [location.state]);

  // Обработчик отправки формы входа (Email / Пароль)
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Предотвращаем перезагрузку страницы браузером
    
    // Простейшая валидация на заполненность полей
    if (!email.trim() || !password.trim()) {
      setError('Введите почту и пароль.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Вызываем метод входа по почте из контекста
      await login(email.trim(), password.trim());
      // Перенаправляем пользователя на целевую страницу
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError('Не удалось войти. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик входа через Google
  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      // Вызываем метод авторизации через Google.
      // На мобильных устройствах это может использовать Capacitor-плагин, а на ПК - браузерный редирект/попап.
      await loginWithGoogle();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Google ошибка: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-mesh-bg flex min-h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="auth-card rounded-2xl p-8 md:p-10">
          {/* Заголовок и логотип */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3390ec] to-[#2886c6] text-white shadow-lg shadow-[#3390ec]/30 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="font-display text-3xl font-bold text-white mb-2">StudentHub</h2>
            <p className="text-sm text-slate-400">
              Войдите в свою учетную запись для доступа к кампусу
            </p>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-4">
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
            </div>

            {/* Вывод ошибки */}
            {error && (
              <div className="animate-shake p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-medium">
                {error}
              </div>
            )}

            {/* Кнопка отправки формы входа */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#3390ec] to-[#2886c6] hover:from-[#3a9af0] hover:to-[#3390ec] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#3390ec]/25 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Входим...
                </span>
              ) : 'Войти'}
            </button>

            {/* Разделитель "Или" */}
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <span className="relative px-3 bg-transparent text-xs text-gray-500 dark:text-slate-500 font-medium uppercase tracking-wider">Или</span>
            </div>

            {/* Кнопка входа с Google аккаунтом */}
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </form>

          {/* Ссылки на восстановление пароля и регистрацию */}
          <div className="mt-8 flex items-center justify-between text-xs font-semibold">
            <Link to="/reset" className="text-blue-600 dark:text-blue-400 hover:underline">
              Забыли пароль?
            </Link>
            <Link to="/register" className="px-4 py-2 bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400 rounded-full hover:bg-blue-600/20 transition-all">
              Создать аккаунт
            </Link>
          </div>
        </div>
        
        {/* Копирайт / Декоративный подвал */}
        <div className="mt-8 text-center animate-fade-up opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
            &copy; 2026 StudentHub Academic Portal • Campus Network
          </p>
        </div>
      </div>
    </section>
  );
};
