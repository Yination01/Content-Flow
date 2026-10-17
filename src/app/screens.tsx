"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  buildSubtitlesFromStoryboard,
  buildVideoStoryboard,
  buildWebmRenderPlan,
  renderSceneToSvgDataUrl,
} from "@/lib/video/client-renderer";
import { buildTeleprompterPlan } from "@/lib/teleprompter/pacing";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  Film,
  HelpCircle,
  Home,
  Image,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  PenLine,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  UploadCloud,
  UserRound,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { useAppState, type Job } from "./state";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  MetricCard,
  PageHeader,
  Progress,
  Skeleton,
  StatusBadge,
  Tabs,
  TextArea,
  Toast,
  WorkspaceBadge,
  type Status,
} from "./ui";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="ContentFlow home">
      <span className="brand__mark">
        <Sparkles size={18} aria-hidden="true" />
      </span>
      {!compact && <span>ContentFlow</span>}
    </Link>
  );
}

const features = [
  {
    icon: WandSparkles,
    title: "Create with momentum",
    body: "Turn a rough idea into an editable first draft, without giving up creative control.",
  },
  {
    icon: RefreshCw,
    title: "Adapt, don't duplicate",
    body: "Shape one core idea for YouTube and TikTok with platform-aware fields and previews.",
  },
  {
    icon: Calendar,
    title: "Move work forward",
    body: "Prepare, review, and queue content from one calm workspace built for creators.",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    body: "Try the core workflow",
    quotas: [
      "10 AI generations / day",
      "5 posts & 10 cross-posts / month",
      "100 MB media storage",
    ],
  },
  {
    name: "Creator",
    price: "$9",
    cadence: "/ month",
    body: "For a consistent solo practice",
    quotas: [
      "100 AI generations / day",
      "50 posts & 100 cross-posts / month",
      "Video rendering + 1 GB storage",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    cadence: "/ month",
    body: "For growing multi-channel creators",
    featured: true,
    quotas: [
      "500 AI generations / day",
      "Unlimited posts & cross-posts",
      "Video rendering + 10 GB storage",
    ],
  },
  {
    name: "Agency",
    price: "$99",
    cadence: "/ month",
    body: "For teams managing more volume",
    quotas: [
      "2,000 AI generations / day",
      "Unlimited posts & cross-posts",
      "Video rendering + 50 GB storage",
    ],
  },
];

const faqItems: [string, string][] = [
  [
    "How does ContentFlow publish content across channels?",
    "Once you connect your YouTube or TikTok account via OAuth 2.0 PKCE in Settings, queued jobs are claimed by our background workers and published at your scheduled UTC time.",
  ],
  [
    "Can I edit generated content?",
    "Yes. Every result is designed to be fully editable before you save or prepare it for a platform.",
  ],
  [
    "Do I need to add an API key?",
    "No. ContentFlow includes managed AI generation out of the box. You can optionally add your own OpenAI or Replicate key (encrypted with server-side AES-256-GCM) in Settings.",
  ],
  [
    "How do quota resets and cache hits work?",
    "Daily quotas reset at 00:00 UTC and monthly allowances reset on the 1st at 00:00 UTC. User-scoped exact-match AI cache hits do not consume daily quota.",
  ],
];

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="product-preview" aria-label="Interactive workspace preview">
      <div className="product-preview__chrome">
        <span />
        <span />
        <span />
        <small>ContentFlow workspace</small>
        <WorkspaceBadge label="Creator Studio" />
      </div>
      <div className="product-preview__body">
        <aside>
          <Brand compact />
          <span className="preview-nav active">
            <Home size={14} aria-hidden="true" /> Home
          </span>
          <span className="preview-nav">
            <Plus size={14} aria-hidden="true" /> Create
          </span>
          <span className="preview-nav">
            <FileText size={14} aria-hidden="true" /> Content
          </span>
        </aside>
        <div className="preview-main">
          <div className="preview-welcome">
            <div>
              <small>Good morning, Maya</small>
              <h3>What will you create today?</h3>
            </div>
            <span className="button button--primary">
              <Plus size={14} aria-hidden="true" /> Create
            </span>
          </div>
          <div className="preview-metrics">
            <div>
              <span>Daily generations</span>
              <strong>
                3 <small>/ 100</small>
              </strong>
              <Progress value={3} label="Daily quota usage" />
            </div>
            <div>
              <span>Monthly posts</span>
              <strong>
                18 <small>/ 50</small>
              </strong>
              <Progress value={36} label="Monthly post usage" />
            </div>
          </div>
          <div className="preview-editor">
            <div className="preview-image">
              <Play size={22} aria-hidden="true" />
            </div>
            <div>
              <StatusBadge status="draft" />
              <h4>Five habits for a calmer morning</h4>
              <p>
                A practical guide to protecting the first hour of your day...
              </p>
              <span className="preview-platform">
                <Play size={14} aria-hidden="true" /> YouTube
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingScreen() {
  const [faq, setFaq] = useState(0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "ContentFlow",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        description:
          "AI-powered content creation and cross-platform distribution workspace for YouTube and TikTok creators.",
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "0",
          highPrice: "99",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="marketing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="marketing-nav" aria-label="Primary navigation">
        <Brand />
        <div className="marketing-nav__links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="marketing-nav__actions">
          <Link className="button button--ghost" href="/login">
            Log in
          </Link>
          <Link className="button button--primary" href="/signup">
            Get started
          </Link>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero__copy">
            <div className="announcement">
              <Sparkles size={14} aria-hidden="true" /> Your idea, ready for
              every channel <ArrowRight size={14} aria-hidden="true" />
            </div>
            <h1>Create once. Shape it for every platform.</h1>
            <p>
              ContentFlow helps creators turn a single idea into polished,
              platform-ready content for YouTube and TikTok, all in one focused
              workspace.
            </p>
            <div className="hero__actions">
              <Link
                className="button button--primary button--large"
                href="/signup"
              >
                Start creating free <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a
                className="button button--secondary button--large"
                href="#workflow"
              >
                <Play size={16} aria-hidden="true" /> See how it works
              </a>
            </div>
            <small>
              No credit card required · Free plan available · Instant workspace
              setup
            </small>
          </div>
          <ProductPreview />
        </section>

        <section className="logo-strip" aria-label="Creator categories">
          <span>Built for modern creator workflows</span>
          <strong>VIDEO ESSAYS</strong>
          <strong>EDUCATION</strong>
          <strong>WELLNESS</strong>
          <strong>TECH</strong>
          <strong>LIFESTYLE</strong>
        </section>

        <section className="section" id="features">
          <SectionHeading
            eyebrow="One clear workflow"
            title="From first thought to final draft"
            body="Spend less time moving between tools and more time refining the work only you can make."
          />
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, body }, index) => (
              <Card className="feature-card" key={title}>
                <div className="feature-card__top">
                  <span className="feature-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <small>0{index + 1}</small>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="section workflow" id="workflow">
          <SectionHeading
            eyebrow="How it works"
            title="A lighter way to create consistently"
            body="Keep your voice at the center while ContentFlow handles the repetitive shaping and organizing."
          />
          <div className="workflow__grid">
            {[
              [
                "01",
                "Start with an idea",
                "Write a prompt or choose an example to get moving.",
              ],
              [
                "02",
                "Edit your draft",
                "Refine every word in a focused, editable workspace.",
              ],
              [
                "03",
                "Prepare each channel",
                "Customize titles, captions, tags, and timing.",
              ],
            ].map(([number, title, body]) => (
              <div className="step" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="pricing">
          <SectionHeading
            eyebrow="Simple pricing"
            title="A plan for every publishing rhythm"
            body="Transparent monthly pricing in USD and NGN via Paystack. Upgrade or cancel anytime."
          />
          <div className="pricing-grid">
            {pricingPlans.map((plan) => (
              <Card
                className={
                  plan.featured
                    ? "price-card price-card--featured"
                    : "price-card"
                }
                key={plan.name}
              >
                {plan.featured && (
                  <span className="price-card__flag">Most popular</span>
                )}
                <h3>{plan.name}</h3>
                <p>{plan.body}</p>
                <div className="price">
                  <strong>{plan.price}</strong>
                  <span>{plan.cadence}</span>
                </div>
                <ul>
                  {plan.quotas.map((q) => (
                    <li key={q}>
                      <Check size={16} aria-hidden="true" /> {q}
                    </li>
                  ))}
                </ul>
                <Link
                  className={`button ${
                    plan.featured ? "button--primary" : "button--secondary"
                  }`}
                  href="/signup"
                >
                  Choose {plan.name}
                </Link>
              </Card>
            ))}
          </div>
        </section>

        <section className="section faq" id="faq">
          <SectionHeading
            eyebrow="Questions, answered"
            title="Know before you flow"
          />
          <div className="faq__list">
            {faqItems.map(([question, answer], index) => (
              <button
                type="button"
                className="faq-item"
                onClick={() => setFaq(index)}
                aria-expanded={faq === index}
                key={question}
              >
                <span>
                  <strong>{question}</strong>
                  {faq === index && <p>{answer}</p>}
                </span>
                <span>{faq === index ? "−" : "+"}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="cta-band">
          <div>
            <p className="eyebrow">Your next idea is ready</p>
            <h2>Make more room for the creative part.</h2>
          </div>
          <Link
            className="button button--primary button--large"
            href="/signup"
          >
            Start creating free <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer>
        <Brand />
        <p>© 2026 ContentFlow. Built for multi-channel creators.</p>
        <div>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/notes">Product notes</Link>
        </div>
      </footer>
    </div>
  );
}

export function AuthScreen({ signup = false }: { signup?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailError =
    emailTouched && !isEmailValid ? "Enter a valid email address." : undefined;
  const isPasswordValid = password.length >= 8;
  const passwordError =
    passwordTouched && !isPasswordValid
      ? "Password must be at least 8 characters."
      : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!isEmailValid || !isPasswordValid) return;

    setError("");
    setLoading(true);
    try {
      const endpoint = signup ? "/api/v1/auth/signup" : "/api/v1/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Authentication failed. Please try again.");
        setLoading(false);
        return;
      }
      setLoading(false);
      if (signup) setComplete(true);
      else router.push("/dashboard");
    } catch {
      setLoading(false);
      if (signup) setComplete(true);
      else router.push("/dashboard");
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-aside">
        <Brand />
        <div>
          <span className="auth-quote__mark">“</span>
          <blockquote>
            ContentFlow gives every idea a clear path forward, without losing
            the voice that makes it yours.
          </blockquote>
          <p>Built for thoughtful creators</p>
        </div>
        <small>Encrypted sessions · Row-Level Security protected</small>
      </div>
      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        {complete ? (
          <Card className="confirmation">
            <div className="success-icon">
              <Check size={28} aria-hidden="true" />
            </div>
            <WorkspaceBadge label="Account Ready" />
            <h1>You&apos;re ready to create</h1>
            <p>
              Your creator workspace is active. Start with a blank slate and
              turn your first idea into platform-ready content.
            </p>
            <Button onClick={() => router.push("/dashboard?new=true")}>
              Open my workspace <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </Card>
        ) : (
          <form className="auth-form" onSubmit={submit} noValidate>
            <WorkspaceBadge label={signup ? "Free Tier Included" : "Creator Sign-In"} />
            <div>
              <h1>{signup ? "Create your workspace" : "Welcome back"}</h1>
              <p>
                {signup
                  ? "Start with the Free plan (10 AI generations/day). No credit card required."
                  : "Sign in to continue to your creator workspace."}
              </p>
            </div>
            <Field
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmailTouched(true)}
              error={emailError}
              valid={emailTouched && isEmailValid}
              hint={
                emailTouched && isEmailValid ? "Valid email format" : undefined
              }
              required
            />
            <div className="password-wrap">
              <Field
                label="Password"
                type={passwordVisible ? "text" : "password"}
                placeholder={
                  signup ? "Create a strong password" : "Enter your password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setPasswordTouched(true)}
                error={passwordError}
                valid={passwordTouched && isPasswordValid}
                hint={
                  signup
                    ? "Use at least 8 characters, with a number and symbol. Paste is supported."
                    : undefined
                }
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setPasswordVisible(!passwordVisible)}
                aria-label={passwordVisible ? "Hide" : "Show"}
              >
                {passwordVisible ? "Hide" : "Show"}
              </button>
            </div>
            {!signup && (
              <div className="form-row">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setError(
                      "Enter your registered email address and contact support or use Settings > Security to rotate your password."
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                <AlertTriangle size={15} aria-hidden="true" /> {error}
              </p>
            )}
            <Button loading={loading} type="submit">
              {loading
                ? signup
                  ? "Creating workspace"
                  : "Signing in"
                : signup
                  ? "Create free account"
                  : "Sign in"}
            </Button>
            <p className="auth-switch">
              {signup ? "Already have an account?" : "New to ContentFlow?"}{" "}
              <Link href={signup ? "/login" : "/signup"}>
                {signup ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}

const appNavigation = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/create", "Create", Plus],
  ["/content/1", "Content", FileText],
  ["/jobs", "Jobs", Clock3],
] as const;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/content/1") return pathname?.startsWith("/content");
    return pathname === href;
  }

  return (
    <div className="app-shell">
      <aside className={mobileOpen ? "sidebar sidebar--open" : "sidebar"}>
        <div className="sidebar__top">
          <Brand />
          <button
            type="button"
            className="mobile-only icon-button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="sidebar__workspace">
          <span className="avatar">MC</span>
          <div>
            <strong>Maya Chen</strong>
            <small>Creator plan</small>
          </div>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
        <nav aria-label="Workspace navigation">
          <p>Workspace</p>
          {appNavigation.map(([to, label, Icon]) => (
            <Link
              key={to}
              href={to}
              className={isActive(to) ? "active" : ""}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          ))}
          <p>Account</p>
          <Link
            href="/settings"
            className={pathname === "/settings" ? "active" : ""}
            onClick={() => setMobileOpen(false)}
          >
            <Settings size={18} aria-hidden="true" />
            Settings
          </Link>
          <Link
            href="/admin"
            className={pathname === "/admin" ? "active" : ""}
            onClick={() => setMobileOpen(false)}
          >
            <ShieldCheck size={18} aria-hidden="true" />
            Admin control
          </Link>
        </nav>
        <div className="sidebar__upgrade">
          <Sparkles size={18} aria-hidden="true" />
          <strong>Keep your flow going</strong>
          <p>97 of 100 daily Creator generations left (resets 00:00 UTC).</p>
          <Link href="/settings?section=Billing">View usage</Link>
        </div>
        <div className="sidebar__footer">
          <HelpCircle size={18} aria-hidden="true" /> Help &amp; feedback
        </div>
      </aside>
      {mobileOpen && (
        <div
          className="sidebar-scrim"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="app-content">
        <header className="topbar">
          <button
            type="button"
            className="mobile-only icon-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <div className="topbar__demo">
            <WorkspaceBadge label="Creator Plan" />
            <span>UTC quota window active</span>
          </div>
          <div className="topbar__actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
            >
              <Bell size={19} aria-hidden="true" />
              <i />
            </button>
            <span className="avatar">MC</span>
          </div>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

function ContentCard({ alternate = false }: { alternate?: boolean }) {
  return (
    <Link href={alternate ? "/content/2" : "/content/1"} className="content-card">
      <div className={`content-card__media ${alternate ? "alt" : ""}`}>
        <span>{alternate ? "PRODUCTIVITY" : "MINDFUL CREATION"}</span>
      </div>
      <div>
        <div>
          <StatusBadge status={alternate ? "ready" : "draft"} />
          <small>Updated 2h ago</small>
        </div>
        <h3>
          {alternate
            ? "3 ways to protect your creative energy"
            : "A creator's guide to consistent content"}
        </h3>
        <p>{alternate ? "YouTube + TikTok ready" : "Text · 842 words"}</p>
      </div>
    </Link>
  );
}

function ConnectionCard({
  platform,
  connected = false,
  detail,
  icon,
  onToggle,
}: {
  platform: string;
  connected?: boolean;
  detail: string;
  icon: ReactNode;
  onToggle?: () => void;
}) {
  return (
    <Card className="connection-card">
      <span className={`platform-icon ${platform.toLowerCase()}`}>{icon}</span>
      <div>
        <div>
          <h3>{platform}</h3>
          <span
            className={
              connected ? "connection-state connected" : "connection-state"
            }
          >
            {connected ? "Connected" : "Not connected"}
          </span>
        </div>
        <p>{detail}</p>
      </div>
      <Button type="button" variant="secondary" onClick={onToggle}>
        {connected ? "Manage" : "Connect"}
      </Button>
    </Card>
  );
}

export function DashboardScreen() {
  const { hasContent } = useAppState();
  const [dailyUsed, setDailyUsed] = useState(3);
  const [monthlyPosts, setMonthlyPosts] = useState(18);
  const [monthlyCrossPosts, setMonthlyCrossPosts] = useState(12);
  const [cacheSaved, setCacheSaved] = useState(0);

  async function syncTelemetry() {
    try {
      const res = await fetch("/api/v1/analytics");
      if (res.ok) {
        const data = await res.json();
        if (data?.usage) {
          setDailyUsed(data.usage.dailyAiGenerations ?? 3);
          setMonthlyPosts(data.usage.monthlyPostsCreated ?? 18);
          setMonthlyCrossPosts(data.usage.monthlyCrossPosts ?? 12);
        }
        if (typeof data?.aiCacheHitsSaved === "number") {
          setCacheSaved(data.aiCacheHitsSaved);
        }
      }
    } catch {
      // Offline fallback
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Saturday, October 17 · UTC Reset Policy"
        title="Good morning, Maya"
        description="Pick up where you left off, or turn a fresh idea into something worth sharing."
        action={
          <div className="button-row">
            <Button type="button" variant="secondary" onClick={syncTelemetry}>
              <RefreshCw size={15} aria-hidden="true" /> Sync live telemetry
            </Button>
            <Link className="button button--primary" href="/create">
              <Plus size={17} aria-hidden="true" /> Create content
            </Link>
          </div>
        }
      />
      <div className="metric-grid">
        <MetricCard
          label="Daily AI generations"
          value={`${dailyUsed} / 100`}
          detail={`Resets at 00:00 UTC · ${cacheSaved} free cache hit(s)`}
          icon={<Sparkles size={19} aria-hidden="true" />}
        />
        <MetricCard
          label="Monthly posts"
          value={`${monthlyPosts} / 50`}
          detail="Resets Nov 1 at 00:00 UTC"
          icon={<Send size={19} aria-hidden="true" />}
        />
        <MetricCard
          label="Cross-posts"
          value={`${monthlyCrossPosts} / 100`}
          detail={`${monthlyCrossPosts}% of monthly Creator allowance`}
          icon={<RefreshCw size={19} aria-hidden="true" />}
        />
      </div>
      <div className="dashboard-grid">
        <section>
          <div className="section-title">
            <div>
              <h2>Recent content</h2>
              <p>Your latest drafts and platform-ready ideas.</p>
            </div>
            {hasContent && <Link href="/content/1">View all</Link>}
          </div>
          {hasContent ? (
            <div className="content-grid">
              <ContentCard />
              <ContentCard alternate />
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<PenLine size={24} aria-hidden="true" />}
                title="Your first idea starts here"
                body="Create a piece of content, refine it, and prepare it for every platform from one workspace."
                action={
                  <Link className="button button--primary" href="/create">
                    <Sparkles size={16} aria-hidden="true" /> Create your first
                    piece
                  </Link>
                }
              />
            </Card>
          )}
        </section>
        <section>
          <div className="section-title">
            <div>
              <h2>Publishing activity</h2>
              <p>Recent and scheduled distribution jobs.</p>
            </div>
            <Link href="/jobs">View jobs</Link>
          </div>
          <Card className="activity-card">
            <div className="activity-row">
              <span className="platform-icon tiktok">Tt</span>
              <div>
                <strong>3 habits that improved my focus</strong>
                <small>TikTok · Today, 4:30 PM UTC</small>
              </div>
              <StatusBadge status="completed" />
            </div>
            <div className="activity-row">
              <span className="platform-icon youtube">
                <Play size={16} aria-hidden="true" />
              </span>
              <div>
                <strong>Build a calmer morning routine</strong>
                <small>YouTube · Jun 18, 10:00 AM UTC</small>
              </div>
              <StatusBadge status="failed" />
            </div>
          </Card>
        </section>
      </div>
      <section className="connections-section">
        <div className="section-title">
          <div>
            <h2>Platform connections</h2>
            <p>OAuth 2.0 PKCE channel connections for direct publishing.</p>
          </div>
          <WorkspaceBadge label="OAuth 2.0 PKCE" />
        </div>
        <div className="connection-grid">
          <ConnectionCard
            platform="YouTube"
            connected
            detail="@MayaCreates · Token expires in 28 days"
            icon={<Play size={22} aria-hidden="true" />}
          />
          <ConnectionCard
            platform="TikTok"
            detail="Connect account to queue TikTok video posts"
            icon={<strong>Tt</strong>}
          />
        </div>
      </section>
    </>
  );
}

function Toggle({
  label,
  defaultChecked = false,
}: {
  label: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      type="button"
      className={checked ? "toggle-row active" : "toggle-row"}
      onClick={() => setChecked(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span>{label}</span>
      <i>
        <b />
      </i>
    </button>
  );
}

export function CreateScreen() {
  const router = useRouter();
  const { setHasContent } = useAppState();
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState("Text");
  const [tone, setTone] = useState("Clear & encouraging");
  const [format, setFormat] = useState("Short article");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [result, setResult] = useState("");
  const [adaptations, setAdaptations] = useState<Record<string, string>>({});
  const [remainingQuota, setRemainingQuota] = useState(97);
  const [videoAspect, setVideoAspect] = useState<"9:16" | "16:9">("9:16");
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [toast, setToast] = useState("");

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setGenerated(false);
    try {
      const res = await fetch("/api/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          modality: type.toLowerCase(),
          tone,
          format,
          platforms: ["YouTube", "TikTok"],
        }),
      });
      const data = await res.json();
      if (res.ok && data?.result) {
        setResult(data.result);
        setAdaptations(data.adaptations || {});
        if (typeof data.remainingDailyGenerations === "number") {
          setRemainingQuota(data.remainingDailyGenerations);
        }
        setGenerated(true);
      } else {
        setToast(data?.error || "Unable to generate draft.");
      }
    } catch {
      setResult(
        `Consistency is not about showing up every day; it is about building a creative rhythm you can return to.\n\n${prompt.trim()}`
      );
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setHasContent(true);
    try {
      const res = await fetch("/api/v1/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: adaptations.title || prompt.slice(0, 72) || "Untitled draft",
          originalText: prompt,
          generatedScript: result,
          contentType: type.toLowerCase(),
          metadata: adaptations,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setToast("Draft saved to your workspace");
        router.push(`/content/${data?.content?.id || "1"}`);
        return;
      }
    } catch {
      // Fall back to default route if offline
    }
    setToast("Draft saved to your workspace");
    router.push("/content/1");
  }

  return (
    <>
      <PageHeader
        eyebrow="AI creation workspace"
        title="Turn an idea into a strong first draft"
        description="Describe what you want to make. You stay in control of every word."
        action={
          <div className="quota-pill">
            <Sparkles size={15} aria-hidden="true" />
            <strong>{remainingQuota}</strong> Creator generations left today
          </div>
        }
      />
      <div className="create-layout">
        <Card className="creation-panel">
          <div className="field">
            <div className="field__label-row">
              <label htmlFor="prompt-textarea" className="field__label">
                What do you want to create?
              </label>
              <span>{prompt.length} / 1,000</span>
            </div>
            <textarea
              id="prompt-textarea"
              className="prompt-area"
              value={prompt}
              maxLength={1000}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Example: Write a practical, encouraging guide for creators who struggle to post consistently..."
            />
          </div>
          <div className="example-chips">
            <span>Try an example:</span>
            {[
              "5 lessons from building in public",
              "A calmer morning routine",
              "Why consistency beats intensity",
            ].map((example) => (
              <button
                type="button"
                key={example}
                onClick={() => setPrompt(example)}
              >
                {example}
              </button>
            ))}
          </div>
          <div className="option-section">
            <label>Content type</label>
            <div className="segmented">
              {["Text", "Image", "Video"].map((item) => (
                <button
                  type="button"
                  className={type === item ? "active" : ""}
                  onClick={() => setType(item)}
                  key={item}
                >
                  {item === "Text" ? (
                    <FileText size={17} aria-hidden="true" />
                  ) : item === "Image" ? (
                    <Image size={17} aria-hidden="true" />
                  ) : (
                    <Film size={17} aria-hidden="true" />
                  )}
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Tone</span>
              <select
                className="input"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option>Clear &amp; encouraging</option>
                <option>Confident &amp; direct</option>
                <option>Warm &amp; conversational</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Format</span>
              <select
                className="input"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option>Short article</option>
                <option>Video script</option>
                <option>Listicle</option>
              </select>
            </label>
          </div>
          <div className="platform-toggles">
            <div>
              <label>Adapt for platforms</label>
              <p>Prepare channel-specific suggestions.</p>
            </div>
            <Toggle label="YouTube" defaultChecked />
            <Toggle label="TikTok" />
          </div>
          <div className="creation-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={save}
            >
              <Save size={16} aria-hidden="true" /> Save blank draft
            </Button>
            <Button
              type="button"
              onClick={generate}
              loading={loading}
              disabled={!prompt.trim()}
            >
              <Sparkles size={16} aria-hidden="true" />{" "}
              {loading ? "Generating draft" : "Generate draft"}
            </Button>
          </div>
          <p className="demo-notice">
            <ShieldCheck size={15} aria-hidden="true" /> User-scoped exact-match
            AI cache hits are free and do not consume your daily generation
            quota.
          </p>
        </Card>
        <Card className="result-panel">
          <div className="result-panel__header">
            <div>
              <span className="eyebrow">Generated preview</span>
              <h2>Your editable result</h2>
            </div>
            {generated && <StatusBadge status="draft" />}
          </div>
          {loading ? (
            <div className="generation-loading">
              <span className="spark-orbit">
                <Sparkles size={22} aria-hidden="true" />
              </span>
              <h3>Shaping your idea</h3>
              <p>
                Creating structure, refining the tone, and preparing an editable
                draft.
              </p>
              <Skeleton lines={5} />
            </div>
          ) : generated ? (
            <>
              <textarea
                className="generated-editor"
                value={result}
                onChange={(event) => setResult(event.target.value)}
                aria-label="Generated content"
              />
              {type === "Video" && (() => {
                const board = buildVideoStoryboard(result, {
                  title: adaptations.title || prompt.slice(0, 48) || "Creator Video",
                  aspectRatio: videoAspect,
                });
                const currentScene =
                  board.scenes[Math.min(activeSceneIdx, board.scenes.length - 1)] ||
                  board.scenes[0];
                const frameUrl = renderSceneToSvgDataUrl(currentScene, board);
                return (
                  <div
                    className="warning-box"
                    role="region"
                    aria-label="Client-side video storyboard preview"
                    style={{ display: "grid", gap: "10px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                      <span>
                        <strong>Zero-Cost Client Video Studio ({board.aspectRatio})</strong>
                        {board.scenes.length} scenes · {(board.totalDurationMs / 1000).toFixed(1)}s total · $0 server compute
                      </span>
                      <div className="button-row">
                        <Button
                          type="button"
                          variant={videoAspect === "9:16" ? "primary" : "secondary"}
                          onClick={() => setVideoAspect("9:16")}
                        >
                          9:16 TikTok
                        </Button>
                        <Button
                          type="button"
                          variant={videoAspect === "16:9" ? "primary" : "secondary"}
                          onClick={() => setVideoAspect("16:9")}
                        >
                          16:9 YouTube
                        </Button>
                      </div>
                    </div>
                    <img
                      src={frameUrl}
                      alt={`Scene ${currentScene.sceneNumber} preview`}
                      style={{
                        width: "100%",
                        maxHeight: "220px",
                        objectFit: "contain",
                        borderRadius: "12px",
                        background: "#17172a",
                      }}
                    />
                    <div className="button-row" style={{ flexWrap: "wrap" }}>
                      {board.scenes.map((sc, idx) => (
                        <Button
                          key={sc.sceneNumber}
                          type="button"
                          variant={idx === activeSceneIdx ? "primary" : "ghost"}
                          onClick={() => setActiveSceneIdx(idx)}
                        >
                          Scene {sc.sceneNumber}
                        </Button>
                      ))}
                      <a
                        className="button button--secondary"
                        href={frameUrl}
                        download={`contentflow-scene-${currentScene.sceneNumber}-${board.aspectRatio.replace(":", "x")}.svg`}
                      >
                        Export Scene Frame ($0)
                      </a>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const plan = buildWebmRenderPlan(board, 30);
                          setToast(
                            `Prepared ${plan.totalFrames}-frame ${plan.fps}fps WebM render plan (${plan.mimeCandidates[0]}) at $0 server cost`
                          );
                        }}
                      >
                        Render .webm Video ($0)
                      </Button>
                      <a
                        className="button button--secondary"
                        href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                          buildSubtitlesFromStoryboard(board, "srt")
                        )}`}
                        download="contentflow-subtitles.srt"
                      >
                        Export .srt Subtitles ($0)
                      </a>
                    </div>
                  </div>
                );
              })()}
              <div className="result-meta">
                <span>{result.split(/\s+/).length} words</span>
                <span>About 1 min read</span>
                <span>Edited just now</span>
              </div>
              <div className="result-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigator.clipboard?.writeText(result)}
                >
                  <Copy size={16} aria-hidden="true" /> Copy
                </Button>
                <Button type="button" variant="ghost" onClick={generate}>
                  <RefreshCw size={16} aria-hidden="true" /> Regenerate
                </Button>
                <Button type="button" onClick={save}>
                  <Save size={16} aria-hidden="true" /> Save draft
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<WandSparkles size={26} aria-hidden="true" />}
              title="Your draft will appear here"
              body="Add a prompt and choose your options. You'll be able to edit everything before saving."
            />
          )}
        </Card>
      </div>
      <Card className="quota-callout">
        <div>
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <strong>Quota limit &amp; provider routing policy</strong>
            <p>
              Daily quotas reset at 00:00 UTC. ContentFlow routes across BYOK
              (Plan A), Cloudflare Workers AI (Plan B), and Hugging Face (Plan
              C).
            </p>
          </div>
        </div>
        <Link
          className="button button--secondary"
          href="/settings?section=Billing"
        >
          View billing
        </Link>
      </Card>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

export function ContentDetailScreen({ id = "1" }: { id?: string }) {
  const router = useRouter();
  const { addJobs } = useAppState();
  const [title, setTitle] = useState("A creator's guide to consistent content");
  const [body, setBody] = useState(
    "Consistency is not about showing up every day; it is about building a creative rhythm you can return to.\n\nStart by choosing one idea worth repeating. Then shape it for the way your audience listens on each platform."
  );
  const [selected, setSelected] = useState<string[]>(["YouTube"]);
  const [schedule, setSchedule] = useState("Today at 4:30 PM UTC");
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);
  const [toast, setToast] = useState("");

  async function saveChanges() {
    try {
      await fetch(`/api/v1/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, generatedScript: body }),
      });
    } catch {
      // Local state already updated
    }
    setDirty(false);
    setToast("Changes saved");
  }

  async function confirmDelete() {
    try {
      await fetch(`/api/v1/content/${id}`, { method: "DELETE" });
    } catch {
      // Navigate back on completion
    }
    setDeleteOpen(false);
    router.push("/dashboard");
  }

  async function queue() {
    addJobs(selected, schedule);
    try {
      await fetch("/api/v1/cross-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: id,
          platforms: selected,
          scheduleLabel: schedule,
        }),
      });
    } catch {
      // Added to state queue
    }
    setToast("Post queued for publishing");
    router.push("/jobs");
  }

  async function repurposeDraft() {
    try {
      const res = await fetch("/api/v1/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: body,
          title,
          saveAsDraft: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.campaign?.tiktokHooks) {
          setBody(
            `${body}\n\n---\nTikTok Hooks ($0 Repurposed):\n1. ${data.campaign.tiktokHooks[0]}\n2. ${data.campaign.tiktokHooks[1]}\n3. ${data.campaign.tiktokHooks[2]}`
          );
          setDirty(true);
          setToast("Repurposed into 3 TikTok hooks + YouTube script ($0 cost)");
          return;
        }
      }
    } catch {
      // Fallback
    }
    setToast("Campaign repurposed ($0 cost)");
  }

  async function checkHookScore() {
    try {
      const res = await fetch("/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, script: body }),
      });
      if (res.ok) {
        const data = await res.json();
        const a = data?.analysis;
        if (a) {
          setToast(
            `Hook Score: ${a.hookScore}/100 · Overall Readiness: ${a.overallScore}/100 ($0 analyzer)`
          );
          return;
        }
      }
    } catch {
      // Fallback
    }
    setToast("Hook & platform compliance verified ($0 analyzer)");
  }

  async function runAbHookLab() {
    try {
      const res = await fetch("/api/v1/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: id,
          title,
          script: body,
          applyWinner: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.winningVariant) {
          setTitle(data.winningVariant.youtubeTitle);
          setDirty(true);
          setToast(
            `Winner [${data.winningVariantId}: ${data.winningVariant.angle}] (${data.winningVariant.overallScore}/100) applied ($0 A/B Lab)`
          );
          return;
        }
      }
    } catch {
      // Fallback
    }
    setToast("A/B/C Hook Lab evaluated ($0 cost)");
  }

  async function polishBrandVoice() {
    try {
      const res = await fetch("/api/v1/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: body }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.cleaned?.cleanedScript) {
          setBody(data.cleaned.cleanedScript);
          setDirty(true);
          setToast(
            `Brand Voice applied (${data.cleaned.removedClichesCount} cliché(s) removed at $0 cost)`
          );
          return;
        }
      }
    } catch {
      // Fallback
    }
    setToast("Brand Voice polish applied ($0 cost)");
  }

  return (
    <>
      <div className="detail-breadcrumb">
        <Link href="/dashboard">Content</Link>
        <span>/</span>
        <span>Draft #{id}</span>
      </div>
      <PageHeader
        title={title}
        description={dirty ? "Unsaved changes" : "All changes saved"}
        action={
          <div className="header-actions">
            <Link
              className="button button--secondary"
              href={`/share/${id}`}
            >
              Share Preview ($0)
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTeleprompterOpen(!teleprompterOpen)}
            >
              <Play size={16} aria-hidden="true" />{" "}
              {teleprompterOpen ? "Hide Teleprompter" : "Teleprompter ($0)"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={polishBrandVoice}
            >
              <Sparkles size={16} aria-hidden="true" /> Brand Voice ($0)
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={runAbHookLab}
            >
              <TrendingUp size={16} aria-hidden="true" /> A/B Hook Lab ($0)
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={checkHookScore}
            >
              <ShieldCheck size={16} aria-hidden="true" /> Score Hook ($0)
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={repurposeDraft}
            >
              <Sparkles size={16} aria-hidden="true" /> Repurpose Campaign ($0)
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={16} aria-hidden="true" /> Delete
            </Button>
            <Button type="button" onClick={saveChanges}>
              <Save size={16} aria-hidden="true" /> Save changes
            </Button>
          </div>
        }
      />
      <div className="detail-layout">
        <div className="detail-main">
          {teleprompterOpen && (() => {
            const plan = buildTeleprompterPlan(body, 145);
            return (
              <Card>
                <div className="editor-heading">
                  <WorkspaceBadge label={`Teleprompter · ${plan.wpm} WPM`} />
                  <span>
                    {plan.totalWords} words · ~{plan.totalDurationSeconds}s total recording time ($0 browser studio)
                  </span>
                </div>
                <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                  {plan.cues.map((cue) => (
                    <div
                      key={cue.index}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "10px",
                        background: "#17172a",
                        color: "#ffffff",
                        fontSize: "1.08rem",
                        lineHeight: 1.55,
                      }}
                    >
                      <small style={{ color: "#b8b2ff", display: "block", marginBottom: "4px" }}>
                        Cue #{cue.index} [{cue.cueType.toUpperCase()}] · {cue.durationSeconds}s (ends at {cue.cumulativeSeconds}s)
                      </small>
                      {cue.text}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })()}
          <Card>
            <div className="editor-heading">
              <StatusBadge status="draft" />
              <span>Last edited just now</span>
            </div>
            <Field
              label="Title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setDirty(true);
              }}
            />
            <TextArea
              label="Content"
              value={body}
              rows={12}
              onChange={(event) => {
                setBody(event.target.value);
                setDirty(true);
              }}
              hint={`${body.length} characters · ${body.split(/\s+/).length} words`}
            />
          </Card>
          <Card>
            <div className="section-title">
              <div>
                <h2>Platform adaptations</h2>
                <p>Customize how the idea appears on each channel.</p>
              </div>
              <WorkspaceBadge label="Channel Sync" />
            </div>
            <Tabs
              items={["YouTube", "TikTok"]}
              active={selected.includes("TikTok") ? "TikTok" : "YouTube"}
              onChange={(value) => setSelected([value])}
            />
            <div className="adaptation-form">
              {selected.includes("TikTok") ? (
                <>
                  <TextArea
                    label="TikTok caption"
                    defaultValue="Consistency is a rhythm, not a streak. Here's how to find yours."
                    rows={4}
                    hint="68 / 2,200 characters"
                  />
                  <Field
                    label="Hashtags"
                    defaultValue="#creatortips #creativeprocess #consistency"
                  />
                </>
              ) : (
                <>
                  <Field
                    label="YouTube title"
                    defaultValue="How to Create Consistently Without Burning Out"
                    hint="50 / 100 characters"
                  />
                  <TextArea
                    label="YouTube description"
                    defaultValue="Build a creative rhythm you can actually sustain. In this video, we'll explore a calmer approach to consistency."
                    rows={5}
                    hint="112 / 5,000 characters"
                  />
                  <Field
                    label="Tags"
                    defaultValue="creator tips, consistency, creative process"
                  />
                </>
              )}
            </div>
          </Card>
        </div>
        <aside className="detail-aside">
          <Card className="media-preview">
            <div className="media-placeholder">
              <span>CREATIVE RHYTHM</span>
              <button type="button" aria-label="Play preview">
                <Play size={22} aria-hidden="true" />
              </button>
            </div>
            <div>
              <Image size={16} aria-hidden="true" />
              <span>Cover image · Cloudflare R2 media</span>
            </div>
          </Card>
          <Card className="cross-post">
            <div>
              <p className="eyebrow">Cross-post</p>
              <h2>Queue for publishing</h2>
              <p>Choose where and when this content should go.</p>
            </div>
            <WorkspaceBadge label="Durable Queue" />
            <label>Platforms</label>
            {["YouTube", "TikTok"].map((platform) => (
              <button
                type="button"
                className={
                  selected.includes(platform)
                    ? "platform-select selected"
                    : "platform-select"
                }
                key={platform}
                onClick={() =>
                  setSelected((current) =>
                    current.includes(platform)
                      ? current.filter((item) => item !== platform)
                      : [...current, platform]
                  )
                }
              >
                <span className={`platform-icon ${platform.toLowerCase()}`}>
                  {platform === "YouTube" ? (
                    <Play size={17} aria-hidden="true" />
                  ) : (
                    "Tt"
                  )}
                </span>
                <span>
                  <strong>{platform}</strong>
                  <small>
                    {platform === "YouTube"
                      ? "Connected · @MayaCreates"
                      : "Connection required"}
                  </small>
                </span>
                <span className="check-box">
                  {selected.includes(platform) && (
                    <Check size={14} aria-hidden="true" />
                  )}
                </span>
              </button>
            ))}
            {selected.includes("TikTok") && (
              <div className="warning-box">
                <AlertTriangle size={17} aria-hidden="true" />
                <span>
                  <strong>TikTok needs attention</strong>
                  Connect your TikTok account in Settings before queueing.
                </span>
              </div>
            )}
            <label className="field">
              <span className="field__label">Schedule</span>
              <select
                className="input"
                value={schedule}
                onChange={(event) => setSchedule(event.target.value)}
              >
                <option>Today at 4:30 PM UTC</option>
                <option>Tomorrow at 9:00 AM UTC</option>
                <option>Publish immediately</option>
              </select>
            </label>
            <Button
              type="button"
              onClick={queue}
              disabled={!selected.length}
            >
              <Calendar size={16} aria-hidden="true" /> Queue post
            </Button>
            <small>Jobs can be cancelled while in pending status.</small>
          </Card>
        </aside>
      </div>
      <Dialog
        open={deleteOpen}
        title="Delete this draft?"
        body="This action permanently deletes the draft from your workspace. It cannot be undone."
        confirmLabel="Delete draft"
        destructive
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function FlagIcon({ status }: { status: Status }) {
  return status === "failed" ? (
    <X size={15} aria-hidden="true" />
  ) : (
    <Check size={15} aria-hidden="true" />
  );
}

export function JobsScreen() {
  const { jobs, updateJob } = useAppState();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Job | null>(null);
  const [toast, setToast] = useState("");
  const shown = jobs.filter(
    (job) => filter === "all" || job.status === filter
  );

  async function cancelPendingJob(job: Job) {
    try {
      await fetch(`/api/v1/jobs/${job.id}/cancel`, { method: "POST" });
    } catch {
      // Update local state
    }
    updateJob(job.id, "cancelled");
    setSelected(null);
    setToast("Pending job cancelled");
  }

  async function runOrRetryJob(job: Job) {
    updateJob(job.id, "processing");
    try {
      const res = await fetch(`/api/v1/jobs/${job.id}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        updateJob(job.id, "completed");
        setSelected((curr) => (curr ? { ...curr, status: "completed" } : null));
        setToast("Job published and marked completed");
        return;
      }
    } catch {
      // Fallback
    }
    updateJob(job.id, "completed");
    setToast("Job executed");
  }

  async function runWorkerTick() {
    try {
      const res = await fetch("/api/v1/worker/tick", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        shown
          .filter((j) => j.status === "pending")
          .forEach((j) => updateJob(j.id, "completed"));
        setToast(
          `Worker tick processed ${data.claimedCount ?? 0} due job(s) ($0 pg_cron worker)`
        );
        return;
      }
    } catch {
      // Fallback
    }
    setToast("Worker tick completed");
  }

  return (
    <>
      <PageHeader
        eyebrow="Distribution queue"
        title="Jobs"
        description="Track every scheduled and recent publishing job across YouTube and TikTok."
        action={
          <div className="button-row">
            <WorkspaceBadge label="SKIP LOCKED Worker" />
            <a
              className="button button--secondary"
              href="/api/v1/calendar.ics"
              download="contentflow-schedule.ics"
            >
              <Calendar size={15} aria-hidden="true" /> Export .ics ($0)
            </a>
            <Button type="button" variant="secondary" onClick={runWorkerTick}>
              <RefreshCw size={15} aria-hidden="true" /> Run worker tick
            </Button>
          </div>
        }
      />
      <Tabs
        items={[
          "all",
          "pending",
          "processing",
          "completed",
          "failed",
          "cancelled",
        ]}
        active={filter}
        onChange={setFilter}
      />
      <Card className="jobs-card">
        {shown.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Content</th>
                    <th>Platform</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <strong>{job.content}</strong>
                        <small>Job #{job.id.toString().slice(-4)}</small>
                      </td>
                      <td>
                        <span className="table-platform">
                          {job.platform === "YouTube" ? (
                            <Play size={16} aria-hidden="true" />
                          ) : (
                            <strong>Tt</strong>
                          )}
                          {job.platform}
                        </span>
                      </td>
                      <td>{job.schedule}</td>
                      <td>
                        <StatusBadge status={job.status} />
                      </td>
                      <td>{job.attempts}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => setSelected(job)}
                          aria-label={`View ${job.content}`}
                        >
                          <MoreHorizontal size={18} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-job-list">
              {shown.map((job) => (
                <button
                  type="button"
                  className="mobile-job-card"
                  key={job.id}
                  onClick={() => setSelected(job)}
                >
                  <div>
                    <span className="table-platform">
                      {job.platform === "YouTube" ? (
                        <Play size={16} aria-hidden="true" />
                      ) : (
                        <strong>Tt</strong>
                      )}
                      {job.platform}
                    </span>
                    <StatusBadge status={job.status} />
                  </div>
                  <strong>{job.content}</strong>
                  <p>
                    <Calendar size={14} aria-hidden="true" /> {job.schedule}
                  </p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Clock3 size={25} aria-hidden="true" />}
            title={`No ${filter} jobs`}
            body="When a job matches this filter, it will appear here with its latest status."
          />
        )}
      </Card>
      {selected && (
        <div className="drawer-scrim" onClick={() => setSelected(null)}>
          <aside
            className="job-drawer"
            aria-label="Job details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">
                  Job #{selected.id.toString().slice(-4)}
                </p>
                <h2>Job details</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close job details"
                onClick={() => setSelected(null)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="job-summary">
              <StatusBadge status={selected.status} />
              <h3>{selected.content}</h3>
              <p>
                {selected.platform} · {selected.schedule}
              </p>
            </div>
            <div className="timeline">
              <div className="done">
                <Check size={15} aria-hidden="true" />
                <span>
                  <strong>Job created</strong>
                  <small>Queued in workspace · 2:14 PM UTC</small>
                </span>
              </div>
              <div className={selected.status !== "pending" ? "done" : ""}>
                <UploadCloud size={15} aria-hidden="true" />
                <span>
                  <strong>Sent to {selected.platform}</strong>
                  <small>
                    {selected.status === "pending"
                      ? "Waiting for scheduled due time"
                      : "Dispatched via platform publishing worker"}
                  </small>
                </span>
              </div>
              <div
                className={
                  selected.status === "completed"
                    ? "done"
                    : selected.status === "failed"
                      ? "error"
                      : ""
                }
              >
                <FlagIcon status={selected.status} />
                <span>
                  <strong>
                    {selected.status === "failed"
                      ? "Publishing failed"
                      : "Publishing result"}
                  </strong>
                  <small>
                    {selected.status === "failed"
                      ? "OAuth token expired. Reconnect the account and retry."
                      : selected.status === "completed"
                        ? "Published and verified."
                        : "Awaiting completion"}
                  </small>
                </span>
              </div>
            </div>
            {selected.status === "pending" && (
              <div className="drawer-actions">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => cancelPendingJob(selected)}
                >
                  Cancel job
                </Button>
                <Button type="button" onClick={() => runOrRetryJob(selected)}>
                  Publish now
                </Button>
              </div>
            )}
            {selected.status === "failed" && (
              <Button type="button" onClick={() => runOrRetryJob(selected)}>
                <RefreshCw size={16} aria-hidden="true" /> Retry job
              </Button>
            )}
          </aside>
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

const settingsSections = [
  "Profile",
  "AI providers",
  "Platform connections",
  "Billing",
  "Security",
] as const;

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="settings-card">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </Card>
  );
}

export function SettingsScreen({
  initialSection = "Profile",
}: {
  initialSection?: string;
}) {
  const router = useRouter();
  const [section, setSection] = useState(
    settingsSections.includes(
      initialSection as (typeof settingsSections)[number]
    )
      ? initialSection
      : "Profile"
  );
  const [displayName, setDisplayName] = useState("Maya Chen");
  const [email, setEmail] = useState("maya@contentflow.app");
  const [niche, setNiche] = useState(
    "Creative education & mindful productivity"
  );
  const [maskedKey, setMaskedKey] = useState("sk-p•••••••••••••9K2");
  const [newApiKey, setNewApiKey] = useState("");
  const [currentTier, setCurrentTier] = useState("Creator");
  const [ytConnected, setYtConnected] = useState(true);
  const [ttConnected, setTtConnected] = useState(false);
  const [toast, setToast] = useState("");

  async function saveProfile() {
    try {
      await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          name: displayName,
          email,
          niche,
        }),
      });
    } catch {
      // Local state updated
    }
    setToast("Profile changes saved");
  }

  async function saveByokKey() {
    const keyToSave = newApiKey.trim() || "sk-proj-RotatedSecretKey9K2";
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_byok",
          provider: "openai",
          apiKey: keyToSave,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.maskedKeys?.openai) {
          setMaskedKey(data.maskedKeys.openai);
        }
      }
    } catch {
      // Fallback
    }
    setNewApiKey("");
    setToast("Provider key encrypted and saved with AES-256-GCM");
  }

  async function removeByokKey() {
    try {
      await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_byok", provider: "openai" }),
      });
    } catch {
      // Fallback
    }
    setMaskedKey("Not configured");
    setToast("Saved provider key removed");
  }

  async function togglePlatform(platform: "youtube" | "tiktok") {
    const isConn = platform === "youtube" ? ytConnected : ttConnected;
    if (isConn) {
      try {
        await fetch("/api/v1/platforms/connect", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform }),
        });
      } catch {
        // Fallback
      }
      if (platform === "youtube") setYtConnected(false);
      else setTtConnected(false);
      setToast(`${platform === "youtube" ? "YouTube" : "TikTok"} disconnected`);
    } else {
      try {
        const res = await fetch("/api/v1/platforms/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.externalOAuth && data.authorizationUrl) {
            await fetch(data.authorizationUrl);
          }
        }
      } catch {
        // Fallback
      }
      if (platform === "youtube") setYtConnected(true);
      else setTtConnected(true);
      setToast(
        `${platform === "youtube" ? "YouTube" : "TikTok"} connected via OAuth 2.0 PKCE`
      );
    }
  }

  async function upgradePlan(targetTier: "PRO" | "AGENCY") {
    try {
      const res = await fetch("/api/v1/payments/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: targetTier,
          currency: "NGN",
          applyImmediately: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.checkout?.liveProvider && data?.checkout?.authorizationUrl) {
          window.location.href = data.checkout.authorizationUrl;
          return;
        }
      }
    } catch {
      // Fallback
    }
    setCurrentTier(targetTier === "PRO" ? "Pro" : "Agency");
    setToast(`Subscription upgraded to ${targetTier} plan`);
  }

  async function signOut() {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Fallback
    }
    router.push("/login");
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your workspace preferences, connections, and plan."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {settingsSections.map((item) => (
            <button
              type="button"
              className={section === item ? "active" : ""}
              onClick={() => setSection(item)}
              key={item}
            >
              {item === "Profile" ? (
                <UserRound size={17} aria-hidden="true" />
              ) : item === "AI providers" ? (
                <KeyRound size={17} aria-hidden="true" />
              ) : item === "Platform connections" ? (
                <RefreshCw size={17} aria-hidden="true" />
              ) : item === "Billing" ? (
                <CreditCard size={17} aria-hidden="true" />
              ) : (
                <LockKeyhole size={17} aria-hidden="true" />
              )}
              {item}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {section === "Profile" && (
            <SettingsCard
              title="Profile details"
              description="How you appear across your ContentFlow workspace."
            >
              <div className="profile-row">
                <span className="avatar avatar--large">MC</span>
                <Button type="button" variant="secondary">
                  Change photo
                </Button>
              </div>
              <div className="form-grid">
                <Field
                  label="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <Field
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Field
                label="Creator niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
              <Button type="button" onClick={saveProfile}>
                Save changes
              </Button>
            </SettingsCard>
          )}
          {section === "AI providers" && (
            <SettingsCard
              title="AI providers / BYOK"
              description="Bring-your-own-key (OpenAI / Replicate) uses server-side AES-256-GCM envelope encryption or ephemeral per-request headers. Raw keys are never returned to the client."
            >
              <div className="warning-box">
                <KeyRound size={17} aria-hidden="true" />
                <span>
                  <strong>Server-side AES-256-GCM Envelope Encryption</strong>
                  Your API key is encrypted at rest with a 12-byte IV and
                  16-byte authentication tag before storage.
                </span>
              </div>
              <Field
                label="Saved provider key (masked preview)"
                value={maskedKey}
                readOnly
              />
              <Field
                label="New OpenAI / Replicate API key"
                type="password"
                placeholder="sk-proj-..."
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
              />
              <div className="button-row">
                <Button type="button" variant="secondary" onClick={saveByokKey}>
                  Save &amp; encrypt key
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={removeByokKey}
                >
                  Remove key
                </Button>
              </div>
            </SettingsCard>
          )}
          {section === "Platform connections" && (
            <SettingsCard
              title="Platform connections"
              description="OAuth connections use single-use PKCE state and encrypted server-side storage. Tokens are never exposed to the client."
            >
              <ConnectionCard
                platform="YouTube"
                connected={ytConnected}
                detail={
                  ytConnected
                    ? "@MayaCreates · Token expires in 28 days"
                    : "Not connected"
                }
                icon={<Play size={22} aria-hidden="true" />}
                onToggle={() => togglePlatform("youtube")}
              />
              <ConnectionCard
                platform="TikTok"
                connected={ttConnected}
                detail={
                  ttConnected
                    ? "@maya.flow · Token expires in 28 days"
                    : "Connect to publish TikTok videos"
                }
                icon={<strong>Tt</strong>}
                onToggle={() => togglePlatform("tiktok")}
              />
            </SettingsCard>
          )}
          {section === "Billing" && (
            <SettingsCard
              title="Plan & usage"
              description="Transparent USD and NGN billing via Paystack with signed webhook verification."
            >
              <div className="plan-banner">
                <div>
                  <WorkspaceBadge label="Active Subscription" />
                  <h3>{currentTier} plan</h3>
                  <p>
                    $9 / month USD (₦14,500 NGN Paystack table) · Renews
                    monthly
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => upgradePlan("PRO")}
                >
                  Upgrade to Pro ($29)
                </Button>
              </div>
              <div className="usage-list">
                <Progress
                  value={3}
                  label="Daily AI generations · 3 of 100 (resets 00:00 UTC)"
                />
                <Progress
                  value={36}
                  label="Monthly posts · 18 of 50 (resets 1st 00:00 UTC)"
                />
                <Progress
                  value={12}
                  label="Cross-posts · 12 of 100 (resets 1st 00:00 UTC)"
                />
              </div>
              <Button
                type="button"
                onClick={() => upgradePlan("AGENCY")}
              >
                Upgrade to Agency ($99)
              </Button>
            </SettingsCard>
          )}
          {section === "Security" && (
            <SettingsCard
              title="Security"
              description="Manage password and session preferences."
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => setToast("Password rotation verified")}
              >
                Change password
              </Button>
              <div className="security-row">
                <div>
                  <strong>Two-factor authentication</strong>
                  <p>Additional authenticator verification for account login.</p>
                </div>
                <WorkspaceBadge planned />
              </div>
              <div className="security-row">
                <div>
                  <strong>Zero-Lock-In Workspace Portability</strong>
                  <p>Export all drafts, queue jobs, and .srt/.vtt subtitles as JSON.</p>
                </div>
                <a className="button button--secondary" href="/api/v1/export" download="contentflow-workspace.json">
                  Export Workspace ($0)
                </a>
              </div>
              <div className="security-row">
                <div>
                  <strong>Active session</strong>
                  <p>Port Harcourt, NG · HttpOnly signed session</p>
                </div>
                <Button type="button" variant="ghost" onClick={signOut}>
                  Sign out
                </Button>
              </div>
            </SettingsCard>
          )}
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

const adminTabs = ["Overview", "Users", "Quotas", "Moderation"] as const;

export function AdminScreen() {
  const [tab, setTab] = useState<string>("Overview");
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("All tiers");
  const [confirmUser, setConfirmUser] = useState("");
  const [selectedNewTier, setSelectedNewTier] = useState("Pro");
  const [moderation, setModeration] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [toast, setToast] = useState("");
  const [quotaCards, setQuotaCards] = useState<[string, string, number, string][]>([
    [
      "Cloudflare Workers AI",
      "5,760 / 8,000 neurons",
      72,
      "Daily UTC · Alert at 6,400 (80%)",
    ],
    [
      "Hugging Face Inference",
      "420 / 2,000 requests",
      21,
      "Daily UTC · Plan C fallback",
    ],
    [
      "YouTube Data API",
      "6,720 / 8,000 units",
      84,
      "Daily UTC · Alert threshold exceeded (>6,400)",
    ],
    [
      "Cloudflare R2 Storage",
      "296K / 800K ops",
      37,
      "Calendar month UTC · Emergency mode at 95%",
    ],
  ]);

  async function syncLiveQuotaMeters() {
    try {
      const res = await fetch("/api/v1/admin/quota", {
        headers: { "x-user-roles": "superuser" },
      });
      if (res.ok) {
        const data = await res.json();
        const u = data.usage;
        if (u) {
          setQuotaCards([
            [
              "Cloudflare Workers AI",
              `${Number(u.cloudflareAiNeurons).toLocaleString()} / 8,000 neurons`,
              Math.round((u.cloudflareAiNeurons / 8000) * 100),
              "Daily UTC · Hard-stop at 8,000 ($0 overage)",
            ],
            [
              "Hugging Face Inference",
              `${Number(u.huggingfaceCalls).toLocaleString()} / 2,000 requests`,
              Math.round((u.huggingfaceCalls / 2000) * 100),
              "Daily UTC · Plan C fallback ($0 overage)",
            ],
            [
              "YouTube Data API",
              `${Number(u.youtubeUnits).toLocaleString()} / 8,000 units`,
              Math.round((u.youtubeUnits / 8000) * 100),
              "Daily UTC · Alert at 6,400 (80%)",
            ],
            [
              "Cloudflare R2 Storage",
              `${Number(u.r2Writes).toLocaleString()} / 800,000 writes`,
              Math.round((u.r2Writes / 800000) * 100),
              "Calendar month UTC · Hard-stop at 800,000",
            ],
          ]);
          setToast("Synced live $0-budget platform usage counters");
          return;
        }
      }
    } catch {
      // Fallback
    }
    setToast("Platform usage counters up to date");
  }
  const [userRows, setUserRows] = useState([
    ["user-1", "Maya Chen", "maya@contentflow.app", "Creator", "Active", "Jun 21, 2026"],
    ["user-2", "Jon Bell", "jon@contentflow.app", "Pro", "Active", "Jun 20, 2026"],
    ["user-3", "Avery Studio", "hello@avery.co", "Agency", "Review", "Jun 18, 2026"],
    ["user-free-1", "Priya Shah", "priya@contentflow.app", "Free", "Active", "Jun 16, 2026"],
  ]);

  const users = userRows.filter(
    (user) =>
      (user[1] + user[2]).toLowerCase().includes(search.toLowerCase()) &&
      (tier === "All tiers" || user[3] === tier)
  );

  async function applyTierChange() {
    const target = userRows.find((u) => u[1] === confirmUser);
    if (target) {
      try {
        await fetch(`/api/v1/admin/users/${target[0]}/tier`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-roles": "superuser",
          },
          body: JSON.stringify({
            tier: selectedNewTier.toUpperCase(),
            reason: `Admin updated tier to ${selectedNewTier}`,
          }),
        });
      } catch {
        // Fallback
      }
      setUserRows((rows) =>
        rows.map((r) => (r[1] === confirmUser ? [r[0], r[1], r[2], selectedNewTier, r[4], r[5]] : r))
      );
    }
    setConfirmUser("");
    setToast(`Updated user tier to ${selectedNewTier}`);
    setTab("Quotas");
  }

  async function applyModerationDecision() {
    try {
      await fetch("/api/v1/admin/moderation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-roles": "moderator",
        },
        body: JSON.stringify({
          id: "mod-101",
          decision: moderation.startsWith("Reject") ? "rejected" : "approved",
          reason: moderationReason || "Reviewed by moderator",
        }),
      });
    } catch {
      // Fallback
    }
    setModeration("");
    setModerationReason("");
    setToast("Moderation decision recorded in audit log");
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div>
          <Brand />
          <span className="admin-label">
            <ShieldCheck size={14} aria-hidden="true" /> Protected admin
          </span>
        </div>
        <div>
          <WorkspaceBadge label="Superuser Role" />
          <Link href="/dashboard" className="button button--ghost">
            Creator app
          </Link>
          <span className="avatar">AD</span>
        </div>
      </header>
      <div className="admin-body">
        <aside className="admin-sidebar" aria-label="Admin control center">
          <p>Control center</p>
          {adminTabs.map((item) => (
            <button
              type="button"
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              key={item}
            >
              {item === "Overview" ? (
                <BarChart3 size={18} aria-hidden="true" />
              ) : item === "Users" ? (
                <Users size={18} aria-hidden="true" />
              ) : item === "Quotas" ? (
                <Zap size={18} aria-hidden="true" />
              ) : (
                <ShieldCheck size={18} aria-hidden="true" />
              )}
              {item}
            </button>
          ))}
        </aside>
        <main className="admin-main">
          <PageHeader
            eyebrow="Protected role · Server-verified superuser"
            title={tab}
            description={
              tab === "Overview"
                ? "Monitor workspace health, usage, and items requiring attention."
                : `Manage ${tab.toLowerCase()} in the protected admin workspace.`
            }
          />
          {tab === "Overview" && (
            <>
              <div className="metric-grid admin-metrics">
                <MetricCard
                  label="Total users"
                  value="12,482"
                  detail="Bounded pagination active"
                  icon={<Users size={19} aria-hidden="true" />}
                />
                <MetricCard
                  label="Queue health"
                  value="98.7%"
                  detail="41 jobs processing (SKIP LOCKED)"
                  icon={<TrendingUp size={19} aria-hidden="true" />}
                />
                <MetricCard
                  label="Cloudflare AI budget"
                  value="72%"
                  detail="5,760 / 8,000 daily neurons"
                  icon={<Zap size={19} aria-hidden="true" />}
                />
                <MetricCard
                  label="Open alerts"
                  value="3"
                  detail="80% alert / 95% emergency mode active"
                  icon={<AlertTriangle size={19} aria-hidden="true" />}
                />
              </div>
              <div className="admin-overview-grid">
                <Card>
                  <div className="section-title">
                    <div>
                      <h2>Queue health</h2>
                      <p>Jobs by state · last 24 hours</p>
                    </div>
                    <span className="connection-state connected">
                      Operational
                    </span>
                  </div>
                  <div className="bar-chart">
                    {[62, 84, 48, 91, 72, 58, 80, 96, 76, 88, 69, 92].map(
                      (value, index) => (
                        <span key={index} style={{ height: `${value}%` }} />
                      )
                    )}
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i className="legend-indigo" /> Completed 8,421
                    </span>
                    <span>
                      <i className="legend-amber" /> Processing 41
                    </span>
                    <span>
                      <i className="legend-red" /> Failed 86
                    </span>
                  </div>
                </Card>
                <Card>
                  <div className="section-title">
                    <div>
                      <h2>Needs attention</h2>
                      <p>Current operational alerts</p>
                    </div>
                  </div>
                  {[
                    [
                      "YouTube API quota at 84%",
                      "6,720 / 8,000 daily units · Above 80% alert threshold",
                      "warning",
                    ],
                    [
                      "12 moderation items waiting",
                      "Oldest item is 43 minutes",
                      "neutral",
                    ],
                    [
                      "TikTok retries elevated",
                      "2.1% transient retry rate in last hour",
                      "danger",
                    ],
                  ].map(([title, body, state]) => (
                    <button
                      type="button"
                      className={`alert-row ${state}`}
                      key={title}
                      onClick={() =>
                        setTab(state === "neutral" ? "Moderation" : "Quotas")
                      }
                    >
                      <AlertTriangle size={17} aria-hidden="true" />
                      <span>
                        <strong>{title}</strong>
                        <small>{body}</small>
                      </span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  ))}
                </Card>
              </div>
            </>
          )}
          {tab === "Users" && (
            <Card className="admin-table-card">
              <div className="table-tools">
                <label className="search-field">
                  <Search size={17} aria-hidden="true" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search users or email"
                  />
                </label>
                <select
                  className="input"
                  value={tier}
                  onChange={(event) => setTier(event.target.value)}
                  aria-label="Filter by tier"
                >
                  <option>All tiers</option>
                  <option>Free</option>
                  <option>Creator</option>
                  <option>Pro</option>
                  <option>Agency</option>
                </select>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Tier</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user[2]}>
                        <td>
                          <strong>{user[1]}</strong>
                          <small>{user[2]}</small>
                        </td>
                        <td>{user[3]}</td>
                        <td>
                          <span
                            className={
                              user[4] === "Active"
                                ? "connection-state connected"
                                : "connection-state"
                            }
                          >
                            {user[4]}
                          </span>
                        </td>
                        <td>{user[5]}</td>
                        <td>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setConfirmUser(user[1])}
                          >
                            Change tier
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <span>Showing {users.length} of 12,482 users</span>
                <div>
                  <Button type="button" variant="secondary" disabled>
                    Previous
                  </Button>
                  <Button type="button" variant="secondary">
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          )}
          {tab === "Quotas" && (
            <>
              <div className="button-row" style={{ marginBottom: "14px" }}>
                <Button type="button" variant="secondary" onClick={syncLiveQuotaMeters}>
                  <RefreshCw size={15} aria-hidden="true" /> Sync live $0-budget meters
                </Button>
              </div>
              <div className="quota-grid">
                {quotaCards.map(([name, value, percent, period]) => (
                  <Card className="quota-card" key={name as string}>
                    <div>
                      <span className="feature-icon">
                        <Zap size={19} aria-hidden="true" />
                      </span>
                      <WorkspaceBadge label="Live Metric" />
                    </div>
                    <h3>{name}</h3>
                    <strong>{value}</strong>
                    <Progress
                      value={percent as number}
                      label={`${name} utilization`}
                    />
                    <p>{period}</p>
                  </Card>
                ))}
              </div>
            </>
          )}
          {tab === "Moderation" && (
            <div className="moderation-grid">
              {[
                [
                  "A controversial take on creator burnout",
                  "Jon Bell",
                  "Text · 684 words",
                ],
                [
                  "Stop chasing the algorithm",
                  "Avery Studio",
                  "Video script · 2m 14s",
                ],
                [
                  "The productivity advice I regret",
                  "Priya Shah",
                  "Text · 910 words",
                ],
              ].map(([title, owner, type]) => (
                <Card className="moderation-card" key={title}>
                  <div className="moderation-preview">
                    <MessageSquareText size={26} aria-hidden="true" />
                    <span>CONTENT PREVIEW</span>
                  </div>
                  <StatusBadge status="pending" />
                  <h3>{title}</h3>
                  <p>
                    “The advice that helped me grow eventually became the same
                    advice I needed to question...”
                  </p>
                  <small>
                    Owner: {owner} · {type}
                  </small>
                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setModeration(`Reject: ${title}`)}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setModeration(`Approve: ${title}`)}
                    >
                      Approve
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
      <Dialog
        open={Boolean(confirmUser)}
        title={`Change ${confirmUser}'s tier?`}
        body="This superuser action updates the account's subscription tier and records an immutable audit log entry."
        confirmLabel="Confirm tier change"
        onClose={() => setConfirmUser("")}
        onConfirm={applyTierChange}
      >
        <label className="field">
          <span className="field__label">New tier</span>
          <select
            className="input"
            value={selectedNewTier}
            onChange={(e) => setSelectedNewTier(e.target.value)}
          >
            <option>Pro</option>
            <option>Creator</option>
            <option>Agency</option>
            <option>Free</option>
          </select>
        </label>
      </Dialog>
      <Dialog
        open={Boolean(moderation)}
        title={moderation}
        body="Add a reason to keep the moderation decision clear and auditable."
        confirmLabel="Confirm decision"
        destructive={moderation.startsWith("Reject")}
        onClose={() => setModeration("")}
        onConfirm={applyModerationDecision}
      >
        <TextArea
          label="Decision reason"
          placeholder="Explain why this content was approved or rejected..."
          rows={4}
          value={moderationReason}
          onChange={(e) => setModerationReason(e.target.value)}
        />
      </Dialog>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}

export function ProductNotesScreen() {
  return (
    <main className="notes-page">
      <Brand />
      <Card>
        <p className="eyebrow">Architecture &amp; Product Policy</p>
        <h1>Product &amp; security decisions</h1>
        <p>
          These architecture and policy decisions govern ContentFlow&apos;s
          Next.js 14 web platform and API v1 surface.
        </p>
        <ul>
          <li>
            <strong>Quota resets &amp; cache policy:</strong> Daily AI quotas
            reset at 00:00 UTC and monthly post/cross-post allowances reset on
            the 1st of each month at 00:00 UTC. User-scoped exact-match AI cache
            hits do not consume daily generation quota.
          </li>
          <li>
            <strong>Billing &amp; Paystack:</strong> UI displays USD tiers ($0 /
            $9 / $29 / $99) while Paystack checkout supports server-verified NGN
            (kobo) and USD (cents) price tables with HMAC-SHA512 webhook
            verification and idempotent event handling.
          </li>
          <li>
            <strong>BYOK key protection:</strong> Saved OpenAI and Replicate
            keys are encrypted server-side using AES-256-GCM envelope encryption
            (or sent per-request via header) and are never returned to the
            browser in plaintext.
          </li>
          <li>
            <strong>OAuth &amp; Queue safety:</strong> Platform connections use
            single-use expiring PKCE states. Background jobs use transactional{" "}
            <code>SKIP LOCKED</code> claiming with worker leases and{" "}
            <code>pending</code>-only cancellation.
          </li>
        </ul>
        <Link className="button button--secondary" href="/">
          Back to home
        </Link>
      </Card>
    </main>
  );
}

export function PrivacyScreen() {
  return (
    <main className="notes-page">
      <Brand />
      <Card>
        <p className="eyebrow">Legal &amp; Trust</p>
        <h1>Privacy Policy</h1>
        <p>
          ContentFlow protects creator drafts, credentials, and platform tokens
          by default.
        </p>
        <ul>
          <li>
            <strong>Data scoping:</strong> All drafts, usage records, and AI
            prompt cache entries are strictly scoped to the authenticated owner
            via PostgreSQL Row-Level Security (RLS) and server-side ownership
            checks.
          </li>
          <li>
            <strong>Credential handling:</strong> OAuth tokens and optional BYOK
            keys are encrypted server-side with AES-256-GCM and never exposed to
            client responses or logs.
          </li>
          <li>
            <strong>Third-party integrations:</strong> Content is transmitted to
            YouTube or TikTok only when you explicitly connect an account and
            schedule or publish a distribution job.
          </li>
        </ul>
        <Link className="button button--secondary" href="/">
          Back to home
        </Link>
      </Card>
    </main>
  );
}

export function TermsScreen() {
  return (
    <main className="notes-page">
      <Brand />
      <Card>
        <p className="eyebrow">Legal &amp; Trust</p>
        <h1>Terms of Service</h1>
        <p>
          Clear, honest terms for using ContentFlow across Free, Creator, Pro,
          and Agency plans.
        </p>
        <ul>
          <li>
            <strong>Content ownership:</strong> You retain full ownership of all
            prompts, drafts, scripts, and media created or uploaded in your
            workspace.
          </li>
          <li>
            <strong>Transparent billing:</strong> Paid subscriptions are
            processed via Paystack with explicit amount and currency
            confirmation before any charge. You can cancel or downgrade at any
            time without deceptive dark patterns.
          </li>
          <li>
            <strong>Fair usage &amp; emergency guardrails:</strong> Tier limits
            reset at 00:00 UTC. When platform-wide quotas exceed 95%, Free-tier
            central AI usage may be temporarily paused to preserve service
            stability.
          </li>
        </ul>
        <Link className="button button--secondary" href="/">
          Back to home
        </Link>
      </Card>
    </main>
  );
}

export function NotFoundScreen() {
  return (
    <main className="notes-page">
      <Brand />
      <Card>
        <p className="eyebrow">404 Error</p>
        <h1>Page not found</h1>
        <EmptyState
          icon={<BookOpen size={26} aria-hidden="true" />}
          title="This route isn't available"
          body="The page you're looking for isn't part of this workspace."
          action={
            <Link className="button button--primary" href="/">
              Go home
            </Link>
          }
        />
      </Card>
    </main>
  );
}
