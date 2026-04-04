import { config } from "@/utils/config";
import { router } from "expo-router";
import { create } from "zustand";

interface User {
  id: number;
  username: string;
  user_type: "ADMINISTRATOR";
  superuser: boolean;
  is_main_vendor?: boolean;
  vendor_name?: string | null;
  application_status?: boolean;
  vendor_features: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasFeature: (codename: string) => boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(
        `${config.apiBaseUrl}/administrator/login/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      if (!response.ok) {
        let errorMsg = `Login failed (${response.status})`;
        try {
          const text = await response.text();
          const parsed = JSON.parse(text);
          if (parsed.non_field_errors?.[0]) {
            errorMsg = parsed.non_field_errors[0];
          } else if (parsed.error) {
            errorMsg = parsed.error;
          } else if (parsed.detail) {
            errorMsg = parsed.detail;
          }
        } catch {
          // fallback to default
        }
        set({ error: errorMsg, loading: false });
        setTimeout(() => set({ error: null }), 4000);
        return;
      }

      const data = await response.json();
      const details = data.user_details;

      if (!details?.superuser) {
        set({
          error: "Access denied. Only super admin accounts can log in.",
          loading: false,
        });
        setTimeout(() => set({ error: null }), 4000);
        return;
      }

      set({
        user: {
          id: details.user_id,
          username: details.username,
          user_type: "ADMINISTRATOR",
          superuser: details.superuser,
          is_main_vendor: details.is_main_vendor,
          vendor_name: details.vendor_name,
          application_status: details.application_status,
          vendor_features: details.vendor_features ?? [],
        },
        token: data.access,
        loading: false,
        error: null,
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      set({
        error: err.message || "Network error. Please try again.",
        loading: false,
      });
      setTimeout(() => set({ error: null }), 4000);
    }
  },

  logout: () => {
    set({ user: null, token: null, error: null });
    router.replace("/");
  },

  hasFeature: (codename: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;
    if (user.superuser) return true;
    return user.vendor_features.includes(codename);
  },
}));
