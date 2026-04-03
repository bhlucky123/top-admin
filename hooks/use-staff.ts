import api from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";

export type Admin = {
  id: number;
  username: string;
  is_active: boolean;
  vendor?: number;
  is_main_vendor?: boolean;
  calculate_str?: string;
  secret_pin?: number;
};

type CreateAdminParams = {
  username: string;
  password: string;
  is_active: boolean;
  vendor: number;
  is_main_vendor: boolean;
  calculate_str: string;
  secret_pin: number;
};

type EditAdminParams = Partial<CreateAdminParams> & { id: number };
type DeleteAdminParams = { id: number };

const useStaff = () => {
  const createMutation = useMutation<Admin, any, CreateAdminParams>({
    mutationFn: (payload) =>
      api.post("/administrator/administrator/", payload).then((res) => res.data),
  });

  const editMutation = useMutation<Admin, any, EditAdminParams>({
    mutationFn: ({ id, ...payload }) =>
      api.patch(`/administrator/administrator/${id}/`, payload).then((res) => res.data),
  });

  const deleteMutation = useMutation<void, any, DeleteAdminParams>({
    mutationFn: ({ id }) =>
      api.delete(`/administrator/administrator/${id}/`).then((res) => res.data),
  });

  return {
    createAdmin: createMutation.mutate,
    isCreating: createMutation.isPending,

    editAdmin: editMutation.mutate,
    isEditing: editMutation.isPending,

    deleteAdmin: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
};

export default useStaff;
