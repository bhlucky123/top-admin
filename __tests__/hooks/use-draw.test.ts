import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import useDraw from "@/hooks/use-draw";
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

const sampleDraw = {
  name: "Morning Draw",
  valid_from: "09:00:00",
  valid_till: "12:00:00",
  cut_off_time: "11:30:00",
  draw_time: "12:00:00",
  color_theme: "#6366f1",
  non_single_digit_price: 10,
  single_digit_number_price: 100,
};

describe("useDraw", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createDraw", () => {
    it("should call POST /draw/ with draw data", async () => {
      mockedApi.post = jest.fn().mockResolvedValue({ data: { id: 1, ...sampleDraw } });

      const { result } = renderHook(() => useDraw(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.createDraw(sampleDraw);
      });

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith("/draw/", sampleDraw);
      });
    });

    it("should track creating state", () => {
      const { result } = renderHook(() => useDraw(), {
        wrapper: createWrapper(),
      });
      expect(result.current.isCreating).toBe(false);
    });
  });

  describe("updateDraw", () => {
    it("should call PUT /draw/{id}/ with updated data", async () => {
      const drawWithId = { ...sampleDraw, id: 5 };
      mockedApi.put = jest.fn().mockResolvedValue({ data: drawWithId });

      const { result } = renderHook(() => useDraw(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.updateDraw(drawWithId);
      });

      await waitFor(() => {
        expect(mockedApi.put).toHaveBeenCalledWith("/draw/5/", sampleDraw);
      });
    });

    it("should track updating state", () => {
      const { result } = renderHook(() => useDraw(), {
        wrapper: createWrapper(),
      });
      expect(result.current.isUpdating).toBe(false);
    });
  });

  describe("deleteDraw", () => {
    it("should call DELETE /draw/{id}/", async () => {
      mockedApi.delete = jest.fn().mockResolvedValue({ data: null });

      const { result } = renderHook(() => useDraw(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.deleteDraw({ id: 3 });
      });

      await waitFor(() => {
        expect(mockedApi.delete).toHaveBeenCalledWith("/draw/3/");
      });
    });

    it("should track deleting state", () => {
      const { result } = renderHook(() => useDraw(), {
        wrapper: createWrapper(),
      });
      expect(result.current.isDeleting).toBe(false);
    });
  });
});
