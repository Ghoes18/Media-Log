import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "./auth";

type AppUser = {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  reviews?: number;
  followers?: number;
  following?: number;
};

type AuthContextValue = {
  currentUser: AppUser | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetchUser: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchAuthMe(): Promise<AppUser | null> {
  const headers: Record<string, string> = {};
  if (authClient?.auth) {
    try {
      const result = await authClient.auth.getSession();
      const token = result.data?.session?.token ?? (result.data?.session as { access_token?: string })?.access_token;
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } catch {
      // ignore
    }
  }
  const res = await fetch("/api/auth/me", { credentials: "include", headers });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sessionChecked, setSessionChecked] = useState(false);

  const {
    data: currentUser,
    isLoading: queryLoading,
    isFetching,
    refetch: refetchUser,
  } = useQuery<AppUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: fetchAuthMe,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!authClient?.auth) {
      setSessionChecked(true);
      return;
    }
    authClient.auth.getSession()
      .then(() => {
        setSessionChecked(true);
      })
      .catch(() => {
        setSessionChecked(true);
      });
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (authClient?.auth) await authClient.auth.signOut();
    } catch {
      // auth service may be unavailable
    }
    queryClient.setQueryData(["/api/auth/me"], null);
    refetchUser();
  }, [queryClient, refetchUser]);

  const isLoading = !sessionChecked || queryLoading || isFetching;
  const isAuthenticated = currentUser != null && currentUser !== undefined;

  return (
    <AuthContext.Provider
      value={{
        currentUser: currentUser ?? null,
        isLoading,
        isAuthenticated,
        refetchUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
