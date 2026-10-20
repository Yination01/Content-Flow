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
  WorkspaceShell,
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
  window.localStorage.clear();
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
    expect(screen.getByDisplayValue(/No API key configured/i)).toBeInTheDocument();
    u3();

    renderWithState(<AdminScreen />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getAllByRole("link", { name: /Back to Dashboard/i }).length
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Quotas/i }));
    expect(
      screen.getByRole("heading", { name: "Cloudflare Workers AI" })
    ).toBeInTheDocument();
  });

  it("renders password strength indicator, Google OAuth, Magic Links on signup, and real Superuser identity + interactive buttons on Dashboard", () => {
    const { unmount: uSignup } = renderWithState(<AuthScreen signup />);
    expect(
      screen.getByLabelText(/Full name \/ Display name/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Continue with Google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Email Magic Link/i })
    ).toBeInTheDocument();

    const pwdInput = screen.getByLabelText(/^Password/i);
    fireEvent.change(pwdInput, { target: { value: "StrongStudio#2026!" } });
    expect(screen.getByText(/Strong \(100%\)/i)).toBeInTheDocument();
    uSignup();

    // Verify a brand-new visitor / friend's phone never sees Johnpaul Onovo's personal info by default
    const { container: freshDeviceContainer, unmount: uFresh } = renderWithState(
      <WorkspaceShell>
        <DashboardScreen />
      </WorkspaceShell>
    );
    expect(freshDeviceContainer.textContent || "").not.toMatch(/Johnpaul/i);
    expect(freshDeviceContainer.textContent || "").not.toMatch(
      /johnpaulonovo@gmail\.com/i
    );
    uFresh();

    // Verify that when the Superuser is signed in, their workspace unlocks Agency Max
    window.localStorage.setItem(
      "cf_user_profile_v1",
      JSON.stringify({
        id: "user-super",
        name: "Johnpaulonovo",
        email: "johnpaulonovo@gmail.com",
        niche: "Multi-channel content creation",
        tier: "AGENCY",
        roles: ["creator", "superuser"],
        initials: "JO",
        usage: {
          dailyAiGenerations: 0,
          monthlyPostsCreated: 0,
          monthlyCrossPosts: 0,
          storageUsedMb: 0,
        },
        limits: {
          dailyAiGenerations: 2000,
          monthlyPosts: null,
          monthlyCrossPosts: null,
          storageMb: 102400,
        },
        connectedPlatforms: {},
      })
    );
    render(<StateProvider><WorkspaceShell><DashboardScreen /></WorkspaceShell></StateProvider>);
    expect(
      screen.getByRole("heading", { level: 1, name: /Good morning, Johnpaul/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Agency Max · Superuser/i).length).toBeGreaterThan(
      0
    );
    expect(screen.getByText("0 / 2,000")).toBeInTheDocument();

    // Open notifications popover via topbar bell button
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(
      screen.getByRole("dialog", { name: /Workspace notifications/i })
    ).toBeInTheDocument();
  });

  it("verifies Phase 13 complete demo-data purge, interactive OAuth/2FA/BYOK modals, Superuser billing, and extensive Admin Control Center", () => {
    // 1. AuthScreen interactive Google OAuth & Magic Link modals (with zero personal email pre-filled)
    const { container: authContainer, unmount: uAuth } = renderWithState(<AuthScreen />);
    expect(authContainer.textContent || "").not.toMatch(/johnpaulonovo/i);
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }));
    expect(
      screen.getByRole("dialog", { name: /Google OAuth 2\.0 PKCE Sign-In/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    fireEvent.click(screen.getByRole("button", { name: /Email Magic Link/i }));
    expect(
      screen.getByRole("dialog", {
        name: /Passwordless Magic Link & 6-Digit OTP/i,
      })
    ).toBeInTheDocument();
    uAuth();

    // 2. DashboardScreen + PlatformVerificationModal + zero demo jobs
    const { unmount: uDash } = renderWithState(
      <WorkspaceShell>
        <DashboardScreen />
      </WorkspaceShell>
    );
    expect(screen.getByText(/No scheduled jobs yet/i)).toBeInTheDocument();
    const connectBtns = screen.getAllByRole("button", { name: /^Connect$/i });
    fireEvent.click(connectBtns[0]);
    expect(
      screen.getByRole("dialog", {
        name: /Verify & Connect YouTube \(OAuth 2\.0 PKCE\)/i,
      })
    ).toBeInTheDocument();
    uDash();

    // 3. SettingsScreen: Billing 0% progress + Superuser permanent unlock & Security 2FA
    window.localStorage.setItem(
      "cf_user_profile_v1",
      JSON.stringify({
        id: "user-super",
        name: "Johnpaul Onovo",
        email: "johnpaulonovo@gmail.com",
        niche: "Multi-channel content creation",
        tier: "AGENCY",
        roles: ["creator", "superuser"],
        initials: "JO",
        usage: {
          dailyAiGenerations: 0,
          monthlyPostsCreated: 0,
          monthlyCrossPosts: 0,
          storageUsedMb: 0,
        },
        limits: {
          dailyAiGenerations: 2000,
          monthlyPosts: null,
          monthlyCrossPosts: null,
          storageMb: 102400,
        },
        connectedPlatforms: {},
      })
    );
    const { unmount: uBilling } = render(
      <StateProvider>
        <SettingsScreen initialSection="Billing" />
      </StateProvider>
    );
    expect(screen.getByText(/Max Tier Unlocked \(\$0\)/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Upgrade to Pro/i })
    ).not.toBeInTheDocument();
    uBilling();

    const { unmount: uSec } = renderWithState(
      <SettingsScreen initialSection="Security" />
    );
    expect(
      screen.getByRole("button", { name: /Set up 2FA/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Send security code/i })
    ).toBeInTheDocument();
    uSec();

    // 4. AdminScreen: zero fake 12,482 count, clear Back to Dashboard, and 5 control tabs
    const { container: adminContainer, unmount: uAdmin } = renderWithState(
      <AdminScreen />
    );
    expect(adminContainer.textContent || "").not.toMatch(/12,482/);
    expect(adminContainer.textContent || "").not.toMatch(/Jon Bell/);
    expect(adminContainer.textContent || "").not.toMatch(/Priya Shah/);
    expect(
      screen.getAllByRole("link", { name: /Back to Dashboard/i }).length
    ).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: /Users/i }));
    expect(
      screen.getByText(/Showing 1 of 1 registered user\(s\)/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Audit & System/i }));
    expect(
      screen.getByText(/Production Infrastructure & Security Matrix/i)
    ).toBeInTheDocument();
    uAdmin();
  });
});

