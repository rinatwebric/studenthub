import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { FeedPage } from './pages/FeedPage';
import { BottomNav } from './shared/components/BottomNav';
import { TopBar } from './shared/components/TopBar';
import { AuthProvider, RequireAuth, RequireRole, useAuth } from './shared/auth';
import { firebaseConfigured, firebaseMissingKeys } from './shared/firebase';
import { ChatsPage } from './pages/Chats';
import { EventsPage } from './pages/EventsPage';
import { SchedulePage } from './pages/SchedulePage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AdminPage } from './pages/AdminPage';

// AppLayout управляет основным визуальным макетом (Layout) приложения
const AppLayout = () => {
  // searchQuery хранит строку поиска из TopBar, которая затем передается в FeedPage для фильтрации постов
  const [searchQuery, setSearchQuery] = useState('');
  
  // Тема оформления (светлая/темная), считываемая из локального хранилища браузера (localStorage)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('studenthub-theme');
    return stored === 'dark' ? 'dark' : 'light';
  });
  
  // Получаем текущего авторизованного пользователя из контекста авторизации
  const { user } = useAuth();
  const location = useLocation();
  
  // Скрываем навигационные панели на страницах авторизации, регистрации и сброса пароля
  const hideNav = ['/login', '/register', '/reset'].includes(location.pathname);

  // Синхронизируем тему с HTML-тегом documentElement (добавляем/удаляем CSS-класс 'dark' для Tailwind)
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('studenthub-theme', theme);
  }, [theme]);

  // Панели TopBar и BottomNav показываем только вошедшим пользователям и только на контентных страницах
  const showBars = !!user && !hideNav;

  return (
    <div
      className={`min-h-screen font-sans text-gray-900 dark:text-slate-100 ${
        hideNav ? 'bg-[#0f172a]' : 'bg-[#eef2f5] dark:bg-slate-950'
      }`}
    >
      {/* Верхняя шапка приложения с поиском и переключением тем */}
      {showBars && (
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          userName={user?.name}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        />
      )}
      
      {/* Auth-страницы на всю ширину; остальное — в колонке max-w-5xl */}
      <main className={hideNav ? 'min-h-screen w-full' : 'mx-auto max-w-5xl px-4 pb-24 pt-4'}>
        {/* Если в файле .env не настроены ключи Firebase, показываем предупреждение об ошибке конфигурации */}
        {!firebaseConfigured ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Firebase не настроен</h2>
            <p className="mt-2 text-sm text-gray-500">
              Добавь значения из <code className="rounded bg-gray-100 px-2 py-1 text-xs">apps/web/.env.example</code> в
              <code className="rounded bg-gray-100 px-2 py-1 text-xs ml-1">apps/web/.env</code>.
            </p>
            <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-500">
              Отсутствуют: {firebaseMissingKeys.join(', ')}
            </div>
          </div>
        ) : (
          /* Описание маршрутов (роутов) SPA-приложения */
          <Routes>
            {/* Главная страница — Лента новостей. Передаем строку поиска */}
            <Route path="/" element={<FeedPage searchQuery={searchQuery} />} />
            
            {/* Чаты/мессенджер. Защищен от неавторизованных пользователей оберткой RequireAuth */}
            <Route
              path="/chats"
              element={
                <RequireAuth>
                  <ChatsPage />
                </RequireAuth>
              }
            />
            
            {/* События. Доступно только после авторизации */}
            <Route
              path="/events"
              element={
                <RequireAuth>
                  <EventsPage />
                </RequireAuth>
              }
            />
            
            {/* Расписание занятий. Доступно только после авторизации */}
            <Route
              path="/schedule"
              element={
                <RequireAuth>
                  <SchedulePage />
                </RequireAuth>
              }
            />
            
            {/* Профиль студента. Доступно только после авторизации */}
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            
            {/* Админ-панель. Доступ ограничен ролью "Admin" через RequireRole */}
            <Route
              path="/admin"
              element={
                <RequireRole role="Admin">
                  <AdminPage />
                </RequireRole>
              }
            />
            
            {/* Открытые страницы для авторизации, регистрации и сброса пароля */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset" element={<ResetPasswordPage />} />
            
            {/* Редирект с устаревшего роута /home на главную страницу */}
            <Route path="/home" element={<Navigate to="/" replace />} />
            
            {/* Обработка несуществующих страниц (ошибка 404) */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        )}
      </main>
      
      {/* Нижняя мобильная панель навигации */}
      {showBars && firebaseConfigured && <BottomNav />}
    </div>
  );
};

// Главная точка входа. Настраивает провайдер роутинга и провайдер авторизации
export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
};

