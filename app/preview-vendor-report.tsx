import VendorForm from "@/components/vendor-form";

/** Temporary local visual-preview route. It is not committed with the feature. */
export default function PreviewVendorReport() {
  return (
    <VendorForm
      defaultValues={{
        id: 1,
        name: "North Star Lottery",
        monitoring_enabled: true,
        monitoring_single_digit_a_count: 40,
        monitoring_single_digit_b_count: 40,
        monitoring_single_digit_c_count: 40,
        monitoring_double_digit_ab_count: 75,
        monitoring_double_digit_bc_count: 75,
        monitoring_double_digit_ac_count: 75,
        monitoring_triple_digit_super_count: 20,
        monitoring_triple_digit_box_count: 20,
        sales_report_recipients: ["owner@northstar.com", "accounts@northstar.com"],
      }}
      onSubmit={() => undefined}
      onCancel={() => undefined}
      submitting={false}
    />
  );
}
