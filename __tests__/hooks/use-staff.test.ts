import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import useStaff from "@/hooks/use-staff";
import api from "@/utils/axios";

jest.mock("@/utils/axios");
const mockedApi = api as jest.Mocked<typeof api>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
}

const sampleAdmin = {
  username: "vendor_admin_1",
  password: "pass123",
  is_active: true,
  vendor: 2,
  is_main_vendor: true,
  calculate_str: "1+2",
  secret_pin: 1234,
};

describe("useStaff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAdmin", () => {
    it("should call POST /administrator/administrator/ with admin data", async () => {
      mockedApi.post = jest
        .fn()
        .mockResolvedValue({ data: { id: 10, ...sampleAdmin } });

      const { result } = renderHook(() => useStaff(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.createAdmin(sampleAdmin);
      });

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          "/administrator/administrator/",
          sampleAdmin
        );
      });
    });

    it("should include vendor and is_main_vendor fields", async () => {
      mockedApi.post = jest.fn().mockResolvedValue({ data: { id: 1 } });

      const { result } = renderHook(() => useStaff(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.createAdmin(sampleAdmin);
      });

      await waitFor(() => {
        const calledWith = mockedApi.post.mock.calls[0][1];
        expect(calledWith).toHaveProperty("vendor", 2);
        expect(calledWith).toHaveProperty("is_main_vendor", true);
      });
    });

    it("should track creating state", () => {
      const { result } = renderHook(() => useStaff(), {
        wrapper: createWrapper(),
      });
      expect(result.current.isCreating).toBe(false);
    });
  });

  describe("editAdmin", () => {
    it("should call PATCH /administrator/administrator/{id}/ with updated fields", async () => {
      mockedApi.patch = jest.fn().mockResolvedValue({
        data: { id: 10, username: "updated_admin" },
      });

      const { result } = renderHook(() => useStaff(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.editAdmin({ id: 10, username: "updated_admin" });
      });

      await waitFor(() => {
        expect(mockedApi.patch).toHaveBeenCalledWith(
          "/administrator/administrator/10/",
          { username: "updated_admin" }
        );
      });
    });

    it("should not include id in the PATCH body", async () => {
      mockedApi.patch = jest.fn().mockResolvedValue({ data: { id: 10 } });

      const { result } = renderHook(() => useStaff(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.editAdmin({
          id: 10,
          is_active: false,
        });
      });

      await waitFor(() => {
        const body = mockedApi.patch.mock.calls[0][1];
        expect(body).not.toHaveProperty("id");
        expect(body).toHaveProperty("is_active", false);
      });
    });
  });

  describe("deleteAdmin", () => {
    it("should call DELETE /administrator/administrator/{id}/", async () => {
      mockedApi.delete = jest.fn().mockResolvedValue({ data: null });

      const { result } = renderHook(() => useStaff(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.deleteAdmin({ id: 7 });
      });

      await waitFor(() => {
        expect(mockedApi.delete).toHaveBeenCalledWith(
          "/administrator/administrator/7/"
        );
      });
    });
  });
});
