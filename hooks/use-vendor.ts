import api from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";

export type Vendor = {
  id: number;
  name: string;
  is_active: boolean;
  feature_codenames?: string[];
  monitoring_enabled?: boolean;
  monitoring_single_digit_a_count?: number;
  monitoring_single_digit_b_count?: number;
  monitoring_single_digit_c_count?: number;
  monitoring_double_digit_ab_count?: number;
  monitoring_double_digit_bc_count?: number;
  monitoring_double_digit_ac_count?: number;
  monitoring_triple_digit_super_count?: number;
  monitoring_triple_digit_box_count?: number;
};

type VendorMonitoringFields = {
  monitoring_enabled?: boolean;
  monitoring_single_digit_a_count?: number;
  monitoring_single_digit_b_count?: number;
  monitoring_single_digit_c_count?: number;
  monitoring_double_digit_ab_count?: number;
  monitoring_double_digit_bc_count?: number;
  monitoring_double_digit_ac_count?: number;
  monitoring_triple_digit_super_count?: number;
  monitoring_triple_digit_box_count?: number;
};

type CreateVendorParams = VendorMonitoringFields & {
  name: string;
  is_active?: boolean;
};
type EditVendorParams = VendorMonitoringFields & {
  id: number;
  name?: string;
  is_active?: boolean;
};
type ToggleActiveParams = { id: number; is_active: boolean };
type DeleteVendorParams = { id: number };

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

  const deleteMutation = useMutation<void, any, DeleteVendorParams>({
    mutationFn: ({ id }) =>
      api.delete(`/administrator/vendors/${id}/`).then((res) => res.data),
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

    deleteVendor: deleteMutation.mutate,
    deleteVendorAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export default useVendor;
