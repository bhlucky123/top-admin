import api from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";

export type VendorFeature = {
  id: number;
  codename: string;
  name: string;
  description: string;
};

type CreateFeatureParams = {
  codename: string;
  name: string;
  description?: string;
};

type EditFeatureParams = {
  id: number;
  codename?: string;
  name?: string;
  description?: string;
};

type DeleteFeatureParams = { id: number };

type AssignFeaturesParams = {
  vendorId: number;
  feature_ids: number[];
};

const useVendorFeature = () => {
  const createMutation = useMutation<VendorFeature, any, CreateFeatureParams>({
    mutationFn: (payload) =>
      api
        .post("/administrator/vendor-features/", payload)
        .then((res) => res.data),
  });

  const editMutation = useMutation<VendorFeature, any, EditFeatureParams>({
    mutationFn: ({ id, ...payload }) =>
      api
        .patch(`/administrator/vendor-features/${id}/`, payload)
        .then((res) => res.data),
  });

  const deleteMutation = useMutation<void, any, DeleteFeatureParams>({
    mutationFn: ({ id }) =>
      api
        .delete(`/administrator/vendor-features/${id}/`)
        .then((res) => res.data),
  });

  const assignMutation = useMutation<any, any, AssignFeaturesParams>({
    mutationFn: ({ vendorId, feature_ids }) =>
      api
        .put(`/administrator/vendors/${vendorId}/features/assign/`, {
          feature_ids,
        })
        .then((res) => res.data),
  });

  return {
    createFeature: createMutation.mutate,
    isCreatingFeature: createMutation.isPending,

    editFeature: editMutation.mutate,
    isEditingFeature: editMutation.isPending,

    deleteFeature: deleteMutation.mutate,
    isDeletingFeature: deleteMutation.isPending,

    assignFeatures: assignMutation.mutate,
    isAssigningFeatures: assignMutation.isPending,
  };
};

export default useVendorFeature;
