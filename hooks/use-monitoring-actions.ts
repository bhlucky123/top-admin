import api from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";
import {
  MonitoringSubType,
  MonitoringType,
} from "./use-monitoring-extra-count";

type CopyAllFilters = {
  vendor__id?: number;
  draw_session__id?: number;
  draw_session__draw__id?: number;
  draw_session__session_date?: string;
  type?: MonitoringType;
  sub_type?: MonitoringSubType;
};

type ClearBody = {
  vendor_id?: number;
  draw_id?: number;
  draw_session_id?: number;
  session_date?: string;
  type?: MonitoringType;
  sub_type?: MonitoringSubType;
};

type TransferBody = { draw_id: number };

export type TransferEntry = {
  from_vendor: string;
  from_vendor_id: number;
  to_vendor: string;
  to_vendor_id: number;
  number: string;
  count: number;
  type: MonitoringType;
  sub_type: MonitoringSubType;
};

export type TransferResponse = {
  draw_session: number;
  total_transferred: number;
  total_remaining_extra: number;
  transfers: TransferEntry[];
};

export type MonitoringTransferLog = {
  id: number;
  from_vendor_name?: string;
  to_vendor_name?: string;
  draw_name?: string;
  session_date: string;
  draw_session: number;
  from_vendor: number;
  to_vendor: number;
  number: string;
  count: number;
  type: MonitoringType;
  sub_type: MonitoringSubType;
  transferred_at: string;
};

const useMonitoringActions = () => {
  const copyAll = useMutation<string[], any, CopyAllFilters>({
    mutationFn: (params) =>
      api
        .get("/draw-monitoring/extra-count/copy-all/", { params })
        .then((r) => r.data),
  });

  const clear = useMutation<{ deleted_count: number }, any, ClearBody>({
    mutationFn: (body) =>
      api
        .post("/draw-monitoring/extra-count/clear/", body)
        .then((r) => r.data),
  });

  const transferAll = useMutation<TransferResponse, any, TransferBody>({
    mutationFn: (body) =>
      api
        .post("/draw-monitoring/extra-count/transfer-all/", body)
        .then((r) => r.data),
  });

  return { copyAll, clear, transferAll };
};

export default useMonitoringActions;
