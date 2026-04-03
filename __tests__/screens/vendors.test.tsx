import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VendorsScreen from "@/app/(tabs)/vendors";
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

describe("VendorsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the header with title and add button", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<VendorsScreen />);

    expect(screen.getByText("Vendors")).toBeTruthy();
    expect(screen.getByPlaceholderText("Search vendors...")).toBeTruthy();
  });

  it("shows loading state", () => {
    mockedApi.get = jest.fn(() => new Promise(() => {})); // never resolves

    renderWithProviders(<VendorsScreen />);

    expect(screen.getByText("Loading vendors...")).toBeTruthy();
  });

  it("displays vendor list after loading", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({
      data: [
        { id: 1, name: "Vendor Alpha" },
        { id: 2, name: "Vendor Beta" },
      ],
    });

    renderWithProviders(<VendorsScreen />);

    await waitFor(
      () => {
        expect(screen.getByText("Vendor Alpha")).toBeTruthy();
        expect(screen.getByText("Vendor Beta")).toBeTruthy();
      },
      { timeout: 10000 }
    );
  });

  it("filters vendors by search query", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({
      data: [
        { id: 1, name: "Alpha" },
        { id: 2, name: "Beta" },
        { id: 3, name: "Gamma" },
      ],
    });

    renderWithProviders(<VendorsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText("Search vendors..."),
      "beta"
    );

    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.queryByText("Alpha")).toBeNull();
    expect(screen.queryByText("Gamma")).toBeNull();
  });

  it("shows empty state with create button when no vendors", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<VendorsScreen />);

    await waitFor(() => {
      expect(screen.getByText("No vendors yet")).toBeTruthy();
      expect(screen.getByText("Create First Vendor")).toBeTruthy();
    });
  });

  it("shows vendor form when add button is pressed", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<VendorsScreen />);

    await waitFor(() => {
      expect(screen.getByText("No vendors yet")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Create First Vendor"));

    expect(screen.getByText("New Vendor")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Enter vendor name")
    ).toBeTruthy();
  });

  it("validates vendor name is required in form", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: [] });

    renderWithProviders(<VendorsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Create First Vendor")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Create First Vendor"));
    fireEvent.press(screen.getByText("Create Vendor"));

    expect(screen.getByText("Vendor name is required")).toBeTruthy();
  });

  it("shows edit and delete buttons on vendor cards", async () => {
    mockedApi.get = jest.fn().mockResolvedValue({
      data: [{ id: 1, name: "Test Vendor" }],
    });

    renderWithProviders(<VendorsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Test Vendor")).toBeTruthy();
      expect(screen.getByText("Edit")).toBeTruthy();
      expect(screen.getByText("Delete")).toBeTruthy();
    });
  });
});
