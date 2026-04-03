import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardScreen from "@/app/(tabs)/index";
import { useAuthStore } from "@/store/auth";
import api from "@/utils/axios";

jest.mock("@/utils/axios");
const mockedApi = api as jest.Mocked<typeof api>;


function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: 1,
      username: "superadmin",
      user_type: "ADMINISTRATOR",
      superuser: true,
    },
    token: "test-token",
  });
  jest.clearAllMocks();
});

describe("DashboardScreen", () => {
  it("renders welcome message with username", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<DashboardScreen />);

    expect(screen.getByText("Welcome back,")).toBeTruthy();
    expect(screen.getByText("superadmin")).toBeTruthy();
    expect(
      screen.getByText("Multi-Vendor Control Panel")
    ).toBeTruthy();
  });

  it("renders stat cards for vendors, draws, admins", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<DashboardScreen />);

    expect(screen.getByText("Total Vendors")).toBeTruthy();
    expect(screen.getByText("Total Draws")).toBeTruthy();
    expect(screen.getByText("Administrators")).toBeTruthy();
  });

  it("shows correct counts after data loads", async () => {
    mockedApi.get = jest.fn((url: string) => {
      if (url.includes("vendors"))
        return Promise.resolve({
          data: [
            { id: 1, name: "A" },
            { id: 2, name: "B" },
          ],
        });
      if (url.includes("draw"))
        return Promise.resolve({
          data: [{ id: 1, name: "Morning", draw_time: "12:00", cut_off_time: "11:30" }],
        });
      if (url.includes("administrator"))
        return Promise.resolve({
          data: [
            { id: 1, username: "admin1" },
            { id: 2, username: "admin2" },
            { id: 3, username: "admin3" },
          ],
        });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText("2")).toBeTruthy(); // vendors
      expect(screen.getByText("1")).toBeTruthy(); // draws
      expect(screen.getByText("3")).toBeTruthy(); // admins
    });
  });

  it("shows 'Recent Vendors' and 'Active Draws' sections", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<DashboardScreen />);

    expect(screen.getByText("Recent Vendors")).toBeTruthy();
    expect(screen.getByText("Active Draws")).toBeTruthy();
  });

  it("displays vendor names in recent vendors list", async () => {
    mockedApi.get = jest.fn((url: string) => {
      if (url.includes("vendors"))
        return Promise.resolve({
          data: [
            { id: 1, name: "Acme Corp" },
            { id: 2, name: "Beta LLC" },
          ],
        });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeTruthy();
      expect(screen.getByText("Beta LLC")).toBeTruthy();
    });
  });

  it("shows empty state when no vendors", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText("No vendors yet")).toBeTruthy();
    });
  });

  it("shows Refresh All card", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<DashboardScreen />);

    expect(screen.getByText("Refresh All")).toBeTruthy();
  });
});
