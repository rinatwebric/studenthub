import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    // Страница 404 (ошибка: ресурс не найден)
    <section className="flex flex-col items-center gap-4 rounded-3xl border border-sand-200/80 bg-white/90 p-6 text-center shadow-soft">
      <h2 className="font-display text-2xl font-semibold text-ink-600">Страница не найдена</h2>
      <p className="text-sm text-slate-500">Проверьте ссылку или вернитесь на главную.</p>
      {/* Кнопка возврата на главную страницу приложения */}
      <Link
        to="/"
        className="rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-xs font-semibold text-ink-600"
      >
        На главную
      </Link>
    </section>
  );
};
