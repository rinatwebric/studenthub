# Архитектура StudentHub

## Слои
- UI (React, Tailwind)
- Domain (use-cases, валидация)
- Data (Firebase SDK)
- Backend (Auth, Firestore, Storage, Functions)

## Потоки
- UI → Domain → Data → Firebase
- Firebase → listeners → Data → Domain → UI
