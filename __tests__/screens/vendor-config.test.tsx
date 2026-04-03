import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VendorConfigScreen from "@/app/vendor-config/[id]";
import api from "@/utils/axios";

jest.mock("@/utils/axios");
const mockedApi = api as jest.Mocked<typeof api>;

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: "1" }),
}));

const sampleConfig = {
  id: 1,
  is_active: true,
  default_dealer_commission: 5,
  single_digit_prize: 100,
  double_digit_prize: 80,
  box_direct: 300,
  box_indirect: 150,
  super_first_prize: 5000,
  super_second_prize: 3000,
  super_third_prize: 2000,
  super_fourth_prize: 1000,
  super_fifth_prize: 500,
  super_complementary_prize: 200,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("VendorConfigScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockedApi.get = jest.fn(() => new Promise(() => {}));

    renderWithProviders(<VendorConfigScreen />);

    expect(screen.getByText("Loading configuration...")).toBeTruthy();
  });

  it("renders all prize configuration fields", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: sampleConfig });

    renderWithProviders(<VendorConfigScreen />);

    await waitFor(
      () => {
        expect(screen.getByText("Prize Configuration")).toBeTruthy();
      expect(screen.getByText("Default Dealer Commission")).toBeTruthy();
      expect(screen.getByText("Single Digit Prize")).toBeTruthy();
      expect(screen.getByText("Double Digit Prize")).toBeTruthy();
      expect(screen.getByText("Box Direct")).toBeTruthy();
      expect(screen.getByText("Box Indirect")).toBeTruthy();
      expect(screen.getByText("Super First Prize")).toBeTruthy();
      expect(screen.getByText("Super Second Prize")).toBeTruthy();
      expect(screen.getByText("Super Third Prize")).toBeTruthy();
      expect(screen.getByText("Super Fourth Prize")).toBeTruthy();
      expect(screen.getByText("Super Fifth Prize")).toBeTruthy();
      expect(screen.getByText("Super Complementary Prize")).toBeTruthy();
      },
      { timeout: 10000 }
    );
  });

  it("populates form fields with config data", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: sampleConfig });

    renderWithProviders(<VendorConfigScreen />);

    await waitFor(() => {
      // Check that values from config are shown in text inputs
      // The fields are pre-filled with the config values
      expect(screen.getByDisplayValue("5")).toBeTruthy(); // commission
      expect(screen.getByDisplayValue("100")).toBeTruthy(); // single digit
      expect(screen.getByDisplayValue("5000")).toBeTruthy(); // super first
    });
  });

  it("renders application status toggle", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: sampleConfig });

    renderWithProviders(<VendorConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText("Application Status")).toBeTruthy();
      expect(screen.getByText("Vendor app is active")).toBeTruthy();
    });
  });

  it("toggles app status on press", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: sampleConfig });

    renderWithProviders(<VendorConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText("Vendor app is active")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Application Status"));

    expect(screen.getByText("Vendor app is inactive")).toBeTruthy();
  });

  it("renders save button", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: sampleConfig });

    renderWithProviders(<VendorConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText("Save Configuration")).toBeTruthy();
    });
  });

  it("allows editing field values", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: sampleConfig });

    renderWithProviders(<VendorConfigScreen />);

    await waitFor(
      () => {
        expect(screen.getByDisplayValue("100")).toBeTruthy();
      },
      { timeout: 10000 }
    );

    const singleDigitInput = screen.getByDisplayValue("100");
    fireEvent.changeText(singleDigitInput, "200");

    expect(screen.getByDisplayValue("200")).toBeTruthy();
  });

  it("calls PATCH API on save", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: sampleConfig });
    mockedApi.patch = jest
      .fn()
      .mockResolvedValue({ data: { ...sampleConfig, single_digit_prize: 200 } });

    renderWithProviders(<VendorConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText("Save Configuration")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Save Configuration"));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith(
        "/administrator/prize-configuration/1/",
        expect.objectContaining({
          is_active: true,
          default_dealer_commission: 5,
          single_digit_prize: 100,
        })
      );
    });
  });

  it("shows error state when API fails", async () => {
    mockedApi.get = jest.fn().mockRejectedValue(new Error("Network error"));

    renderWithProviders(<VendorConfigScreen />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load configuration")
      ).toBeTruthy();
      expect(screen.getByText("Retry")).toBeTruthy();
    });
  });
});
