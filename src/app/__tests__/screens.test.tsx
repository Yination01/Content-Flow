import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StateProvider } from "../state";
import {
  AdminScreen,
  AuthScreen,
  ContentDetailScreen,
  CreateScreen,
  DashboardScreen,
  JobsScreen,
  LandingScreen,
  SettingsScreen,
} from "../screens";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

function renderWithState(ui: React.ReactElement) {
  return render(<StateProvider>{ui}</StateProvider>);
}

describe("ContentFlow Next.js App Router Screens & Accessibility", () => {
  it("renders LandingScreen with one H1, canonical tier quotas, and accessible FAQ", () => {
    renderWithState(<LandingScreen />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/Create once\. Shape it for every platform\./i);

    // Canonical tier quotas from brief
    expect(screen.getByText(/10 AI generations \/ day/i)).toBeInTheDocument();
    expect(screen.getByText(/100 AI generations \/ day/i)).toBeInTheDocument();
    expect(screen.getByText(/500 AI generations \/ day/i)).toBeInTheDocument();
    expect(screen.getByText(/2,000 AI generations \/ day/i)).toBeInTheDocument();

    // FAQ toggle updates aria-expanded
    const faqBtn = screen.getByRole("button", { name: /Can I edit generated content\?/i });
    expect(faqBtn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(faqBtn);
    expect(faqBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("validates AuthScreen email on blur then live after error and toggles password visibility", () => {
    renderWithState(<AuthScreen signup />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    const emailInput = screen.getByLabelText(/Email address/i);
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.blur(emailInput);
    expect(screen.getByText(/Enter a valid email address/i)).toBeInTheDocument();

    // Live validation clears error immediately when corrected
    fireEvent.change(emailInput, { target: { value: "creator@contentflow.app" } });
    expect(screen.queryByText(/Enter a valid email address/i)).not.toBeInTheDocument();

    // Password show/hide button
    const toggleBtn = screen.getByRole("button", { name: /Show/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("button", { name: /Hide/i })).toBeInTheDocument();
  });

  it("renders DashboardScreen and CreateScreen with accessible switch roles and Demo badges", () => {
    const { unmount: unmountDash } = renderWithState(<DashboardScreen />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText(/Daily AI generations/i)).toBeInTheDocument();
    unmountDash();

    const { unmount } = renderWithState(<CreateScreen />);
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThanOrEqual(2);
    expect(switches[0]).toHaveAttribute("aria-checked", "true");
    fireEvent.click(switches[0]);
    expect(switches[0]).toHaveAttribute("aria-checked", "false");
    unmount();
  });

  it("renders ContentDetailScreen, JobsScreen, SettingsScreen, and AdminScreen with verb-specific dialogs and masked BYOK", () => {
    const { unmount: u1 } = renderWithState(<ContentDetailScreen id="1" />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete draft/i })).toBeInTheDocument();
    u1();

    const { unmount: u2 } = renderWithState(<JobsScreen />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("tab", { name: /cancelled/i })).toBeInTheDocument();
    u2();

    const { unmount: u3 } = renderWithState(<SettingsScreen initialSection="AI providers" />);
    expect(screen.getByDisplayValue(/sk-demo-•••••••••••••9K2/i)).toBeInTheDocument();
    u3();

    renderWithState(<AdminScreen />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Quotas/i }));
    expect(
      screen.getByRole("heading", { name: "Cloudflare Workers AI" })
    ).toBeInTheDocument();
  });
});
