import api from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";

export type Vendor = {
  id: number;
  name: string;
  is_active: boolean;
  feature_codenames?: string[];
  monitoring_single_digit_count?: number;
  monitoring_double_digit_count?: number;
  monitoring_triple_digit_super_count?: number;
  monitoring_triple_digit_box_count?: number;
};

type CreateVendorParams = {
  name: string;
  is_active?: boolean;
  monitoring_single_digit_count?: number;
  monitoring_double_digit_count?: number;
  monitoring_triple_digit_super_count?: number;
  monitoring_triple_digit_box_count?: number;
};
type EditVendorParams = {
  id: number;
  name?: string;
  is_active?: boolean;
  monitoring_single_digit_count?: number;
  monitoring_double_digit_count?: number;
  monitoring_triple_digit_super_count?: number;
  monitoring_triple_digit_box_count?: number;
};
type ToggleActiveParams = { id: number; is_active: boolean };

const useVendor = () => {
  const createMutation = useMutation<Vendor, any, CreateVendorParams>({
    mutationFn: (payload) =>
      api.post("/administrator/vendors/", payload).then((res) => res.data),
  });

  const editMutation = useMutation<Vendor, any, EditVendorParams>({
    mutationFn: ({ id, ...payload }) =>
      api.patch(`/administrator/vendors/${id}/`, payload).then((res) => res.data),
  });

  const toggleActiveMutation = useMutation<Vendor, any, ToggleActiveParams>({
    mutationFn: ({ id, is_active }) =>
      api.patch(`/administrator/vendors/${id}/`, { is_active }).then((res) => res.data),
  });

  return {
    createVendor: createMutation.mutate,
    createVendorAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    editVendor: editMutation.mutate,
    editVendorAsync: editMutation.mutateAsync,
    isEditing: editMutation.isPending,

    toggleActive: toggleActiveMutation.mutate,
    toggleActiveAsync: toggleActiveMutation.mutateAsync,
    isToggling: toggleActiveMutation.isPending,
  };
};

export default useVendor;
