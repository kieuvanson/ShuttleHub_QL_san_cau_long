import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, type LoginPayload, type RegisterPayload } from '../api/auth';
import { clearTokens, getAccessToken } from '../api/client';
import { STORAGE_KEYS } from '../api/config';
import type { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [isLoading, setIsLoading] = useState(true);

  /** Lưu token + user vào localStorage */
  const persist = useCallback((accessToken: string, refreshToken: string, u: User) => {
    localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u));
    setUser(u);
  }, []);

  /**
   * Khi app vừa load: nếu có access token → gọi /me để xác nhận
   * token còn hiệu lực và lấy thông tin user mới nhất.
   */
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        if (!cancelled) {
          localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(me));
          setUser(me);
        }
      } catch {
        // Token hỏng/hết hạn → dọn dẹp
        if (!cancelled) {
          clearTokens();
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // Backend báo phiên hết hạn (refresh token cũng hỏng) → đăng xuất
  useEffect(() => {
    const onExpired = () => {
      clearTokens();
      setUser(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await authApi.login(payload);
      persist(res.accessToken, res.refreshToken, res.user);
      return res.user;
    },
    [persist],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await authApi.register(payload);
      persist(res.accessToken, res.refreshToken, res.user);
      return res.user;
    },
    [persist],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Backend lỗi cũng không sao — vẫn dọn token ở client
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me();
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(me));
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth phải nằm trong <AuthProvider>');
  }
  return ctx;
}
