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
  type__in?: string;
  sub_type__in?: string;
};

type ClearBody = {
  vendor_id?: number;
  draw_id?: number;
  draw_session_id?: number;
  session_date?: string;
  type?: MonitoringType | MonitoringType[];
  sub_type?: MonitoringSubType | MonitoringSubType[];
};

type TransferBody = {
  draw_id: number;
  vendor_ids?: number[];
  destination_vendor_ids?: number[];
  type?: MonitoringType | MonitoringType[];
  sub_type?: MonitoringSubType | MonitoringSubType[];
};

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

export type MonitoringTransferBatch = {
  id: number;
  draw_session: number;
  draw_name?: string;
  session_date: string;
  sequence_number: number;
  total_transferred: number;
  total_entries: number;
  initiated_by: number | null;
  initiated_by_name: string | null;
  transferred_at: string;
};

export type MonitoringTransferLog = {
  id: number;
  batch: number | null;
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

  const clear = useMutation<{ cleared_count: number }, any, ClearBody>({
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
