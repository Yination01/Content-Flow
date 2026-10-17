import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StateProvider } from "../state";
import {
  AdminScreen,
  AuthScreen,
  ContentDetailScreen,
  CreateScreen,
  DashboardScreen,
  JobsScreen,
  LandingScreen,
  PrivacyScreen,
  ProductNotesScreen,
  SettingsScreen,
  TermsScreen,
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

describe("ContentFlow Production Screens (Zero Demo Artifacts & Real API Wiring)", () => {
  it("contains zero 'Demo mode' or 'Simulated' labels across all production screens", () => {
    const screens = [
      <LandingScreen key="landing" />,
      <AuthScreen key="login" />,
      <AuthScreen signup key="signup" />,
      <DashboardScreen key="dash" />,
      <CreateScreen key="create" />,
      <ContentDetailScreen id="1" key="detail" />,
      <JobsScreen key="jobs" />,
      <SettingsScreen key="settings" />,
      <AdminScreen key="admin" />,
      <PrivacyScreen key="privacy" />,
      <TermsScreen key="terms" />,
      <ProductNotesScreen key="notes" />,
    ];

    for (const view of screens) {
      const { container, unmount } = renderWithState(view);
      const text = container.textContent || "";
      expect(text).not.toMatch(/Demo mode/i);
      expect(text).not.toMatch(/Demo prototype/i);
      expect(text).not.toMatch(/Simulated workspace/i);
      expect(text).not.toMatch(/No real account is created/i);
      expect(text).not.toMatch(/Prototype for demonstration only/i);
      unmount();
    }
  });

  it("renders LandingScreen with one H1, canonical tier quotas, and accessible FAQ", () => {
    renderWithState(<LandingScreen />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/Create once\. Shape it for every platform\./i);

    expect(screen.getByText(/10 AI generations \/ day/i)).toBeInTheDocument();
    expect(screen.getByText(/100 AI generations \/ day/i)).toBeInTheDocument();
    expect(screen.getByText(/500 AI generations \/ day/i)).toBeInTheDocument();
    expect(screen.getByText(/2,000 AI generations \/ day/i)).toBeInTheDocument();

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

    fireEvent.change(emailInput, { target: { value: "creator@contentflow.app" } });
    expect(screen.queryByText(/Enter a valid email address/i)).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole("button", { name: /Show/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("button", { name: /Hide/i })).toBeInTheDocument();
  });

  it("calls /api/v1/generate from CreateScreen and renders editable generated content", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          cacheHit: false,
          quotaConsumed: true,
          provider: "contentflow_neural_engine",
          result: "Production generated script ready for YouTube and TikTok.",
          adaptations: {
            title: "Production Script",
            youtubeTitle: "Production YouTube Title",
            youtubeDescription: "Desc",
            youtubeTags: "tags",
            tiktokCaption: "Caption",
            tiktokHashtags: "#tags",
          },
          remainingDailyGenerations: 96,
        }),
        { status: 200 }
      )
    );

    renderWithState(<CreateScreen />);
    const promptInput = screen.getByLabelText(/What do you want to create\?/i);
    fireEvent.change(promptInput, { target: { value: "Write a video script on deep work" } });

    const genBtn = screen.getByRole("button", { name: /Generate draft/i });
    fireEvent.click(genBtn);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue(/Production generated script ready for YouTube and TikTok\./i)
      ).toBeInTheDocument();
    });

    fetchMock.mockRestore();
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
    expect(screen.getByDisplayValue(/sk-p•••••••••••••9K2/i)).toBeInTheDocument();
    u3();

    renderWithState(<AdminScreen />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Quotas/i }));
    expect(
      screen.getByRole("heading", { name: "Cloudflare Workers AI" })
    ).toBeInTheDocument();
  });
});
