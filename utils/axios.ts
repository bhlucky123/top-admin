import { queryClient } from "@/providers/react-query-provider";
import { useAuthStore } from "@/store/auth";
import axios from "axios";
import { router } from "expo-router";
import { config } from "./config";

const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  async (reqConfig) => {
    const token = useAuthStore.getState().token;
    (reqConfig as any).metadata = { startTime: Date.now() };

    if (token) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }

    const method = reqConfig.method?.toUpperCase();
    const url = `${reqConfig.url || ""}`;
    console.log(`[API] --> ${method} ${url}`);

    return reqConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    const metadata = (response.config as any).metadata;
    const duration = metadata?.startTime ? Date.now() - metadata.startTime : 0;
    const method = response.config.method?.toUpperCase();
    const url = `${response.config.url || ""}`;
    console.log(`[API] <-- ${method} ${url} | ${response.status} | ${duration}ms`);

    if (response.status === 204) {
      return { ...response, data: null };
    }
    return response;
  },
  (error) => {
    const cfg = error.config;
    const metadata = cfg && (cfg as any).metadata;
    const duration = metadata?.startTime ? Date.now() - metadata.startTime : 0;
    const method = cfg?.method?.toUpperCase() || "?";
    const url = cfg ? `${cfg.baseURL || ""}${cfg.url || ""}` : "unknown";
    const status = error.response?.status || "NETWORK";
    console.log(`[API] <-- ${method} ${url} | ${status} | ${duration}ms | FAILED`);

    if (error.response?.data) {
      console.log(`[API] Response body:`, JSON.stringify(error.response.data));
    }

    if (
      error.request &&
      typeof error.request._response === "string" &&
      error.request._response.includes("HTTP 204 had non-zero Content-Length")
    ) {
      return Promise.resolve({
        status: 204,
        statusText: "No Content",
        data: null,
        headers: {},
        config: error.config,
      });
    }

    if (error.response) {
      const { status, data } = error.response;

      if (status === 503) {
        router.push("..");
        return;
      }

      if (status === 401) {
        queryClient.clear();
        router.push("/");
        return;
      }

      if (status === 403 && data?.detail) {
        return Promise.reject({ status: 403, message: data.detail });
      }

      return Promise.reject({ status: status || 500, message: data || "something went wrong" });
    } else {
      return Promise.reject(error);
    }
  }
);

export default api;
