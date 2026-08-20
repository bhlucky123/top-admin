import api from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";

export type DrawType = "default" | "kerala" | "tamil_nadu";

export type Draw = {
  id?: number;
  name: string;
  valid_from: string;
  valid_till: string;
  cut_off_time: string;
  draw_time: string;
  color_theme: string;
  non_single_digit_price: number;
  single_digit_number_price: number;
  type?: DrawType;
  /** Minutes a booking stays deletable after creation. null/0 = no limit. */
  delete_time_limit?: number | null;
};

const useDraw = () => {
  const createMutation = useMutation<Draw, any, Draw>({
    mutationFn: (data) =>
      api.post("/draw/", data).then((res) => res.data),
  });

  const updateMutation = useMutation<Draw, any, Draw>({
    mutationFn: ({ id, ...data }) =>
      api.put(`/draw/${id}/`, data).then((res) => res.data),
  });

  const deleteMutation = useMutation<void, any, { id: number }>({
    mutationFn: ({ id }) =>
      api.delete(`/draw/${id}/`).then((res) => res.data),
  });

  const createDrawResult = useMutation({
    mutationFn: async ({
      draw_session,
      ...rest
    }: {
      draw_session: number;
      [key: string]: any;
    }) => {
      const res = await api.post(`/draw-result/result/${draw_session}/`, rest);
      return res.data;
    },
  });

  const updateDrawResult = useMutation({
    mutationFn: async ({
      id,
      ...rest
    }: {
      id: number;
      [key: string]: any;
    }) => {
      const res = await api.patch(`/draw-result/result/${id}/`, rest);
      return res.data;
    },
  });

  return {
    createDraw: createMutation,
    isCreating: createMutation.isPending,

    updateDraw: updateMutation,
    isUpdating: updateMutation.isPending,

    deleteDraw: deleteMutation,
    isDeleting: deleteMutation.isPending,

    createDrawResult,
    updateDrawResult,
    createDrawResultIsPending: createDrawResult.isPending,
    updateDrawResultIsPending: updateDrawResult.isPending,
  };
};

export default useDraw;
