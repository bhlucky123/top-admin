import { fireEvent, render } from "@testing-library/react-native";
import AllVendorThresholds from "@/components/all-vendor-thresholds";

const mockSave = jest.fn();
jest.mock("@/hooks/use-vendor", () => ({
  __esModule: true,
  default: () => ({ setAllVendorThresholds: mockSave, isSettingThresholds: false }),
}));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: jest.fn(), invalidateQueries: jest.fn() }),
}));

beforeEach(() => mockSave.mockClear());

it("sends only entered counts, retaining explicit zero and omitting blank fields", () => {
  const screen = render(<AllVendorThresholds onClose={jest.fn()} />);
  fireEvent.changeText(screen.getByLabelText("Single A threshold"), "100");
  fireEvent.changeText(screen.getByLabelText("Box threshold"), "0");
  fireEvent.press(screen.getByText("Apply to all vendors"));
  expect(mockSave).toHaveBeenCalledWith({
    monitoring_single_digit_a_count: 100,
    monitoring_triple_digit_box_count: 0,
  }, expect.any(Object));
});

it("rejects an empty submission and fractional counts", () => {
  const screen = render(<AllVendorThresholds onClose={jest.fn()} />);
  fireEvent.press(screen.getByText("Apply to all vendors"));
  expect(screen.getByText("Enter at least one threshold.")).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText("Single A threshold"), "1.5");
  fireEvent.press(screen.getByText("Apply to all vendors"));
  expect(mockSave).not.toHaveBeenCalled();
});

it("allows cancelling without changing vendors", () => {
  const close = jest.fn();
  const screen = render(<AllVendorThresholds onClose={close} />);
  fireEvent.press(screen.getByText("Cancel"));
  expect(close).toHaveBeenCalledTimes(1);
  expect(mockSave).not.toHaveBeenCalled();
});
