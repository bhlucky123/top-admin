import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import SettingsScreen from "@/app/(tabs)/settings";
import { useAuthStore } from "@/store/auth";
import { Alert } from "react-native";


jest.spyOn(Alert, "alert");

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
  (Alert.alert as jest.Mock).mockClear();
});

describe("SettingsScreen", () => {
  it("renders settings header", () => {
    render(<SettingsScreen />);
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("displays username from auth store", () => {
    render(<SettingsScreen />);
    expect(screen.getAllByText("superadmin").length).toBeGreaterThan(0);
  });

  it("shows Super Administrator role", () => {
    render(<SettingsScreen />);
    expect(screen.getByText("Super Administrator")).toBeTruthy();
  });

  it("shows role detail", () => {
    render(<SettingsScreen />);
    expect(screen.getByText("Super Admin (Full Access)")).toBeTruthy();
  });

  it("shows app version", () => {
    render(<SettingsScreen />);
    expect(screen.getByText("1.0.0")).toBeTruthy();
  });

  it("shows sign out option", () => {
    render(<SettingsScreen />);
    expect(screen.getByText("Sign Out")).toBeTruthy();
  });

  it("shows confirmation dialog on sign out press", () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Sign Out"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Logout",
      "Are you sure you want to sign out?",
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel" }),
        expect.objectContaining({ text: "Sign Out", style: "destructive" }),
      ])
    );
  });

  it("calls logout when confirmed", () => {
    const logoutSpy = jest.fn();
    useAuthStore.setState({ logout: logoutSpy } as any);

    render(<SettingsScreen />);
    fireEvent.press(screen.getByText("Sign Out"));

    // Simulate pressing "Sign Out" on the alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveButton = alertCall[2].find(
      (b: any) => b.style === "destructive"
    );
    destructiveButton.onPress();

    expect(logoutSpy).toHaveBeenCalled();
  });

  it("shows Account and App Info sections", () => {
    render(<SettingsScreen />);
    expect(screen.getByText("Account")).toBeTruthy();
    expect(screen.getByText("App Info")).toBeTruthy();
  });
});
