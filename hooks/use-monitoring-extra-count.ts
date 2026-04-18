export type MonitoringCountType =
  | "single_digit"
  | "double_digit"
  | "triple_digit_super"
  | "triple_digit_box";

export type MonitoringExtraCount = {
  id: number;
  vendor: number;
  draw_session: number;
  vendor_name?: string;
  draw_name?: string;
  session_date: string;
  count_type: MonitoringCountType;
  monitoring_count: number;
  total_booked_count: number;
  extra_count: number;
};

export const COUNT_TYPE_LABELS: Record<MonitoringCountType, string> = {
  single_digit: "Single Digit",
  double_digit: "Double Digit",
  triple_digit_super: "Triple Digit Super",
  triple_digit_box: "Triple Digit Box",
};
