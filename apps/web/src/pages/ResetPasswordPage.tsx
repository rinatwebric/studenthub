import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../shared/auth';

export const ResetPasswordPage = () => {
  // Извлекаем функцию отправки письма для сброса пароля из useAuth
  const { resetPassword } = useAuth();
  
  // Локальные состояния страницы
  const [email, setEmail] = useState(''); // Электронная почта
  const [message, setMessage] = useState(''); // Информационное сообщение (успех)
  const [error, setError] = useState(''); // Сообщение об ошибке
  const [loading, setLoading] = useState(false); // Статус отправки формы

  // Обработчик отправки формы восстановления пароля
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Предотвращаем стандартное поведение браузера
    
    // Простая валидация на заполненность поля email
    if (!email.trim()) {
      setError('Введите почту.');
      return;
    }
    
    setError('');
    setMessage('');
    setLoading(true);
    try {
      // Отправляем запрос в Firebase Auth для генерации письма со ссылкой на сброс пароля.
      // Firebase отправит стандартное письмо на указанный email.
      await resetPassword(email.trim());
      setMessage('Инструкции отправлены на почту.');
    } catch (err) {
      setError('Не удалось отправить письмо.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-mesh-bg flex min-h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="auth-card rounded-2xl p-8 md:p-10">
          {/* Заголовок страницы */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="font-display text-3xl font-bold text-white mb-2">Восстановление</h2>
            <p className="text-sm text-slate-400">
              Мы отправим инструкции на вашу почту
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

            {/* Ошибка */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-medium">
                {error}
              </div>
            )}

            {/* Уведомление об успешной отправке письма */}
            {message && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs text-center font-medium">
                {message}
              </div>
            )}

            {/* Кнопка отправки формы */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Отправляем...' : 'Сбросить пароль'}
            </button>
          </form>

          {/* Возврат к логину */}
          <div className="mt-8 text-center text-xs font-semibold text-gray-500 dark:text-slate-500">
            Вспомнили пароль?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              Вернуться ко входу
            </Link>
          </div>
        </div>

        {/* Подвал */}
        <div className="mt-8 text-center animate-fade-up opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
            &copy; 2026 StudentHub Academic Portal • Campus Network
          </p>
        </div>
      </div>
    </section>
  );
};
