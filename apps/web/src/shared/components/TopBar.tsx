import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
type TopBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  userName?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
};

export const TopBar = ({ searchQuery, onSearchChange, userName, theme, onToggleTheme }: TopBarProps) => {
  const location = useLocation();
  const isChatsPage = location.pathname.startsWith('/chats');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-100 dark:bg-[#111827] dark:border-slate-800 dark:shadow-none backdrop-blur transition-colors">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16 max-w-6xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#3390ec]">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="font-extrabold text-[22px] text-gray-900 tracking-tight leading-none dark:text-white pb-0.5">StudentHub</h1>
        </Link>

        {/* Actions (Right Side) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search Toggle */}
          {!isChatsPage && (
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2.5 rounded-full text-[#4a5568] hover:bg-gray-100 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-full text-[#4a5568] hover:bg-gray-100 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {theme === 'light' ? (
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          {/* Avatar Profile */}
          <Link to={userName ? '/profile' : '/login'} className="ml-1 flex-shrink-0">
            {userName ? (
              <div className="w-[42px] h-[42px] rounded-full bg-[#fce7f3] flex items-center justify-center border-[2.5px] border-[#3390ec] text-[#db2777] font-bold text-lg uppercase dark:bg-[#831843]/40 dark:border-[#3a8be0] dark:text-pink-400 shadow-sm overflow-hidden transition hover:scale-105">
                {userName.charAt(0)}
              </div>
            ) : (
              <div className="w-[42px] h-[42px] rounded-full bg-gray-100 flex items-center justify-center border-[2.5px] border-gray-300 text-gray-400 hover:bg-gray-200 transition-all hover:scale-105 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400">
                <svg className="w-5.5 h-5.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Expandable Search Input */}
      {isSearchOpen && !isChatsPage && (
        <div className="px-4 pb-4 sm:px-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              autoFocus
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Поиск по приложению..."
              className="w-full pl-10 pr-4 py-3 bg-[#f0f2f5] rounded-xl text-[15px] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#3390ec]/40 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800 dark:focus:ring-[#3a8be0]/40 shadow-sm"
            />
          </div>
        </div>
      )}
    </header>
  );
};
