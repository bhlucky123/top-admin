import { config } from "@/utils/config";

// Need to get the mocked router from the jest.setup.js mock
const { router } = require("expo-router");

// Save original fetch
const originalFetch = global.fetch;

// Import after mocks
import { useAuthStore } from "@/store/auth";

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    loading: false,
    error: null,
  });
  router.replace.mockClear();
  router.push.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

describe("Auth Store", () => {
  describe("initial state", () => {
    it("should have null user and token", () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("login", () => {
    it("should set loading true during login", async () => {
      global.fetch = jest.fn(
        () => new Promise(() => {})
      ) as any;

      useAuthStore.getState().login("admin", "pass");

      await Promise.resolve();
      expect(useAuthStore.getState().loading).toBe(true);
    });

    it("should login successfully with superuser account", async () => {
      const mockResponse = {
        access: "jwt-token-123",
        user_details: {
          user_id: 1,
          username: "superadmin",
          superuser: true,
          is_main_vendor: false,
          vendor_name: null,
          application_status: true,
        },
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      await useAuthStore.getState().login("superadmin", "password123");

      const state = useAuthStore.getState();
      expect(state.token).toBe("jwt-token-123");
      expect(state.user).toEqual({
        id: 1,
        username: "superadmin",
        user_type: "ADMINISTRATOR",
        superuser: true,
        is_main_vendor: false,
        vendor_name: null,
        application_status: true,
      });
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(router.replace).toHaveBeenCalledWith("/(tabs)");
    });

    it("should reject non-superuser accounts", async () => {
      const mockResponse = {
        access: "jwt-token-456",
        user_details: {
          user_id: 2,
          username: "vendoradmin",
          superuser: false,
          is_main_vendor: true,
          vendor_name: "ABC",
        },
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      await useAuthStore.getState().login("vendoradmin", "password");

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.error).toBe(
        "Access denied. Only super admin accounts can log in."
      );
    });

    it("should handle HTTP error responses", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                non_field_errors: ["Invalid credentials."],
              })
            ),
        })
      ) as any;

      await useAuthStore.getState().login("wrong", "creds");

      const state = useAuthStore.getState();
      expect(state.error).toBe("Invalid credentials.");
      expect(state.loading).toBe(false);
      expect(state.token).toBeNull();
    });

    it("should handle error.detail field in response", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          text: () =>
            Promise.resolve(JSON.stringify({ detail: "Account disabled." })),
        })
      ) as any;

      await useAuthStore.getState().login("disabled", "pass");
      expect(useAuthStore.getState().error).toBe("Account disabled.");
    });

    it("should handle error.error field in response", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () =>
            Promise.resolve(JSON.stringify({ error: "Bad request." })),
        })
      ) as any;

      await useAuthStore.getState().login("bad", "pass");
      expect(useAuthStore.getState().error).toBe("Bad request.");
    });

    it("should handle network errors", async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error("Network request failed"))
      ) as any;

      await useAuthStore.getState().login("admin", "pass");

      const state = useAuthStore.getState();
      expect(state.error).toBe("Network request failed");
      expect(state.loading).toBe(false);
    });

    it("should auto-clear errors after timeout", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () =>
            Promise.resolve(JSON.stringify({ error: "Bad creds" })),
        })
      ) as any;

      await useAuthStore.getState().login("x", "y");
      expect(useAuthStore.getState().error).toBe("Bad creds");

      jest.advanceTimersByTime(4000);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it("should call correct API endpoint", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve("{}"),
        })
      ) as any;

      await useAuthStore.getState().login("admin", "pass");

      expect(global.fetch).toHaveBeenCalledWith(
        `${config.apiBaseUrl}/administrator/login/`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "pass" }),
        })
      );
    });

    it("should NOT send pre_login_token", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve("{}"),
        })
      ) as any;

      await useAuthStore.getState().login("admin", "pass");

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body
      );
      expect(body).not.toHaveProperty("pre_login_token");
    });

    it("should handle non-JSON error response gracefully", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal Server Error"),
        })
      ) as any;

      await useAuthStore.getState().login("admin", "pass");
      expect(useAuthStore.getState().error).toBe("Login failed (500)");
    });
  });

  describe("logout", () => {
    it("should clear user, token, and navigate to login", () => {
      useAuthStore.setState({
        user: {
          id: 1,
          username: "admin",
          user_type: "ADMINISTRATOR",
          superuser: true,
        },
        token: "token-123",
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.error).toBeNull();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });
});
