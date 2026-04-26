import axios from "axios";
import { clearStoredAuth, getStoredTokens, setStoredTokens } from "./authStorage";

const API = import.meta.env.VITE_API_BASE_URL ?? "/api";

const refreshClient = axios.create({
  baseURL: API,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiClient = axios.create({
  baseURL: API,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const storedTokens = getStoredTokens();
  if (!storedTokens?.refresh) {
    clearStoredAuth();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<{ access: string }>("/auth/refresh/", {
        refresh: storedTokens.refresh,
      })
      .then((response) => {
        const nextTokens = {
          ...storedTokens,
          access: response.data.access,
        };
        setStoredTokens(nextTokens);
        return response.data.access;
      })
      .catch(() => {
        clearStoredAuth();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const tokens = getStoredTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    const status = error.response?.status;

    if (status !== 401 || originalRequest?._retry || !originalRequest?.url || originalRequest.url.includes("/auth/")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const nextAccessToken = await refreshAccessToken();

    if (!nextAccessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
    return apiClient(originalRequest);
  },
);
