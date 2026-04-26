import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, login, register } from "../api/authApi";
import {
  clearStoredAuth,
  getStoredTokens,
  getStoredUser,
  setStoredTokens,
  setStoredUser,
} from "../api/authStorage";
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from "../types/auth";
import { clearPersistedSessionFlow } from "./useSessionFlow";
import { clearAllFinalFeedbackState } from "../utils/finalFeedbackTask";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  loginWithEmail: (payload: LoginPayload) => Promise<AuthResponse>;
  registerWithEmail: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persistAuth(response: AuthResponse) {
  setStoredTokens({
    access: response.access,
    refresh: response.refresh,
  });
  setStoredUser(response.user);
}

function clearLocalUserState() {
  clearStoredAuth();
  clearPersistedSessionFlow();
  clearAllFinalFeedbackState();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() => !!getStoredTokens());

  useEffect(() => {
    const storedTokens = getStoredTokens();

    if (!storedTokens) {
      setIsBootstrapping(false);
      return;
    }

    getCurrentUser()
      .then((nextUser) => {
        setUser(nextUser);
        setStoredUser(nextUser);
      })
      .catch(() => {
        clearLocalUserState();
        setUser(null);
      })
      .finally(() => {
        setIsBootstrapping(false);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isBootstrapping,
      loginWithEmail: async (payload) => {
        const response = await login(payload);
        persistAuth(response);
        setUser(response.user);
        return response;
      },
      registerWithEmail: async (payload) => {
        const response = await register(payload);
        persistAuth(response);
        setUser(response.user);
        return response;
      },
      logout: () => {
        clearLocalUserState();
        setUser(null);
      },
    }),
    [isBootstrapping, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
