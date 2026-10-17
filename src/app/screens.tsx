"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  DemoBadge,
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
    cadence: "/ month*",
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
    cadence: "/ month*",
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
    cadence: "/ month*",
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
    "Is ContentFlow publishing content for me?",
    "Not in this prototype. Generation, account connections, scheduling, and publishing are clearly simulated in Demo mode.",
  ],
  [
    "Can I edit generated content?",
    "Yes. Every result is designed to be fully editable before you save or prepare it for a platform.",
  ],
  [
    "Do I need to add an API key?",
    "No. Provider setup is not required in Demo mode. When BYOK is configured, keys use server-side AES-256-GCM envelope encryption or request-only headers.",
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
        <DemoBadge />
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
                3 <small>/ 10</small>
              </strong>
              <Progress value={30} label="Daily quota usage" />
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
              No credit card required · Free plan available · Demo prototype
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
            body="USD reference pricing shown below. Paystack checkout supports NGN and USD server-side price tables when billing is enabled."
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
        <p>© 2026 ContentFlow. Prototype for demonstration only.</p>
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

  function submit(event: FormEvent) {
    event.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!isEmailValid || !isPasswordValid) return;

    setError("");
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      if (signup) setComplete(true);
      else router.push("/dashboard");
    }, 600);
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
        <small>Demo prototype · No real account is created</small>
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
            <DemoBadge />
            <h1>You&apos;re ready to create</h1>
            <p>
              Your demo workspace is set up. Start with a blank slate and turn
              your first idea into content.
            </p>
            <Button onClick={() => router.push("/dashboard?new=true")}>
              Open my workspace <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </Card>
        ) : (
          <form className="auth-form" onSubmit={submit} noValidate>
            <DemoBadge />
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
                    setError("Password reset is simulated in Demo mode.")
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
                  ? "Creating demo workspace"
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
            <small>Creator plan · Demo</small>
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
            Admin demo
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
            <DemoBadge />
            <span>Simulated workspace · No external provider calls</span>
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
    <Link href="/content/1" className="content-card">
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
}: {
  platform: string;
  connected?: boolean;
  detail: string;
  icon: ReactNode;
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
            {connected ? "Connected · Demo" : "Not connected"}
          </span>
        </div>
        <p>{detail}</p>
      </div>
      <Button type="button" variant="secondary">
        {connected ? "Manage" : "Connect"}
      </Button>
    </Card>
  );
}

export function DashboardScreen() {
  const { hasContent } = useAppState();
  return (
    <>
      <PageHeader
        eyebrow="Saturday, October 17 · UTC Reset Policy"
        title="Good morning, Maya"
        description="Pick up where you left off, or turn a fresh idea into something worth sharing."
        action={
          <Link className="button button--primary" href="/create">
            <Plus size={17} aria-hidden="true" /> Create content
          </Link>
        }
      />
      <div className="metric-grid">
        <MetricCard
          label="Daily AI generations"
          value="3 / 100"
          detail="Resets at 00:00 UTC · Cache hits are free"
          icon={<Sparkles size={19} aria-hidden="true" />}
        />
        <MetricCard
          label="Monthly posts"
          value="18 / 50"
          detail="Resets Nov 1 at 00:00 UTC"
          icon={<Send size={19} aria-hidden="true" />}
        />
        <MetricCard
          label="Cross-posts"
          value="12 / 100"
          detail="12% of monthly Creator allowance"
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
              <p>Recent and upcoming demo jobs.</p>
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
            <p>Connections shown below are simulated in Demo mode.</p>
          </div>
          <DemoBadge />
        </div>
        <div className="connection-grid">
          <ConnectionCard
            platform="YouTube"
            connected
            detail="@MayaCreates · Expires in 28 days"
            icon={<Play size={22} aria-hidden="true" />}
          />
          <ConnectionCard
            platform="TikTok"
            detail="Connect to prepare TikTok jobs"
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
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [result, setResult] = useState("");
  const [toast, setToast] = useState("");

  function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setGenerated(false);
    window.setTimeout(() => {
      setResult(
        "Consistency is not about showing up every day; it is about building a creative rhythm you can return to.\n\nStart by choosing one idea worth repeating. Then shape it for the way your audience listens on each platform. A thoughtful YouTube title can open the door; a focused TikTok caption can carry the same idea further.\n\nThe goal is not more content. It is a clearer path from idea to impact."
      );
      setLoading(false);
      setGenerated(true);
    }, 650);
  }

  function save() {
    setHasContent(true);
    setToast("Draft saved in Demo mode");
    window.setTimeout(() => router.push("/content/1"), 450);
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
            <strong>97</strong> Creator generations left today
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
                  disabled={item === "Video"}
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
                  {item === "Video" && <small>Planned</small>}
                </button>
              ))}
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Tone</span>
              <select className="input">
                <option>Clear &amp; encouraging</option>
                <option>Confident &amp; direct</option>
                <option>Warm &amp; conversational</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Format</span>
              <select className="input">
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
              onClick={() => setToast("Blank draft saved in Demo mode")}
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
              {loading ? "Generating demo draft" : "Generate draft"}
            </Button>
          </div>
          <p className="demo-notice">
            <ShieldCheck size={15} aria-hidden="true" /> Demo mode: generation
            is simulated. User-scoped exact-match cache hits are free and do not
            consume daily quota.
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
            <strong>Quota limit &amp; fallback policy</strong>
            <p>
              Daily quotas reset at 00:00 UTC. If your daily quota is reached,
              generation pauses until reset. Upgrade prompts lead to Billing,
              never a simulated charge.
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
  const [toast, setToast] = useState("");

  function queue() {
    addJobs(selected, schedule);
    setToast("Post queued in Demo mode");
    window.setTimeout(() => router.push("/jobs"), 500);
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={16} aria-hidden="true" /> Delete
            </Button>
            <Button
              type="button"
              onClick={() => {
                setDirty(false);
                setToast("Changes saved in Demo mode");
              }}
            >
              <Save size={16} aria-hidden="true" /> Save changes
            </Button>
          </div>
        }
      />
      <div className="detail-layout">
        <div className="detail-main">
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
              <DemoBadge />
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
              <span>Cover image · Demo media</span>
            </div>
          </Card>
          <Card className="cross-post">
            <div>
              <p className="eyebrow">Cross-post</p>
              <h2>Queue for publishing</h2>
              <p>Choose where and when this content should go.</p>
            </div>
            <DemoBadge />
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
                      ? "Connected · Demo"
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
                  Connect a demo account in Settings before queueing.
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
                <option>Post now (simulated)</option>
              </select>
            </label>
            <Button
              type="button"
              onClick={queue}
              disabled={!selected.length}
            >
              <Calendar size={16} aria-hidden="true" /> Queue post
            </Button>
            <small>No content will be published in Demo mode.</small>
          </Card>
        </aside>
      </div>
      <Dialog
        open={deleteOpen}
        title="Delete this draft?"
        body="This demo action removes the draft from the current session. It cannot be undone."
        confirmLabel="Delete draft"
        destructive
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => router.push("/dashboard")}
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

  function simulate(job: Job) {
    updateJob(job.id, "processing");
    setToast("Job moved to processing");
    window.setTimeout(
      () =>
        updateJob(job.id, job.platform === "YouTube" ? "completed" : "failed"),
      900
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Distribution queue"
        title="Jobs"
        description="Track every scheduled and recent publishing job. All activity is simulated."
        action={<DemoBadge />}
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
                  <small>Demo workspace · 2:14 PM UTC</small>
                </span>
              </div>
              <div className={selected.status !== "pending" ? "done" : ""}>
                <UploadCloud size={15} aria-hidden="true" />
                <span>
                  <strong>Sent to {selected.platform}</strong>
                  <small>
                    {selected.status === "pending"
                      ? "Waiting in demo queue"
                      : "Simulated provider request"}
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
                      ? "The demo connection expired. Reconnect the account and retry."
                      : selected.status === "completed"
                        ? "Completed successfully in Demo mode."
                        : "Awaiting result"}
                  </small>
                </span>
              </div>
            </div>
            {selected.status === "pending" && (
              <div className="drawer-actions">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    updateJob(selected.id, "cancelled");
                    setSelected(null);
                    setToast("Pending job cancelled");
                  }}
                >
                  Cancel job
                </Button>
                <Button type="button" onClick={() => simulate(selected)}>
                  Simulate processing
                </Button>
              </div>
            )}
            {selected.status === "failed" && (
              <Button type="button" onClick={() => simulate(selected)}>
                <RefreshCw size={16} aria-hidden="true" /> Retry demo job
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
  const [section, setSection] = useState(
    settingsSections.includes(initialSection as (typeof settingsSections)[number])
      ? initialSection
      : "Profile"
  );
  const [toast, setToast] = useState("");

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
                <Field label="Display name" defaultValue="Maya Chen" />
                <Field
                  label="Email address"
                  type="email"
                  defaultValue="maya@example.com"
                />
              </div>
              <Field
                label="Creator niche"
                defaultValue="Creative education & mindful productivity"
              />
              <Button
                type="button"
                onClick={() => setToast("Profile changes saved in Demo mode")}
              >
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
                  <strong>Demo mode · Server-side AES-256-GCM policy</strong>
                  Never enter a live production secret in this demo workspace.
                </span>
              </div>
              <Field
                label="Saved provider key (masked preview)"
                value="sk-demo-•••••••••••••9K2"
                readOnly
              />
              <div className="button-row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setToast("Demo BYOK key rotated with AES-256-GCM envelope")
                  }
                >
                  Rotate demo key
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setToast("Demo BYOK key removed")}
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
                connected
                detail="@MayaCreates · Demo expiry: 28 days"
                icon={<Play size={22} aria-hidden="true" />}
              />
              <ConnectionCard
                platform="TikTok"
                detail="Not connected · Demo"
                icon={<strong>Tt</strong>}
              />
            </SettingsCard>
          )}
          {section === "Billing" && (
            <SettingsCard
              title="Plan & usage"
              description="USD display reference ($0 / $9 / $29 / $99) with NGN and USD server-side Paystack checkout tables. No real charge occurs in Demo mode."
            >
              <div className="plan-banner">
                <div>
                  <DemoBadge />
                  <h3>Creator plan</h3>
                  <p>
                    $9 / month USD reference (₦14,500 NGN Paystack table) ·
                    Demo workspace
                  </p>
                </div>
                <Button type="button" variant="secondary" disabled>
                  Manage payment (Demo)
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
                onClick={() =>
                  setToast("Plan selection is a Demo; no payment was made.")
                }
              >
                Explore plans
              </Button>
            </SettingsCard>
          )}
          {section === "Security" && (
            <SettingsCard
              title="Security"
              description="Manage password and session preferences."
            >
              <Button type="button" variant="secondary">
                Change password
              </Button>
              <div className="security-row">
                <div>
                  <strong>Two-factor authentication</strong>
                  <p>Planned for a future release.</p>
                </div>
                <DemoBadge planned />
              </div>
              <div className="security-row">
                <div>
                  <strong>Active demo session</strong>
                  <p>Port Harcourt, NG · Current session</p>
                </div>
                <Button type="button" variant="ghost">
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
  const [moderation, setModeration] = useState("");
  const [toast, setToast] = useState("");

  const users = [
    ["Maya Chen", "maya@example.com", "Creator", "Active", "Jun 21, 2026"],
    ["Jon Bell", "jon@example.com", "Pro", "Active", "Jun 20, 2026"],
    ["Avery Studio", "hello@avery.co", "Agency", "Review", "Jun 18, 2026"],
    ["Priya Shah", "priya@example.com", "Free", "Active", "Jun 16, 2026"],
  ].filter(
    (user) =>
      (user[0] + user[1]).toLowerCase().includes(search.toLowerCase()) &&
      (tier === "All tiers" || user[2] === tier)
  );

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
          <DemoBadge />
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
            eyebrow="Protected role · Server-verified superuser demo"
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
                  detail="Demo dataset · Bounded pagination"
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
                      "2.1% failure rate in demo data",
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
                      <tr key={user[1]}>
                        <td>
                          <strong>{user[0]}</strong>
                          <small>{user[1]}</small>
                        </td>
                        <td>{user[2]}</td>
                        <td>
                          <span
                            className={
                              user[3] === "Active"
                                ? "connection-state connected"
                                : "connection-state"
                            }
                          >
                            {user[3]}
                          </span>
                        </td>
                        <td>{user[4]}</td>
                        <td>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setConfirmUser(user[0])}
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
            <div className="quota-grid">
              {[
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
              ].map(([name, value, percent, period]) => (
                <Card className="quota-card" key={name as string}>
                  <div>
                    <span className="feature-icon">
                      <Zap size={19} aria-hidden="true" />
                    </span>
                    <DemoBadge />
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
        body="This is a simulated superuser action. All tier mutations are written to moderator_actions / audit logs."
        confirmLabel="Confirm tier change"
        onClose={() => setConfirmUser("")}
        onConfirm={() => {
          setConfirmUser("");
          setToast("User tier updated in Demo mode");
          setTab("Quotas");
        }}
      >
        <label className="field">
          <span className="field__label">New tier</span>
          <select className="input">
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
        onConfirm={() => {
          setModeration("");
          setToast("Moderation decision saved in Demo mode");
        }}
      >
        <TextArea
          label="Decision reason"
          placeholder="Explain why this content was approved or rejected..."
          rows={4}
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
            <strong>Billing &amp; Paystack:</strong> UI displays USD reference
            tiers ($0 / $9 / $29 / $99) while Paystack checkout supports
            server-verified NGN (kobo) and USD (cents) price tables with
            HMAC-SHA512 webhook verification and idempotent event handling.
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
            <strong>Demo mode transparency:</strong> In Demo mode, all
            generations, connections, and publishing actions run locally in
            simulation without transmitting personal data to third-party social
            networks.
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
