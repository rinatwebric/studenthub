import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, db, firebaseConfigured } from './firebase';

// Тип данных, описывающий профиль студента в системе
export type UserProfile = {
  uid: string;         // Уникальный ID пользователя из Firebase Auth
  name: string;        // Отображаемое имя
  email: string;       // Электронная почта
  role: 'Student' | 'Moderator' | 'Admin'; // Ролевая модель доступа
  group?: string;      // Учебная группа (например, ИВТ-21)
  faculty?: string;    // Факультет (например, ФИТ)
  about?: string;      // Информация "о себе"
  photoURL?: string;   // Ссылка на аватарку, загруженную в Storage
  hiddenChatIds?: string[]; // Массив ID скрытых/архивных чатов
};

// Тип контекста авторизации, предоставляющий методы управления сессией
type AuthContextValue = {
  user: UserProfile | null; // Текущий вошедший пользователь или null
  loading: boolean;        // Флаг загрузки (проверка авторизации при запуске)
  login: (email: string, password: string) => Promise<void>; // Вход по почте/паролю
  register: (email: string, password: string, name: string) => Promise<void>; // Регистрация
  loginWithGoogle: () => Promise<void>; // Кроссплатформенный вход через Google
  resetPassword: (email: string) => Promise<void>; // Сброс пароля на почту
  logout: () => Promise<void>; // Выход из аккаунта
  updateProfile: (payload: Partial<UserProfile>) => Promise<void>; // Обновление данных профиля
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Email администратора из .env — не хранить в репозитории
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '').toLowerCase();

// Приведение строковой роли к строгому типу UserProfile['role']
const normalizeRole = (role?: string): UserProfile['role'] => {
  if (role === 'Admin' || role === 'Moderator' || role === 'Student') {
    return role;
  }
  return 'Student';
};

// Генерация дефолтных значений профиля при первой регистрации
const profileDefaults = (payload: { uid: string; email: string; name?: string }): UserProfile => ({
  uid: payload.uid,
  email: payload.email,
  name: payload.name ?? payload.email.split('@')[0] ?? 'Пользователь',
  role: ADMIN_EMAIL && payload.email.toLowerCase() === ADMIN_EMAIL ? 'Admin' : 'Student',
  group: 'ИВТ-21',
  faculty: 'ФИТ',
  about: 'Студент StudentHub',
  hiddenChatIds: []
});

// ensureProfile гарантирует, что в Firestore в коллекции 'users' существует документ для данного пользователя
const ensureProfile = async (payload: { uid: string; email: string; name?: string }): Promise<UserProfile> => {
  const ref = doc(db, 'users', payload.uid);
  const snap = await getDoc(ref);
  
  // Если профиля в БД еще нет (первый вход) — создаем его
  if (!snap.exists()) {
    const profile = profileDefaults(payload);
    await setDoc(ref, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return profile;
  }
  
  // Если профиль уже есть — загружаем данные
  const data = snap.data() as UserProfile & { role?: string };
  const normalizedRole = normalizeRole(data.role);
  
  // Если email совпадает с ADMIN_EMAIL, принудительно даем роль Admin
  if (ADMIN_EMAIL && payload.email.toLowerCase() === ADMIN_EMAIL && normalizedRole !== 'Admin') {
    await updateDoc(ref, { role: 'Admin', updatedAt: serverTimestamp() });
    return { ...data, role: 'Admin' };
  }
  
  // Обновляем роль в БД, если произошли изменения во внешнем источнике
  if (data.role !== normalizedRole) {
    await updateDoc(ref, { role: normalizedRole, updatedAt: serverTimestamp() });
  }
  return { ...data, role: normalizedRole };
};

// Провайдер авторизации, оборачивающий React-компоненты
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Слушатель изменения состояния авторизации Firebase Auth
  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      // При наличии сессии подгружаем/создаем профиль в Firestore
      const profile = await ensureProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        name: firebaseUser.displayName ?? undefined
      });
      setUser(profile);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Вход по почте и паролю
  const login = async (email: string, password: string) => {
    if (!firebaseConfigured || !auth || !db) {
      throw new Error('Firebase is not configured. Provide .env values first.');
    }
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await ensureProfile({
      uid: cred.user.uid,
      email: cred.user.email ?? '',
      name: cred.user.displayName ?? undefined
    });
    setUser(profile);
  };

  // Регистрация нового пользователя
  const register = async (email: string, password: string, name: string) => {
    if (!firebaseConfigured || !auth || !db) {
      throw new Error('Firebase is not configured. Provide .env values first.');
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const profile = await ensureProfile({
      uid: cred.user.uid,
      email: cred.user.email ?? '',
      name
    });
    setUser(profile);
  };

  // Вход через аккаунт Google (поддерживает браузер и нативную авторизацию Android/iOS)
  const loginWithGoogle = async () => {
    if (!firebaseConfigured || !auth || !db) {
      throw new Error('Firebase is not configured. Provide .env values first.');
    }
    let cred;

    // Если приложение запущено на смартфоне (через Capacitor)
    if (Capacitor.isNativePlatform()) {
      // Вызываем нативное окно авторизации Google
      const result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
      const idToken = result.credential?.idToken ?? null;
      const accessToken = result.credential?.accessToken ?? null;

      if (!idToken && !accessToken) {
        throw new Error('Google sign-in did not return token.');
      }

      // Передаем полученные токены в Firebase Auth для авторизации
      const firebaseCredential = GoogleAuthProvider.credential(idToken, accessToken);
      cred = await signInWithCredential(auth, firebaseCredential);
    } else {
      // Если запущено в обычном браузере, используем всплывающее окно
      const provider = new GoogleAuthProvider();
      cred = await signInWithPopup(auth, provider);
    }

    const profile = await ensureProfile({
      uid: cred.user.uid,
      email: cred.user.email ?? '',
      name: cred.user.displayName ?? undefined
    });
    setUser(profile);
  };

  // Сброс пароля (отправка ссылки на email)
  const resetPassword = async (email: string) => {
    if (!firebaseConfigured || !auth) {
      throw new Error('Firebase is not configured. Provide .env values first.');
    }
    await sendPasswordResetEmail(auth, email);
  };

  // Выход из системы
  const logout = async () => {
    if (!firebaseConfigured || !auth) {
      throw new Error('Firebase is not configured. Provide .env values first.');
    }
    if (Capacitor.isNativePlatform()) {
      try {
        await FirebaseAuthentication.signOut();
      } catch {
        // Игнорируем ошибки нативного выхода и выходим из веб-версии
      }
    }
    await signOut(auth);
    setUser(null);
  };

  // Обновление полей профиля в Firestore
  const updateProfile = async (payload: Partial<UserProfile>) => {
    if (!user) {
      return;
    }
    if (!firebaseConfigured || !db) {
      throw new Error('Firebase is not configured. Provide .env values first.');
    }
    const ref = doc(db, 'users', user.uid);
    await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() });
    setUser((current) => (current ? { ...current, ...payload } : current));
  };

  const value = useMemo(
    () => ({ user, loading, login, register, loginWithGoogle, resetPassword, logout, updateProfile }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Хук для получения контекста авторизации в любом компоненте
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

// Компонент-предохранитель (Route Guard), требующий обязательной авторизации для доступа к странице
export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="rounded-3xl border border-sand-200/80 bg-white/90 p-6 text-sm text-slate-500 shadow-soft">
        Загрузка профиля...
      </div>
    );
  }

  // Если пользователь не вошел, перенаправляем его на страницу входа /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

// Компонент-предохранитель, проверяющий наличие необходимой роли (например, Admin для панели администрирования)
export const RequireRole = ({
  role,
  children
}: {
  role: UserProfile['role'];
  children: JSX.Element;
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="rounded-3xl border border-sand-200/80 bg-white/90 p-6 text-sm text-slate-500 shadow-soft">
        Проверяем права доступа...
      </div>
    );
  }

  // Если пользователь не вошел или его роль не соответствует требуемой, доступ блокируется
  if (!user || user.role !== role) {
    return (
      <div className="rounded-3xl border border-sand-200/80 bg-white/90 p-6 text-sm text-slate-500 shadow-soft">
        Нет доступа к этой странице.
      </div>
    );
  }

  return children;
};

