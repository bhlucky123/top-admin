import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import useVendor from "@/hooks/use-vendor";
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

describe("useVendor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createVendor", () => {
    it("should call POST /administrator/vendors/ with name", async () => {
      const newVendor = { id: 1, name: "Test Vendor" };
      mockedApi.post = jest.fn().mockResolvedValue({ data: newVendor });

      const { result } = renderHook(() => useVendor(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.createVendor({ name: "Test Vendor" });
      });

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          "/administrator/vendors/",
          { name: "Test Vendor" }
        );
      });
    });

    it("should report creating state", async () => {
      mockedApi.post = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 100))
      );

      const { result } = renderHook(() => useVendor(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isCreating).toBe(false);
    });
  });

  describe("editVendor", () => {
    it("should call PATCH /administrator/vendors/{id}/ with updated data", async () => {
      const updated = { id: 1, name: "Updated Vendor" };
      mockedApi.patch = jest.fn().mockResolvedValue({ data: updated });

      const { result } = renderHook(() => useVendor(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.editVendor({ id: 1, name: "Updated Vendor" });
      });

      await waitFor(() => {
        expect(mockedApi.patch).toHaveBeenCalledWith(
          "/administrator/vendors/1/",
          { name: "Updated Vendor" }
        );
      });
    });
  });

  describe("deleteVendor", () => {
    it("should call DELETE /administrator/vendors/{id}/", async () => {
      mockedApi.delete = jest.fn().mockResolvedValue({ data: null });

      const { result } = renderHook(() => useVendor(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.deleteVendor({ id: 5 });
      });

      await waitFor(() => {
        expect(mockedApi.delete).toHaveBeenCalledWith(
          "/administrator/vendors/5/"
        );
      });
    });
  });
});
