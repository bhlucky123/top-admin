import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VendorDetailScreen from "@/app/vendor/[id]";
import api from "@/utils/axios";

jest.mock("@/utils/axios");
const mockedApi = api as jest.Mocked<typeof api>;

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: mockPush, replace: jest.fn() },
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: "1", name: "Test Vendor" }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("VendorDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders vendor name and ID from route params", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<VendorDetailScreen />);

    expect(screen.getByText("Test Vendor")).toBeTruthy();
    expect(screen.getByText("Vendor ID: 1")).toBeTruthy();
  });

  it("shows quick action buttons", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<VendorDetailScreen />);

    expect(screen.getByText("Prize Config")).toBeTruthy();
    expect(screen.getByText("Assign Draw")).toBeTruthy();
  });

  it("shows Assigned Draws section", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<VendorDetailScreen />);

    expect(screen.getByText("Assigned Draws")).toBeTruthy();
  });

  it("shows Administrators section", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<VendorDetailScreen />);

    expect(screen.getByText("Administrators")).toBeTruthy();
  });

  it("displays assigned draws list", async () => {
    mockedApi.get = jest.fn((url: string) => {
      if (url.includes("vendor-draws"))
        return Promise.resolve({
          data: [
            { id: 1, vendor: 1, draw: 1, vendor_name: "Test Vendor", draw_name: "Morning Draw" },
            { id: 2, vendor: 1, draw: 2, vendor_name: "Test Vendor", draw_name: "Evening Draw" },
          ],
        });
      if (url.includes("administrator"))
        return Promise.resolve({ data: [] });
      if (url.includes("prize-configuration"))
        return Promise.resolve({
          data: {
            id: 1,
            is_active: true,
            default_dealer_commission: 5,
            single_digit_prize: 100,
            double_digit_prize: 80,
            box_direct: 300,
          },
        });
      if (url.includes("/draw/"))
        return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<VendorDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("Morning Draw")).toBeTruthy();
      expect(screen.getByText("Evening Draw")).toBeTruthy();
    });
  });

  it("displays admin list for the vendor", async () => {
    mockedApi.get = jest.fn((url: string) => {
      if (url.includes("vendor-draws"))
        return Promise.resolve({ data: [] });
      if (url.includes("administrator/administrator"))
        return Promise.resolve({
          data: [
            { id: 1, username: "vendor_admin", is_active: true, vendor: 1, is_main_vendor: true },
          ],
        });
      if (url.includes("prize-configuration"))
        return Promise.resolve({ data: null });
      if (url.includes("/draw/"))
        return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<VendorDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("vendor_admin")).toBeTruthy();
      expect(screen.getByText("Main Admin")).toBeTruthy();
    });
  });

  it("shows empty state for draws when none assigned", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<VendorDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("No draws assigned")).toBeTruthy();
      expect(screen.getByText("Assign a Draw")).toBeTruthy();
    });
  });

  it("shows empty state for admins when none exist", async () => {
    mockedApi.get = jest.fn((url: string) => {
      if (url.includes("administrator/administrator"))
        return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<VendorDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("No administrators")).toBeTruthy();
    });
  });

  it("navigates to prize config on quick action press", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<VendorDetailScreen />);

    fireEvent.press(screen.getByText("Prize Config"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/vendor-config/[id]",
      params: { id: "1" },
    });
  });

  it("shows prize config summary when data available", async () => {
    mockedApi.get = jest.fn((url: string) => {
      if (url.includes("prize-configuration"))
        return Promise.resolve({
          data: {
            id: 1,
            is_active: true,
            default_dealer_commission: 5,
            single_digit_prize: 100,
            double_digit_prize: 80,
            box_direct: 300,
          },
        });
      if (url.includes("administrator/administrator"))
        return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<VendorDetailScreen />);

    await waitFor(
      () => {
        expect(screen.getAllByText("Prize Config").length).toBeGreaterThan(0);
        expect(screen.getByText("Commission")).toBeTruthy();
      },
      { timeout: 10000 }
    );
  });
});
