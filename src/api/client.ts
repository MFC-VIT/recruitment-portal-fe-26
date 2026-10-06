import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import secureLocalStorage from "react-secure-storage";

// One axios instance for every backend call: attaches the access token and,
// when it has expired, swaps the refresh token for a new one and retries once.
const api = axios.create({ baseURL: import.meta.env.VITE_BASE_URL });

api.interceptors.request.use((config) => {
  const token = Cookies.get("jwtToken");
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

let refreshing: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = Cookies.get("refreshToken");
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/auth/refresh`, {
      refreshToken,
    });
    const token: string | undefined = res.data?.accessToken;
    if (!token) return null;
    Cookies.set("jwtToken", token, { secure: true });
    return token;
  } catch {
    return null;
  }
};

export const logout = () => {
  Cookies.remove("jwtToken");
  Cookies.remove("refreshToken");
  secureLocalStorage.clear();
};

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    if (error.response?.status !== 401 || !config || config._retried) {
      return Promise.reject(error);
    }
    config._retried = true;

    // Concurrent 401s share a single refresh request.
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null;
    });
    const token = await refreshing;

    if (!token) {
      logout();
      if (window.location.pathname !== "/") window.location.assign("/");
      return Promise.reject(error);
    }
    config.headers.set("Authorization", `Bearer ${token}`);
    return api(config);
  }
);

export default api;
