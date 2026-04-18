export type MonitoringType = "single_digit" | "double_digit" | "triple_digit";

export type MonitoringSubType =
  | "A"
  | "B"
  | "C"
  | "AB"
  | "BC"
  | "AC"
  | "SUPER"
  | "BOX";

export type MonitoringExtraCount = {
  id: number;
  vendor: number;
  draw_session: number;
  vendor_name?: string;
  draw_name?: string;
  session_date: string;
  number: string;
  count: number;
  type: MonitoringType;
  sub_type: MonitoringSubType;
};

export const TYPE_LABELS: Record<MonitoringType, string> = {
  single_digit: "Single Digit",
  double_digit: "Double Digit",
  triple_digit: "Triple Digit",
};

export const SUB_TYPE_LABELS: Record<MonitoringSubType, string> = {
  A: "A",
  B: "B",
  C: "C",
  AB: "AB",
  BC: "BC",
  AC: "AC",
  SUPER: "Super",
  BOX: "Box",
};

export const SUB_TYPES_BY_TYPE: Record<MonitoringType, MonitoringSubType[]> = {
  single_digit: ["A", "B", "C"],
  double_digit: ["AB", "BC", "AC"],
  triple_digit: ["SUPER", "BOX"],
};

export const ALL_SUB_TYPES: MonitoringSubType[] = [
  "A",
  "B",
  "C",
  "AB",
  "BC",
  "AC",
  "SUPER",
  "BOX",
];
