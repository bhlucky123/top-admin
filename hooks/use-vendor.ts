import api from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";

export type Vendor = {
  id: number;
  name: string;
};

type CreateVendorParams = { name: string };
type EditVendorParams = { id: number; name: string };
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

    deleteVendor: deleteMutation.mutate,
    deleteVendorAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export default useVendor;
