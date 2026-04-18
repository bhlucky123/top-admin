import api from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";

export type MonitoringConfig = {
  id: number;
  vendor: number;
  draw: number;
  vendor_name?: string;
  draw_name?: string;
  single_digit_count: number;
  double_digit_count: number;
  triple_digit_super_count: number;
  triple_digit_box_count: number;
};

type CreateMonitoringConfigParams = {
  vendor: number;
  draw: number;
  single_digit_count: number;
  double_digit_count: number;
  triple_digit_super_count: number;
  triple_digit_box_count: number;
};

type UpdateMonitoringConfigParams = Partial<CreateMonitoringConfigParams> & {
  id: number;
};

const useMonitoringConfig = () => {
  const createMutation = useMutation<MonitoringConfig, any, CreateMonitoringConfigParams>({
    mutationFn: (payload) =>
      api.post("/draw-monitoring/config/", payload).then((res) => res.data),
  });

  const updateMutation = useMutation<MonitoringConfig, any, UpdateMonitoringConfigParams>({
    mutationFn: ({ id, ...payload }) =>
      api.patch(`/draw-monitoring/config/${id}/`, payload).then((res) => res.data),
  });

  const deleteMutation = useMutation<void, any, { id: number }>({
    mutationFn: ({ id }) =>
      api.delete(`/draw-monitoring/config/${id}/`).then((res) => res.data),
  });

  return {
    createConfig: createMutation,
    isCreating: createMutation.isPending,

    updateConfig: updateMutation,
    isUpdating: updateMutation.isPending,

    deleteConfig: deleteMutation,
    isDeleting: deleteMutation.isPending,
  };
};

export default useMonitoringConfig;
