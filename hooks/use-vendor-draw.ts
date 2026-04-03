import api from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";

export type VendorDraw = {
  id: number;
  vendor: number;
  draw: number;
  vendor_name: string;
  draw_name: string;
};

type AssignDrawParams = { vendor: number; draw: number };
type UnassignDrawParams = { id: number };

const useVendorDraw = () => {
  const assignMutation = useMutation<VendorDraw, any, AssignDrawParams>({
    mutationFn: (payload) =>
      api.post("/administrator/vendor-draws/", payload).then((res) => res.data),
  });

  const unassignMutation = useMutation<void, any, UnassignDrawParams>({
    mutationFn: ({ id }) =>
      api.delete(`/administrator/vendor-draws/${id}/`).then((res) => res.data),
  });

  return {
    assignDraw: assignMutation.mutate,
    assignDrawAsync: assignMutation.mutateAsync,
    isAssigning: assignMutation.isPending,

    unassignDraw: unassignMutation.mutate,
    unassignDrawAsync: unassignMutation.mutateAsync,
    isUnassigning: unassignMutation.isPending,
  };
};

export default useVendorDraw;
