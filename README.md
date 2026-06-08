# StudentHub — MVP

Мини‑соцсеть для студентов (гибрид Telegram + кампус‑портал). Стек: React + Vite + TypeScript + Tailwind + Firebase.

## Быстрый старт

1. Установи Node.js LTS и открой проект в VS Code.
2. В терминале:

```bash
cd apps/web
npm install
```

3. Создай файл `.env` по шаблону `apps/web/.env.example`.
4. Запусти проект:

```bash
npm run dev
```

Приложение откроется на `http://localhost:5173`.

## Firebase (обязательно)

В Firebase Console включи:

- **Authentication** — Email/Password и Google (опционально)
- **Firestore Database**

> **Storage не требуется.** Загрузка аватаров, фото и голосовых сообщений отключена (работает на бесплатном тарифе Spark).

Скопируй ключи из настроек веб‑приложения Firebase в `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Опционально: email, которому автоматически выдаётся роль Admin
VITE_ADMIN_EMAIL=you@example.com
```

Разверни правила и индексы (нужен [Firebase CLI](https://firebase.google.com/docs/cli)):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Что реализовано

- Авторизация через Firebase Auth (email + Google)
- Профиль пользователя (Firestore; аватар — буква имени)
- Лента постов: лайки, комментарии, закладки, пагинация
- Чаты в реальном времени (только текст)
- События (RSVP)
- Расписание по группе
- Админ‑панель (управление ролями)
- Заглушка звонков (лог в Firestore)

## Ограничения MVP

- **Медиа отключено** — фото, голосовые и загрузка аватаров недоступны без Firebase Storage (тариф Blaze).
- **Cloud Functions отключены** — папка `functions/` содержит заглушку; серверные уведомления не работают.
- **Квота Firestore** — в коде стоят лимиты на выборки (лента, чаты, события), чтобы не превышать бесплатный лимит.

## Безопасность

- Правила Firestore: `firestore.rules`
- Индексы: `firestore.indexes.json`
- Файл `.env` в `.gitignore` — не публикуй ключи Firebase

## Админ‑доступ

Два способа:

1. Укажи свой email в `VITE_ADMIN_EMAIL` в `.env` — при регистрации/входе роль Admin назначится автоматически.
2. Вручную в Firestore: `users/{uid}.role = "Admin"`.

После этого доступна страница `/admin`.

## Cloud Functions

Код: `functions/src/index.ts` — **заглушка**. Ранее планировались триггеры уведомлений и агрегация статистики; сейчас не развёрнуты.

## APK (Capacitor)

```bash
cd apps/web
npm install @capacitor/core @capacitor/cli
npx cap init studenthub com.studenthub.app
npm install @capacitor/android
npx cap add android
npx cap sync
```

## Структура проекта

```
apps/web/          — React-приложение (Vite)
functions/         — Cloud Functions (заглушка)
firestore.rules    — правила безопасности Firestore
firestore.indexes.json
docs/              — документация
```
