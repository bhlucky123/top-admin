import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import useVendorDraw from "@/hooks/use-vendor-draw";
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

describe("useVendorDraw", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("assignDraw", () => {
    it("should call POST /administrator/vendor-draws/ with vendor and draw", async () => {
      const assignment = {
        id: 1,
        vendor: 2,
        draw: 3,
        vendor_name: "ABC",
        draw_name: "Morning Draw",
      };
      mockedApi.post = jest.fn().mockResolvedValue({ data: assignment });

      const { result } = renderHook(() => useVendorDraw(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.assignDraw({ vendor: 2, draw: 3 });
      });

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          "/administrator/vendor-draws/",
          { vendor: 2, draw: 3 }
        );
      });
    });

    it("should report assigning state", () => {
      const { result } = renderHook(() => useVendorDraw(), {
        wrapper: createWrapper(),
      });
      expect(result.current.isAssigning).toBe(false);
    });
  });

  describe("unassignDraw", () => {
    it("should call DELETE /administrator/vendor-draws/{id}/", async () => {
      mockedApi.delete = jest.fn().mockResolvedValue({ data: null });

      const { result } = renderHook(() => useVendorDraw(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.unassignDraw({ id: 10 });
      });

      await waitFor(() => {
        expect(mockedApi.delete).toHaveBeenCalledWith(
          "/administrator/vendor-draws/10/"
        );
      });
    });

    it("should report unassigning state", () => {
      const { result } = renderHook(() => useVendorDraw(), {
        wrapper: createWrapper(),
      });
      expect(result.current.isUnassigning).toBe(false);
    });
  });
});
