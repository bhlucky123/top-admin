import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminsScreen from "@/app/(tabs)/admins";
import api from "@/utils/axios";

jest.mock("@/utils/axios");
const mockedApi = api as jest.Mocked<typeof api>;


function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

const sampleAdmins = [
  {
    id: 1,
    username: "admin_alpha",
    is_active: true,
    vendor: 1,
    is_main_vendor: true,
    calculate_str: "1+1",
    secret_pin: 1111,
  },
  {
    id: 2,
    username: "admin_beta",
    is_active: false,
    vendor: 2,
    is_main_vendor: false,
    calculate_str: "2+2",
    secret_pin: 2222,
  },
];

const sampleVendors = [
  { id: 1, name: "Vendor A" },
  { id: 2, name: "Vendor B" },
];

describe("AdminsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders header and search", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<AdminsScreen />);

    expect(screen.getByText("Administrators")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Search administrators...")
    ).toBeTruthy();
  });

  it("displays admin list with vendor names", async () => {
    mockedApi.get = jest.fn((url: string) => {
      if (url.includes("administrator/administrator"))
        return Promise.resolve({ data: sampleAdmins });
      if (url.includes("vendors"))
        return Promise.resolve({ data: sampleVendors });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<AdminsScreen />);

    await waitFor(
      () => {
        expect(screen.getByText("admin_alpha")).toBeTruthy();
        expect(screen.getByText("admin_beta")).toBeTruthy();
        expect(screen.getByText("Vendor A")).toBeTruthy();
        expect(screen.getByText("Vendor B")).toBeTruthy();
      },
      { timeout: 10000 }
    );
  });

  it("shows Main Admin badge for main vendor admins", async () => {
    mockedApi.get = jest.fn((url: string) => {
      if (url.includes("administrator/administrator"))
        return Promise.resolve({ data: sampleAdmins });
      if (url.includes("vendors"))
        return Promise.resolve({ data: sampleVendors });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<AdminsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Main Admin")).toBeTruthy();
    });
  });

  it("shows active/inactive badges", async () => {
    mockedApi.get = jest.fn((url: string) => {
      if (url.includes("administrator/administrator"))
        return Promise.resolve({ data: sampleAdmins });
      if (url.includes("vendors"))
        return Promise.resolve({ data: sampleVendors });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<AdminsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeTruthy();
      expect(screen.getByText("Inactive")).toBeTruthy();
    });
  });

  it("filters admins by search", async () => {
    mockedApi.get = jest.fn((url: string) => {
      if (url.includes("administrator/administrator"))
        return Promise.resolve({ data: sampleAdmins });
      if (url.includes("vendors"))
        return Promise.resolve({ data: sampleVendors });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<AdminsScreen />);

    await waitFor(() => {
      expect(screen.getByText("admin_alpha")).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText("Search administrators..."),
      "beta"
    );

    expect(screen.getByText("admin_beta")).toBeTruthy();
    expect(screen.queryByText("admin_alpha")).toBeNull();
  });

  it("shows empty state when no admins", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<AdminsScreen />);

    await waitFor(() => {
      expect(screen.getByText("No administrators yet")).toBeTruthy();
    });
  });

  it("shows admin form with vendor selector on create", async () => {
    mockedApi.get = jest.fn((url: string) => {
      if (url.includes("administrator/administrator"))
        return Promise.resolve({ data: sampleAdmins });
      if (url.includes("vendors"))
        return Promise.resolve({ data: sampleVendors });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<AdminsScreen />);

    await waitFor(
      () => {
        expect(screen.getByText("admin_alpha")).toBeTruthy();
      },
      { timeout: 10000 }
    );

    // Press Edit on first admin
    const editButtons = screen.getAllByText("Edit");
    fireEvent.press(editButtons[0]);

    expect(screen.getByText("Edit Admin")).toBeTruthy();
    expect(screen.getAllByText("Username").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vendor").length).toBeGreaterThan(0);
    expect(screen.getByText("Main Vendor Admin")).toBeTruthy();
    expect(screen.getByText("Active Account")).toBeTruthy();
  });
});
