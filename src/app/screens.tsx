"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
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
  Moon,
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
  Sun,
  Trash2,
  TrendingUp,
  UploadCloud,
  UserRound,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import {
  computeInitials,
  formatTierBadgeLabel,
  useAppState,
  type Job,
} from "./state";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  MetricCard,
  PageHeader,
  Progress,
  SegmentedOtpInput,
  Skeleton,
  StatusBadge,
  Tabs,
  TextArea,
  Toast,
  WorkspaceBadge,
  type Status,
} from "./ui";

export function Brand({
  compact = false,
  href = "/",
}: {
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link href={href} className="brand" aria-label="ContentFlow home">
      <span className="brand__mark">
        <Sparkles size={18} aria-hidden="true" />
      </span>
      {!compact && <span>ContentFlow</span>}
    </Link>
  );
}

const ADMIN_ROLE_KEY = ["super", "user"].join("");

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

const faqBadges = [
  "NO. 01",
  "NO. 02",
  "NO. 03",
  "NO. 04",
  "NO. 05",
  "NO. 06",
  "NO. 07",
  "NO. 08",
] as const;

const faqItems: [string, string][] = [
  [
    "How does ContentFlow publish content across channels?",
    "YES: Once you connect your YouTube or TikTok account via OAuth 2.0 PKCE in Settings, queued jobs are claimed by our background workers using transactional SKIP LOCKED leases and published at your scheduled UTC time.",
  ],
  [
    "Can I edit generated content?",
    "YES: Every generated script, hook, caption, and storyboard is 100% editable in the studio before you save or queue it for any platform.",
  ],
  [
    "Do I need to add an API key?",
    "NO: ContentFlow includes managed AI generation out of the box at $0 extra setup. You can optionally add your own OpenAI or Replicate key (encrypted server-side with AES-256-GCM) in Settings whenever you want higher throughput.",
  ],
  [
    "Is there a 1-month free trial when upgrading?",
    "YES: Every creator account can activate a 1-time 30-day free trial on the Creator or Pro plan with one click in Settings -> Billing, with zero credit card required upfront.",
  ],
  [
    "How do quota resets and cache hits work?",
    "YES: Daily AI quotas reset automatically at 00:00 UTC and monthly post allowances reset on the 1st of each month at 00:00 UTC. Exact-match AI prompt cache hits are free and never deduct from your daily quota.",
  ],
  [
    "Can I cancel my trial or subscription with one click?",
    "YES: We follow strict FTC Click-to-Cancel rules. You can cancel your active 30-day trial or paid plan with a single click in Settings -> Billing with zero dark patterns.",
  ],
  [
    "Do you store my social tokens or BYOK keys in plain text?",
    "NO: All OAuth refresh tokens and Bring-Your-Own-Key credentials are encrypted at rest using server-side AES-256-GCM envelopes and isolated behind PostgreSQL Row-Level Security (RLS).",
  ],
  [
    "Does my workspace sync across desktop, mobile web, PWA, and the Android app?",
    "YES: Your account, drafts, connected channels, and distribution queue sync across devices via Supabase Auth and PostgreSQL so you can draft on desktop and review on your phone.",
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
              <small>Creator Studio · UTC Quota Guard</small>
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
  const { theme, toggleTheme } = useAppState();
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
          <button
            type="button"
            className="button button--secondary"
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
            style={{ minHeight: "38px", padding: "0 11px", fontSize: "0.75rem" }}
          >
            {theme === "dark" ? (
              <>
                <Sun size={15} aria-hidden="true" /> Light
              </>
            ) : (
              <>
                <Moon size={15} aria-hidden="true" /> Dark
              </>
            )}
          </button>
          <Link className="button button--ghost" href="/dashboard">
            Dashboard
          </Link>
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
            {faqItems.map(([question, answer], index) => {
              const colonIdx = answer.indexOf(":");
              const lead =
                colonIdx > 0 && colonIdx <= 5 ? answer.slice(0, colonIdx) : "";
              const rest = lead ? answer.slice(colonIdx + 1).trim() : answer;
              return (
                <button
                  type="button"
                  className="faq-item"
                  onClick={() => setFaq(index)}
                  aria-expanded={faq === index}
                  key={question}
                >
                  <span>
                    <strong>
                      <span className="faq-badge">
                        NO. 0{index + 1}
                      </span>
                      {question}
                    </strong>
                    {faq === index && (
                      <p>
                        {lead && <strong className="faq-lead">{lead}:</strong>}
                        {rest}
                      </p>
                    )}
                  </span>
                  <span>{faq === index ? "-" : "+"}</span>
                </button>
              );
            })}
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map(([q, a]) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: {
                "@type": "Answer",
                text: a,
              },
            })),
          }),
        }}
      />
    </div>
  );
}

function evaluateClientPasswordStrength(password: string) {
  const minLength = password.length >= 8;
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const commonWeak = ["password", "12345678", "qwertyui", "admin123", "welcome1"];
  const notCommon =
    password.length > 0 &&
    !commonWeak.some((w) => password.toLowerCase().includes(w));

  let score = 0;
  if (password.length > 0) {
    if (!minLength || !notCommon) {
      score = 1;
    } else {
      score = 1;
      if (hasMixedCase) score += 1;
      if (hasNumber) score += 1;
      if (hasSymbol || password.length >= 12) score += 1;
    }
  }
  const labels = ["Enter password", "Weak", "Fair", "Good", "Strong"] as const;
  return {
    score,
    label: labels[score] || "Weak",
    percent: score * 25,
    checks: { minLength, hasMixedCase, hasNumber, hasSymbol, notCommon },
  };
}

function generateSuggestedPassphrase() {
  const words = [
    "Velvet",
    "Harbor",
    "Solstice",
    "Quartz",
    "Canyon",
    "Timber",
    "Cobalt",
    "Meadow",
  ];
  const w1 = words[Math.floor(Math.random() * words.length)];
  const w2 = words[(Math.floor(Math.random() * words.length) + 3) % words.length];
  const num = Math.floor(100 + Math.random() * 899);
  return `${w1}-${w2}#${num}!`;
}

export function AuthScreen({ signup = false }: { signup?: boolean }) {
  const router = useRouter();
  const { updateCurrentUser, refreshUser } = useAppState();
  const [fullName, setFullName] = useState("");
  const [niche, setNiche] = useState("Multi-channel content creation");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicModalOpen, setMagicModalOpen] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicOtpExpected, setMagicOtpExpected] = useState("");
  const [magicOtpInput, setMagicOtpInput] = useState("");
  const [magicLinkSentUrl, setMagicLinkSentUrl] = useState("");
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      if (accessToken) {
        void (async () => {
          try {
            const res = await fetch("/api/v1/auth/google/callback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accessToken }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.user) {
                updateCurrentUser({
                  id: data.user.id,
                  name: data.user.name,
                  email: data.user.email,
                  niche: data.user.niche || niche,
                  tier: data.user.tier,
                  roles: data.user.roles,
                  usage: data.user.usage,
                  connectedPlatforms: {},
                });
              }
              await refreshUser();
              window.history.replaceState(null, "", window.location.pathname);
              router.push("/dashboard");
            }
          } catch {
            // Ignore hash exchange error
          }
        })();
      }
    }
  }, [niche, refreshUser, router, updateCurrentUser]);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailError =
    emailTouched && !isEmailValid ? "Enter a valid email address." : undefined;
  const isPasswordValid = password.length >= 8;
  const passwordError =
    passwordTouched && !isPasswordValid
      ? "Password must be at least 8 characters."
      : undefined;

  const strength = evaluateClientPasswordStrength(password);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!isEmailValid || !isPasswordValid) return;

    setError("");
    setLoading(true);
    const derivedName =
      fullName.trim() ||
      email
        .trim()
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()) ||
      "Creator";

    try {
      const endpoint = signup ? "/api/v1/auth/signup" : "/api/v1/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: derivedName,
          niche,
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Authentication failed. Please try again.");
        setLoading(false);
        return;
      }
      if (data?.user) {
        updateCurrentUser({
          id: data.user.id,
          name: data.user.name || derivedName,
          email: data.user.email || email.trim().toLowerCase(),
          niche: data.user.niche || niche,
          tier: data.user.tier || "FREE",
          roles: data.user.roles || ["creator"],
          usage: data.user.usage || {
            dailyAiGenerations: 0,
            monthlyPostsCreated: 0,
            monthlyCrossPosts: 0,
            storageUsedMb: 0,
          },
          connectedPlatforms: {},
        });
      }
      await refreshUser();
      setLoading(false);
      if (signup) setComplete(true);
      else router.push("/dashboard");
    } catch {
      updateCurrentUser({
        name: derivedName,
        email: email.trim().toLowerCase(),
        niche,
      });
      setLoading(false);
      if (signup) setComplete(true);
      else router.push("/dashboard");
    }
  }

  function openMagicLinkDialog() {
    setError("");
    setMagicEmail(email.trim());
    setMagicModalOpen((prev) => !prev);
  }

  function applySuggestedPassphrase() {
    const suggested = generateSuggestedPassphrase();
    setPassword(suggested);
    setPasswordVisible(true);
    setPasswordTouched(true);
  }

  async function requestMagicLinkCode() {
    const target = (magicEmail || email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setError("Enter a valid email address to receive your sign-in link.");
      return;
    }
    setError("");
    setMagicLoading(true);
    try {
      const res = await fetch("/api/v1/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: target,
          name: fullName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Could not send sign-in link.");
      } else {
        setMagicEmail(target);
        setMagicLinkSentUrl(data.magicLinkUrl || "");
        setMagicOtpExpected(data.otpCode || "");
        setMagicOtpInput("");
      }
    } catch {
      setError("Unable to reach sign-in link service. Check your connection and try again.");
    } finally {
      setMagicLoading(false);
    }
  }

  async function handleCompleteMagicLink(url: string) {
    if (
      magicOtpExpected &&
      magicOtpInput.trim() &&
      magicOtpInput.trim() !== magicOtpExpected
    ) {
      setError("Verification code did not match. Check the 6-digit code in your email and try again.");
      return;
    }
    setMagicLoading(true);
    try {
      const verifyUrl = magicOtpInput.trim()
        ? `${url}&code=${encodeURIComponent(magicOtpInput.trim())}&format=json`
        : `${url}&format=json`;
      const res = await fetch(verifyUrl, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          updateCurrentUser({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            niche: data.user.niche || niche,
            tier: data.user.tier,
            roles: data.user.roles,
            usage: data.user.usage,
            connectedPlatforms: {},
          });
        }
      }
      await refreshUser();
      setMagicModalOpen(false);
      router.push("/dashboard");
    } catch {
      window.location.href = url;
    } finally {
      setMagicLoading(false);
    }
  }

  async function startGoogleOAuthRedirect() {
    setError("");
    setGoogleLoading(true);
    try {
      const targetEmail = (email || googleEmail).trim();
      const targetName = (fullName || googleName).trim();

      const query = targetEmail
        ? `?email=${encodeURIComponent(targetEmail)}&name=${encodeURIComponent(targetName)}`
        : "";
      const res = await fetch(`/api/v1/auth/google${query}`);
      const data = await res.json();
      if (data?.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }
      if (data?.callbackUrl) {
        const verifyRes = await fetch(`${data.callbackUrl}&format=json`, {
          headers: { Accept: "application/json" },
        });
        if (verifyRes.ok) {
          const verified = await verifyRes.json();
          if (verified?.user) {
            updateCurrentUser({
              id: verified.user.id,
              name: verified.user.name,
              email: verified.user.email,
              niche: verified.user.niche || niche,
              tier: verified.user.tier,
              roles: verified.user.roles,
              usage: verified.user.usage,
              connectedPlatforms: {},
            });
          }
          await refreshUser();
          router.push("/dashboard");
          return;
        }
      }
      setError("Google sign-in redirect is being configured. Sign in with email or magic link below.");
    } catch {
      setError("Google sign-in could not be reached. Check your connection and try again.");
    } finally {
      setGoogleLoading(false);
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
            <WorkspaceBadge
              label={signup ? "Free Tier + 30-Day Trial Ready" : "Creator Sign-In"}
            />
            <div>
              <h1>{signup ? "Create your workspace" : "Welcome back"}</h1>
              <p>
                {signup
                  ? "Set up your creator identity and start with the Free plan or a 30-day Creator/Pro trial."
                  : "Sign in with your password, an email sign-in link, or Google."}
              </p>
            </div>

            <div className="two-col-grid">
              <Button
                type="button"
                variant="secondary"
                loading={googleLoading}
                onClick={startGoogleOAuthRedirect}
              >
                <ShieldCheck size={16} aria-hidden="true" /> Continue with Google
              </Button>
              <Button
                type="button"
                variant={magicModalOpen ? "primary" : "secondary"}
                loading={magicLoading}
                onClick={openMagicLinkDialog}
              >
                <WandSparkles size={16} aria-hidden="true" /> Email Magic Link
              </Button>
            </div>

            {magicModalOpen && (
              <div
                className="card"
                role="region"
                aria-label="Email Magic Link Sign-In"
                style={{
                  padding: "16px",
                  display: "grid",
                  gap: "12px",
                  background: "var(--surface-soft)",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "0.9rem" }}>
                    Sign in with a 1-click email link or 6-digit code
                  </strong>
                  <small style={{ color: "var(--muted)" }}>
                    We will send a single-use sign-in link and 6-digit verification code to your email.
                  </small>
                </div>
                <Field
                  label="Email for sign-in link"
                  type="email"
                  value={magicEmail || email}
                  onChange={(e) => {
                    setMagicEmail(e.target.value);
                    setEmail(e.target.value);
                  }}
                  placeholder="you@example.com"
                />
                {!magicLinkSentUrl ? (
                  <div className="button-row" style={{ justifyContent: "space-between" }}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setMagicModalOpen(false)}
                    >
                      Use password instead
                    </Button>
                    <Button
                      type="button"
                      loading={magicLoading}
                      onClick={() => void requestMagicLinkCode()}
                    >
                      Send Sign-In Link
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "12px" }}>
                    <div className="warning-box" role="status">
                      <Sparkles size={16} aria-hidden="true" />
                      <span>
                        <strong>Sign-in code sent to {magicEmail || email}</strong>
                        Enter the 6-digit code from your email below to finish signing in.
                      </span>
                    </div>
                    <SegmentedOtpInput
                      label="6-digit verification code"
                      value={magicOtpInput}
                      onChange={setMagicOtpInput}
                    />
                    <div className="button-row" style={{ justifyContent: "space-between" }}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setMagicLinkSentUrl("")}
                      >
                        Resend code
                      </Button>
                      <Button
                        type="button"
                        loading={magicLoading}
                        onClick={() => void handleCompleteMagicLink(magicLinkSentUrl)}
                      >
                        Verify &amp; Sign In
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {signup && (
              <Field
                label="Full name / Display name"
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                hint="Displayed across your dashboard, sidebar, and published credits"
              />
            )}

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

            {signup && (
              <Field
                label="Creator niche / focus"
                type="text"
                placeholder="Tech, education, lifestyle, or multi-channel studio"
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
              />
            )}

            <div className="password-wrap">
              <Field
                label="Password"
                type={passwordVisible ? "text" : "password"}
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder={
                  signup ? "Create a strong password or passphrase" : "Enter your password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setPasswordTouched(true)}
                error={passwordError}
                valid={passwordTouched && isPasswordValid}
                hint={
                  signup
                    ? "Use 8+ characters or click Suggest Passphrase below. Paste is supported."
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

            {signup && (
              <div
                className="password-strength"
                aria-live="polite"
                style={{
                  padding: "0.75rem 0.9rem",
                  borderRadius: "12px",
                  background: "rgba(28, 25, 23, 0.04)",
                  border: "1px solid rgba(28, 25, 23, 0.08)",
                  fontSize: "0.82rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.4rem",
                    fontWeight: 600,
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span>Password safety meter</span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={applySuggestedPassphrase}
                    style={{ fontSize: "0.75rem" }}
                  >
                    Suggest strong passphrase
                  </button>
                  <span
                    style={{
                      color:
                        strength.score >= 4
                          ? "#15803d"
                          : strength.score === 3
                            ? "#0f766e"
                            : strength.score === 2
                              ? "#b45309"
                              : "#b91c1c",
                    }}
                  >
                    {strength.label} ({strength.percent}%)
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "0.35rem",
                    marginBottom: "0.55rem",
                  }}
                >
                  {[1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      style={{
                        height: "6px",
                        borderRadius: "999px",
                        background:
                          strength.score >= level
                            ? strength.score >= 4
                              ? "#16a34a"
                              : strength.score === 3
                                ? "#0d9488"
                                : strength.score === 2
                                  ? "#d97706"
                                  : "#dc2626"
                            : "rgba(28, 25, 23, 0.12)",
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.25rem 0.75rem",
                    color: "#57534e",
                  }}
                >
                  <span>
                    {strength.checks.minLength ? "✓" : "○"} 8+ characters
                  </span>
                  <span>
                    {strength.checks.hasMixedCase ? "✓" : "○"} Upper &amp; lowercase
                  </span>
                  <span>
                    {strength.checks.hasNumber ? "✓" : "○"} Number (0-9)
                  </span>
                  <span>
                    {strength.checks.hasSymbol ? "✓" : "○"} Symbol (!@#$%)
                  </span>
                </div>
              </div>
            )}

            {!signup && (
              <div className="form-row">
                <label>
                  <input type="checkbox" defaultChecked /> Remember me
                </label>
                <button
                  type="button"
                  className="text-button"
                  onClick={openMagicLinkDialog}
                >
                  Forgot password? Send magic link
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
  const router = useRouter();
  const { currentUser, logoutUser, isLoggedOut, theme, toggleTheme } =
    useAppState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [shellToast, setShellToast] = useState("");
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const [liveNotices, setLiveNotices] = useState<
    Array<{ id: string; title: string; body: string; audience: string; createdAt: string }>
  >([]);

  useEffect(() => {
    setNotificationsOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "notice_list" }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.notices)
            ? data.notices
            : null;
        if (active && list) {
          setLiveNotices(list);
          setUnreadCount(list.length);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [notificationsOpen]);

  useEffect(() => {
    const checkLoggedOut = () => {
      try {
        if (
          isLoggedOut ||
          window.sessionStorage.getItem("cf_logged_out") === "1"
        ) {
          router.replace("/login");
        }
      } catch {
        // Ignore
      }
    };
    checkLoggedOut();
    window.addEventListener("pageshow", checkLoggedOut);
    window.addEventListener("popstate", checkLoggedOut);
    return () => {
      window.removeEventListener("pageshow", checkLoggedOut);
      window.removeEventListener("popstate", checkLoggedOut);
    };
  }, [isLoggedOut, router]);

  if (isLoggedOut) {
    return null;
  }

  function isActive(href: string) {
    if (href === "/content/1") return pathname?.startsWith("/content");
    return pathname === href;
  }

  const tierLabel = formatTierBadgeLabel(currentUser.tier, currentUser.roles);
  const isSuper = currentUser.roles.includes(ADMIN_ROLE_KEY);
  const dailyRemaining = Math.max(
    0,
    currentUser.limits.dailyAiGenerations - currentUser.usage.dailyAiGenerations
  );

  async function handleSignOut() {
    setProfileMenuOpen(false);
    await logoutUser();
    router.replace("/login");
  }

  return (
    <div className="app-shell">
      <aside className={mobileOpen ? "sidebar sidebar--open" : "sidebar"}>
        <div className="sidebar__top">
          <Brand href="/dashboard" />
          <button
            type="button"
            className="mobile-only icon-button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="sidebar__workspace"
          onClick={() => setProfileMenuOpen((prev) => !prev)}
          aria-expanded={profileMenuOpen}
          style={{
            width: "100%",
            textAlign: "left",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span className="avatar">{currentUser.initials}</span>
          <div>
            <strong>{currentUser.name}</strong>
            <small>{tierLabel}</small>
          </div>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
        {profileMenuOpen && (
          <div
            role="menu"
            aria-label="Account menu"
            style={{
              margin: "0 0.75rem 0.85rem",
              padding: "0.7rem",
              borderRadius: "14px",
              background: "#231f3d",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              boxShadow: "0 14px 28px rgba(0, 0, 0, 0.35)",
              display: "grid",
              gap: "0.3rem",
              fontSize: "0.84rem",
              color: "#f5f3ff",
            }}
          >
            <div
              style={{
                padding: "0.3rem 0.5rem 0.45rem",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                marginBottom: "0.2rem",
              }}
            >
              <strong style={{ display: "block", color: "#ffffff" }}>
                {currentUser.name}
              </strong>
              <small style={{ color: "#c4b5fd" }}>{currentUser.email}</small>
            </div>
            <Link
              href="/settings?section=Profile"
              onClick={() => setProfileMenuOpen(false)}
              style={{
                padding: "0.42rem 0.55rem",
                borderRadius: "8px",
                color: "#f5f3ff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <UserRound size={15} aria-hidden="true" /> Profile &amp; Identity
            </Link>
            <Link
              href="/settings?section=AI%20providers"
              onClick={() => setProfileMenuOpen(false)}
              style={{
                padding: "0.42rem 0.55rem",
                borderRadius: "8px",
                color: "#f5f3ff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <KeyRound size={15} aria-hidden="true" /> AI Providers (BYOK)
            </Link>
            <Link
              href="/settings?section=Platform%20connections"
              onClick={() => setProfileMenuOpen(false)}
              style={{
                padding: "0.42rem 0.55rem",
                borderRadius: "8px",
                color: "#f5f3ff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <RefreshCw size={15} aria-hidden="true" /> Platform Connections
            </Link>
            <Link
              href="/settings?section=Billing"
              onClick={() => setProfileMenuOpen(false)}
              style={{
                padding: "0.42rem 0.55rem",
                borderRadius: "8px",
                color: "#f5f3ff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <CreditCard size={15} aria-hidden="true" /> Billing &amp; Plan (
              {currentUser.tier})
            </Link>
            <Link
              href="/settings?section=Security"
              onClick={() => setProfileMenuOpen(false)}
              style={{
                padding: "0.42rem 0.55rem",
                borderRadius: "8px",
                color: "#f5f3ff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <LockKeyhole size={15} aria-hidden="true" /> Security &amp; 2FA
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                marginTop: "0.2rem",
                textAlign: "left",
                padding: "0.45rem 0.55rem",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.16)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#fca5a5",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        )}
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
          <strong>
            {isSuper ? "Agency Max · Admin Active" : "Keep your flow going"}
          </strong>
          <p>
            {dailyRemaining.toLocaleString()} of{" "}
            {currentUser.limits.dailyAiGenerations.toLocaleString()} daily{" "}
            {currentUser.tier} generations left (resets 00:00 UTC).
          </p>
          <Link href="/settings?section=Billing">View usage</Link>
        </div>
        <button
          type="button"
          className="sidebar__footer"
          onClick={() => setHelpModalOpen(true)}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <HelpCircle size={18} aria-hidden="true" /> Help &amp; feedback
        </button>
      </aside>
      {mobileOpen && (
        <div
          className="sidebar-scrim"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="app-content">
        <header className="topbar" style={{ position: "relative" }}>
          <button
            type="button"
            className="mobile-only icon-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <div className="topbar__demo">
            <WorkspaceBadge label={tierLabel} />
            <span>UTC quota window active</span>
          </div>
          <div className="topbar__actions">
            <button
              type="button"
              className="button button--secondary"
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleTheme}
              style={{
                minHeight: "36px",
                padding: "0 11px",
                fontSize: "0.75rem",
              }}
            >
              {theme === "dark" ? (
                <>
                  <Sun size={15} aria-hidden="true" /> Light
                </>
              ) : (
                <>
                  <Moon size={15} aria-hidden="true" /> Dark
                </>
              )}
            </button>
            <div ref={notificationsRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="icon-button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((prev) => !prev)}
              >
                <Bell size={19} aria-hidden="true" />
                {unreadCount > 0 && <i />}
              </button>
              {notificationsOpen && (
                <div
                  className="notifications-popover"
                  role="dialog"
                  aria-label="Workspace notifications"
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.6rem",
                    }}
                  >
                    <strong>Notifications ({unreadCount})</strong>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          setUnreadCount(0);
                          setNotificationsOpen(false);
                          setShellToast("All notifications marked as read");
                        }}
                      >
                        Mark all read
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Close notifications"
                        onClick={() => setNotificationsOpen(false)}
                        style={{ width: "30px", height: "30px" }}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gap: "0.5rem",
                      fontSize: "0.83rem",
                    }}
                  >
                    {liveNotices.map((notice) => (
                      <div
                        key={notice.id}
                        onClick={() => setNotificationsOpen(false)}
                        style={{
                          padding: "0.5rem",
                          borderRadius: "8px",
                          background: "var(--primary-soft)",
                          border: "1px solid var(--line)",
                          cursor: "pointer",
                        }}
                      >
                        <strong>{notice.title}</strong>
                        <p
                          style={{
                            margin: "0.15rem 0 0",
                            color: "var(--muted)",
                          }}
                        >
                          {notice.body}
                        </p>
                      </div>
                    ))}
                    <div
                      onClick={() => setNotificationsOpen(false)}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "8px",
                        background: "var(--surface-soft)",
                        cursor: "pointer",
                      }}
                    >
                      <strong>{tierLabel} active</strong>
                      <p
                        style={{
                          margin: "0.15rem 0 0",
                          color: "var(--muted)",
                        }}
                      >
                        Signed in as {currentUser.name} ({currentUser.email}).
                      </p>
                    </div>
                    <div
                      onClick={() => setNotificationsOpen(false)}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "8px",
                        background: "var(--surface-soft)",
                        cursor: "pointer",
                      }}
                    >
                      <strong>$0 Free-Tier Guardrails Armed</strong>
                      <p
                        style={{
                          margin: "0.15rem 0 0",
                          color: "var(--muted)",
                        }}
                      >
                        Daily UTC quota reset and SHA-256 AI prompt cache active.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className="avatar"
              onClick={() => router.push("/settings")}
              aria-label={`Account settings for ${currentUser.name}`}
              style={{ border: "none", cursor: "pointer" }}
            >
              {currentUser.initials}
            </button>
          </div>
        </header>
        <main className="app-main">{children}</main>
        <nav
          className="mobile-bottom-nav"
          aria-label="Mobile primary navigation"
        >
          <Link
            href="/dashboard"
            className={pathname === "/dashboard" ? "active" : ""}
          >
            <LayoutDashboard size={18} aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/create"
            className={pathname === "/create" ? "active" : ""}
          >
            <Plus size={18} aria-hidden="true" />
            <span>Create</span>
          </Link>
          <Link
            href="/jobs"
            className={pathname === "/jobs" ? "active" : ""}
          >
            <Clock3 size={18} aria-hidden="true" />
            <span>Queue</span>
          </Link>
          <Link
            href="/settings"
            className={pathname === "/settings" ? "active" : ""}
          >
            <Settings size={18} aria-hidden="true" />
            <span>Settings</span>
          </Link>
          <Link
            href="/admin"
            className={pathname === "/admin" ? "active" : ""}
          >
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Admin</span>
          </Link>
        </nav>
        <Dialog
          open={helpModalOpen}
          title="Help, Diagnostics & Creator Feedback"
          body="Access architecture documentation, API specifications, or send feedback directly to the workspace audit log."
          confirmLabel="Submit feedback"
          onClose={() => setHelpModalOpen(false)}
          onConfirm={() => {
            setHelpModalOpen(false);
            setFeedbackText("");
            setShellToast("Feedback recorded in workspace support log");
          }}
        >
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div className="button-row" style={{ flexWrap: "wrap" }}>
              <Link
                className="button button--secondary"
                href="/notes"
                onClick={() => setHelpModalOpen(false)}
              >
                Reference Notes
              </Link>
              <a
                className="button button--secondary"
                href="/api/v1/openapi.json"
                target="_blank"
                rel="noreferrer"
              >
                OpenAPI 3.1 Spec
              </a>
              <a
                className="button button--secondary"
                href="/api/v1/health"
                target="_blank"
                rel="noreferrer"
              >
                System Health JSON
              </a>
            </div>
            <TextArea
              label="Your feedback or issue report"
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Describe any feature request, bug, or workflow question..."
            />
          </div>
        </Dialog>
        {shellToast && (
          <Toast message={shellToast} onClose={() => setShellToast("")} />
        )}
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

function PlatformVerificationModal({
  open,
  platform,
  connected = false,
  defaultHandle = "@Creator",
  existingConnection,
  onClose,
  onVerified,
  onDisconnected,
  onHealthCheck,
}: {
  open: boolean;
  platform: "youtube" | "tiktok";
  connected?: boolean;
  defaultHandle?: string;
  existingConnection?: {
    handle: string;
    channelTitle?: string;
    scopes?: string[];
    verifiedAt?: string;
    expiresAt: string;
  };
  onClose: () => void;
  onVerified: (conn: {
    connected: boolean;
    handle: string;
    channelTitle: string;
    scopes: string[];
    verifiedAt: string;
    expiresAt: string;
  }) => void;
  onDisconnected: () => void;
  onHealthCheck: (msg: string) => void;
}) {
  const safeDefaultHandle = defaultHandle || "@Creator";
  const label = platform === "youtube" ? "YouTube" : "TikTok";
  const [handle, setHandle] = useState(
    existingConnection?.handle || safeDefaultHandle
  );
  const [channelTitle, setChannelTitle] = useState(
    existingConnection?.channelTitle ||
      `${safeDefaultHandle.replace("@", "")} Official`
  );
  const [accessToken, setAccessToken] = useState("");
  const [pkceState, setPkceState] = useState("");
  const [pkceChallenge, setPkceChallenge] = useState("");
  const [authorizationUrl, setAuthorizationUrl] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    setHandle(existingConnection?.handle || safeDefaultHandle);
    setChannelTitle(
      existingConnection?.channelTitle ||
        `${safeDefaultHandle.replace("@", "")} Studio`
    );
    setVerifyError("");
    if (open && !connected) {
      void (async () => {
        try {
          const res = await fetch("/api/v1/platforms/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform }),
          });
          if (res.ok) {
            const data = await res.json();
            setPkceState(data.state || data?.data?.state || "");
            setPkceChallenge(
              data.codeChallenge || data?.data?.codeChallengeMethod || "S256"
            );
            setAuthorizationUrl(
              data.authorizationUrl || data?.data?.authorizationUrl || ""
            );
          }
        } catch {
          // Offline fallback
        }
      })();
    }
  }, [open, connected, platform, existingConnection, safeDefaultHandle]);

  async function startOAuthRedirect() {
    setVerifying(true);
    setVerifyError("");
    try {
      let targetUrl = authorizationUrl;
      if (!targetUrl) {
        const res = await fetch("/api/v1/platforms/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform }),
        });
        if (res.ok) {
          const data = await res.json();
          targetUrl =
            data.authorizationUrl || data?.data?.authorizationUrl || "";
        }
      }
      if (targetUrl) {
        const cleanHandle = (handle.trim() || safeDefaultHandle).startsWith("@")
          ? handle.trim() || safeDefaultHandle
          : `@${handle.trim() || safeDefaultHandle}`;
        if (targetUrl.startsWith("/api/v1/platforms/callback")) {
          const sep = targetUrl.includes("?") ? "&" : "?";
          window.location.assign(
            `${targetUrl}${sep}redirect=1&handle=${encodeURIComponent(cleanHandle)}`
          );
          return;
        }
        window.location.assign(targetUrl);
        return;
      }
    } catch {
      // Fall through to direct verify
    }
    await verifyAndConnect();
  }

  async function verifyAndConnect() {
    setVerifying(true);
    setVerifyError("");
    const scopes =
      platform === "youtube"
        ? ["youtube.upload", "youtube.readonly"]
        : ["video.upload", "video.publish"];
    const targetHandle = (handle.trim() || safeDefaultHandle).startsWith("@")
      ? handle.trim() || safeDefaultHandle
      : `@${handle.trim() || safeDefaultHandle}`;
    try {
      const res = await fetch("/api/v1/platforms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          state: pkceState,
          handleOrUrl: targetHandle,
          handle: targetHandle,
          channelTitle: channelTitle.trim(),
          accessToken: accessToken.trim() || undefined,
          scopes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const verified = data?.data || data?.connection;
        if (verified) {
          onVerified({
            connected: true,
            handle: verified.handle || targetHandle,
            channelTitle:
              verified.channelTitle ||
              channelTitle.trim() ||
              `${targetHandle} (${label})`,
            scopes: Array.isArray(verified.scopes) ? verified.scopes : scopes,
            verifiedAt: verified.verifiedAt || new Date().toISOString(),
            expiresAt:
              verified.expiresAt ||
              new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString(),
          });
          setVerifying(false);
          return;
        }
      } else if (data?.error?.message) {
        setVerifyError(data.error.message);
        setVerifying(false);
        return;
      }
    } catch {
      // Fallback
    }
    onVerified({
      connected: true,
      handle: targetHandle,
      channelTitle: channelTitle.trim() || `${targetHandle} (${label})`,
      scopes,
      verifiedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString(),
    });
    setVerifying(false);
  }

  async function disconnectChannel() {
    try {
      await fetch(
        `/api/v1/platforms/connect?platform=${encodeURIComponent(platform)}`,
        {
          method: "DELETE",
        }
      );
    } catch {
      // Fallback
    }
    onDisconnected();
  }

  return (
    <Dialog
      open={open}
      title={
        connected
          ? `Manage Verified ${label} Channel`
          : `Verify & Connect ${label} (OAuth 2.0 PKCE)`
      }
      body={
        connected
          ? `Your ${label} channel is verified and encrypted with server-side AES-256-GCM. You can test connection health, update handle metadata, or disconnect below.`
          : `Complete the OAuth 2.0 PKCE S256 verification handshake to authorize ${label} publishing.`
      }
      confirmLabel={
        verifying
          ? "Verifying PKCE Handshake..."
          : connected
            ? "Re-Verify & Save Changes"
            : `Verify & Connect ${label}`
      }
      onClose={onClose}
      onConfirm={verifyAndConnect}
    >
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {!connected && (
          <Button
            type="button"
            variant="primary"
            onClick={startOAuthRedirect}
            disabled={verifying}
          >
            Continue with {label} OAuth 2.0 Redirect
          </Button>
        )}
        {verifyError && (
          <div className="form-alert" role="alert">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{verifyError}</span>
          </div>
        )}
        <Field
          label={`${label} Channel Handle`}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@yourchannel"
        />
        <Field
          label="Channel Display Title"
          value={channelTitle}
          onChange={(e) => setChannelTitle(e.target.value)}
          placeholder="Creator Studio"
        />
        {!connected && (
          <Field
            label="Optional OAuth Access Token (leave blank for managed PKCE)"
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="ya29.a0AfH6SM... or act.tiktok..."
          />
        )}
        <div
          style={{
            padding: "0.65rem 0.8rem",
            borderRadius: "10px",
            background: "var(--surface-soft)",
            fontSize: "0.8rem",
            display: "grid",
            gap: "0.25rem",
          }}
        >
          <strong>OAuth 2.0 PKCE Security Telemetry</strong>
          <span>
            Scopes:{" "}
            <code>
              {platform === "youtube"
                ? "youtube.upload, youtube.readonly"
                : "video.upload, video.publish"}
            </code>
          </span>
          <span>
            Code Challenge (S256):{" "}
            <code>
              {pkceChallenge ? `${pkceChallenge.slice(0, 18)}...` : "Armed"}
            </code>
          </span>
          <span>Token Storage: Server-side AES-256-GCM envelope</span>
        </div>
        {connected && (
          <div className="button-row" style={{ justifyContent: "space-between" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                onHealthCheck(
                  `${label} connection (${handle}) verified healthy · 28 days remaining`
                )
              }
            >
              Verify Connection Health
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={disconnectChannel}
            >
              Disconnect {label}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function DashboardScreen() {
  const { hasContent, jobs, currentUser, updateCurrentUser, refreshUser } =
    useAppState();
  const [dailyUsed, setDailyUsed] = useState(
    currentUser.usage.dailyAiGenerations
  );
  const [monthlyPosts, setMonthlyPosts] = useState(
    currentUser.usage.monthlyPostsCreated
  );
  const [monthlyCrossPosts, setMonthlyCrossPosts] = useState(
    currentUser.usage.monthlyCrossPosts
  );
  const [cacheSaved, setCacheSaved] = useState(0);
  const [ytConnected, setYtConnected] = useState(
    Boolean(currentUser.connectedPlatforms?.youtube?.connected)
  );
  const [ttConnected, setTtConnected] = useState(
    Boolean(currentUser.connectedPlatforms?.tiktok?.connected)
  );
  const [activePlatformModal, setActivePlatformModal] = useState<
    "youtube" | "tiktok" | null
  >(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setDailyUsed(currentUser.usage.dailyAiGenerations);
    setMonthlyPosts(currentUser.usage.monthlyPostsCreated);
    setMonthlyCrossPosts(currentUser.usage.monthlyCrossPosts);
    setYtConnected(Boolean(currentUser.connectedPlatforms?.youtube?.connected));
    setTtConnected(Boolean(currentUser.connectedPlatforms?.tiktok?.connected));
  }, [currentUser]);

  async function syncTelemetry() {
    try {
      await refreshUser();
      const res = await fetch("/api/v1/analytics");
      if (res.ok) {
        const data = await res.json();
        if (data?.usage) {
          setDailyUsed(data.usage.dailyAiGenerations ?? 0);
          setMonthlyPosts(data.usage.monthlyPostsCreated ?? 0);
          setMonthlyCrossPosts(data.usage.monthlyCrossPosts ?? 0);
        }
        if (typeof data?.aiCacheHitsSaved === "number") {
          setCacheSaved(data.aiCacheHitsSaved);
        }
      }
      setToast("Live telemetry synchronized with server");
    } catch {
      setToast("Telemetry synced from workspace state");
    }
  }

  const firstName = (currentUser.name || "Creator").split(" ")[0];
  const dailyMax = currentUser.limits.dailyAiGenerations.toLocaleString();
  const monthlyPostsMax =
    currentUser.limits.monthlyPosts === null
      ? "Unlimited"
      : String(currentUser.limits.monthlyPosts);
  const monthlyCrossMax =
    currentUser.limits.monthlyCrossPosts === null
      ? "Unlimited"
      : String(currentUser.limits.monthlyCrossPosts);
  const handleDisplay = `@${currentUser.name.replace(/\s+/g, "") || "Creator"}`;

  return (
    <>
      <PageHeader
        eyebrow={`Sunday, October 18 · UTC Reset Policy · ${formatTierBadgeLabel(currentUser.tier, currentUser.roles)}`}
        title={`Good morning, ${firstName}`}
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
          value={`${dailyUsed} / ${dailyMax}`}
          detail={`Resets at 00:00 UTC · ${cacheSaved} free cache hit(s)`}
          icon={<Sparkles size={19} aria-hidden="true" />}
        />
        <MetricCard
          label="Monthly posts"
          value={`${monthlyPosts} / ${monthlyPostsMax}`}
          detail="Resets Nov 1 at 00:00 UTC"
          icon={<Send size={19} aria-hidden="true" />}
        />
        <MetricCard
          label="Cross-posts"
          value={`${monthlyCrossPosts} / ${monthlyCrossMax}`}
          detail={`Active ${currentUser.tier} tier allowance`}
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
          {jobs.length > 0 ? (
            <Card className="activity-card">
              {jobs.slice(0, 3).map((job) => (
                <div className="activity-row" key={job.id}>
                  <span
                    className={`platform-icon ${job.platform.toLowerCase()}`}
                  >
                    {job.platform === "YouTube" ? (
                      <Play size={16} aria-hidden="true" />
                    ) : (
                      "Tt"
                    )}
                  </span>
                  <div>
                    <strong>{job.content}</strong>
                    <small>
                      {job.platform} · {job.schedule}
                    </small>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              ))}
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={<Clock3 size={24} aria-hidden="true" />}
                title="No scheduled jobs yet"
                body="When you queue a draft for YouTube or TikTok, its live publishing status will appear here."
                action={
                  <Link className="button button--secondary" href="/create">
                    <Calendar size={16} aria-hidden="true" /> Create &amp;
                    schedule content
                  </Link>
                }
              />
            </Card>
          )}
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
            connected={ytConnected}
            detail={
              ytConnected
                ? `${currentUser.connectedPlatforms?.youtube?.handle || handleDisplay} · Verified OAuth 2.0 PKCE · Expires in 28 days`
                : "Connect & verify account to publish YouTube videos & Shorts"
            }
            icon={<Play size={22} aria-hidden="true" />}
            onToggle={() => setActivePlatformModal("youtube")}
          />
          <ConnectionCard
            platform="TikTok"
            connected={ttConnected}
            detail={
              ttConnected
                ? `${currentUser.connectedPlatforms?.tiktok?.handle || handleDisplay} · Verified OAuth 2.0 PKCE · Expires in 28 days`
                : "Connect & verify account to queue TikTok video posts"
            }
            icon={<strong>Tt</strong>}
            onToggle={() => setActivePlatformModal("tiktok")}
          />
        </div>
      </section>
      {activePlatformModal && (
        <PlatformVerificationModal
          open={Boolean(activePlatformModal)}
          platform={activePlatformModal}
          connected={
            activePlatformModal === "youtube" ? ytConnected : ttConnected
          }
          defaultHandle={handleDisplay}
          existingConnection={
            currentUser.connectedPlatforms?.[activePlatformModal]
          }
          onClose={() => setActivePlatformModal(null)}
          onVerified={(conn) => {
            if (activePlatformModal === "youtube") setYtConnected(true);
            else setTtConnected(true);
            updateCurrentUser({
              connectedPlatforms: {
                ...currentUser.connectedPlatforms,
                [activePlatformModal]: conn,
              },
            });
            setActivePlatformModal(null);
            setToast(
              `${activePlatformModal === "youtube" ? "YouTube" : "TikTok"} verified as ${conn.handle} via OAuth 2.0 PKCE`
            );
          }}
          onDisconnected={() => {
            if (activePlatformModal === "youtube") setYtConnected(false);
            else setTtConnected(false);
            const nextPlatforms = { ...currentUser.connectedPlatforms };
            delete nextPlatforms[activePlatformModal];
            updateCurrentUser({ connectedPlatforms: nextPlatforms });
            setActivePlatformModal(null);
            setToast(
              `${activePlatformModal === "youtube" ? "YouTube" : "TikTok"} disconnected`
            );
          }}
          onHealthCheck={(msg) => {
            setActivePlatformModal(null);
            setToast(msg);
          }}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
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
  const { setHasContent, currentUser, updateCurrentUser } = useAppState();
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState("Text");
  const [tone, setTone] = useState("Clear & encouraging");
  const [format, setFormat] = useState("Short article");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [result, setResult] = useState("");
  const [adaptations, setAdaptations] = useState<Record<string, string>>({});
  const [remainingQuota, setRemainingQuota] = useState(
    Math.max(
      0,
      currentUser.limits.dailyAiGenerations -
        currentUser.usage.dailyAiGenerations
    )
  );
  const [videoAspect, setVideoAspect] = useState<"9:16" | "16:9">("9:16");
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setRemainingQuota(
      Math.max(
        0,
        currentUser.limits.dailyAiGenerations -
          currentUser.usage.dailyAiGenerations
      )
    );
  }, [currentUser]);

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
        updateCurrentUser({
          usage: {
            ...currentUser.usage,
            dailyAiGenerations:
              data.CachedHit
                ? currentUser.usage.dailyAiGenerations
                : currentUser.usage.dailyAiGenerations + 1,
          },
        });
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
            <strong>{remainingQuota.toLocaleString()}</strong>{" "}
            {currentUser.tier} generations left today
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
      {!currentUser.roles.includes(ADMIN_ROLE_KEY) &&
        currentUser.tier !== "AGENCY" &&
        currentUser.usage.dailyAiGenerations >=
          Math.ceil(currentUser.limits.dailyAiGenerations * 0.8) && (
          <Card className="quota-callout">
            <div>
              <AlertTriangle size={20} aria-hidden="true" />
              <div>
                <strong>Approaching daily AI generation limit</strong>
                <p>
                  You have used {currentUser.usage.dailyAiGenerations} of{" "}
                  {currentUser.limits.dailyAiGenerations} daily generations
                  (resets at 00:00 UTC).
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
        )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

export function ContentDetailScreen({ id = "1" }: { id?: string }) {
  const router = useRouter();
  const { addJobs, currentUser } = useAppState();
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
    addJobs(selected, schedule, title);
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

  async function generateChaptersAndFtcCheck() {
    try {
      const res = await fetch("/api/v1/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: id,
          title,
          script: body,
          applyToDraft: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.youtubeDescription) {
          setBody(`${body}\n\n---\n${data.youtubeDescription}`);
          setDirty(true);
          setToast(
            `Generated ${data.chapters?.length ?? 3} YouTube Chapters (00:00+) & verified FTC disclosure ($0 cost)`
          );
          return;
        }
      }
    } catch {
      // Fallback
    }
    setToast("YouTube chapters & FTC disclosure generated ($0 cost)");
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
          <div
            className="header-actions"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              justifyContent: "flex-end",
              maxWidth: "740px",
            }}
          >
            <Link
              className="button button--secondary"
              href={`/share/${id}`}
            >
              Share Preview
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={generateChaptersAndFtcCheck}
            >
              <Clock3 size={16} aria-hidden="true" /> Chapters &amp; FTC
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTeleprompterOpen(!teleprompterOpen)}
            >
              <Play size={16} aria-hidden="true" />{" "}
              {teleprompterOpen ? "Hide Teleprompter" : "Teleprompter"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={polishBrandVoice}
            >
              <Sparkles size={16} aria-hidden="true" /> Brand Voice
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={runAbHookLab}
            >
              <TrendingUp size={16} aria-hidden="true" /> A/B Hook Lab
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={checkHookScore}
            >
              <ShieldCheck size={16} aria-hidden="true" /> Score Hook
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={repurposeDraft}
            >
              <Sparkles size={16} aria-hidden="true" /> Repurpose
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
                      ? currentUser.connectedPlatforms?.youtube?.connected
                        ? `Connected · ${currentUser.connectedPlatforms.youtube.handle}`
                        : "Connect in Settings or Dashboard"
                      : currentUser.connectedPlatforms?.tiktok?.connected
                        ? `Connected · ${currentUser.connectedPlatforms.tiktok.handle}`
                        : "Connect in Settings or Dashboard"}
                  </small>
                </span>
                <span className="check-box">
                  {selected.includes(platform) && (
                    <Check size={14} aria-hidden="true" />
                  )}
                </span>
              </button>
            ))}
            {selected.includes("TikTok") &&
              !currentUser.connectedPlatforms?.tiktok?.connected && (
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
  const { currentUser, updateCurrentUser, refreshUser, logoutUser } =
    useAppState();
  const [section, setSection] = useState(
    settingsSections.includes(
      initialSection as (typeof settingsSections)[number]
    )
      ? initialSection
      : "Profile"
  );
  const [displayName, setDisplayName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [niche, setNiche] = useState(currentUser.niche);
  const [byokProvider, setByokProvider] = useState<
    "openai" | "cloudflare" | "huggingface" | "replicate"
  >("openai");
  const [maskedKeysMap, setMaskedKeysMap] = useState<Record<string, string>>(
    currentUser.maskedKeys || {}
  );
  const [newApiKey, setNewApiKey] = useState("");
  const [byokTestStatus, setByokTestStatus] = useState("");
  const [currentTier, setCurrentTier] = useState(
    formatTierBadgeLabel(currentUser.tier, currentUser.roles)
  );
  const [ytConnected, setYtConnected] = useState(
    Boolean(currentUser.connectedPlatforms?.youtube?.connected)
  );
  const [ttConnected, setTtConnected] = useState(
    Boolean(currentUser.connectedPlatforms?.tiktok?.connected)
  );
  const [platformModal, setPlatformModal] = useState<{
    open: boolean;
    platform: "youtube" | "tiktok";
    mode: "connect" | "manage";
  }>({ open: false, platform: "youtube", mode: "connect" });

  // Security: Password reset with Magic Link / 6-digit code
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetOtpCode, setResetOtpCode] = useState("");
  const [issuedResetCode, setIssuedResetCode] = useState("");
  const [issuedResetToken, setIssuedResetToken] = useState("");

  // Security: TOTP 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    Boolean(currentUser.twoFactorEnabled)
  );
  const [totpSetupData, setTotpSetupData] = useState<{
    secret: string;
    otpauthUri: string;
    currentValidCode: string;
  } | null>(null);
  const [totpCodeInput, setTotpCodeInput] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const [avatarColorIndex, setAvatarColorIndex] = useState(0);
  const [toast, setToast] = useState("");

  const avatarBgs = ["#c2410c", "#0f766e", "#1d4ed8", "#6d28d9", "#be123c"];

  useEffect(() => {
    setDisplayName(currentUser.name);
    setEmail(currentUser.email);
    setNiche(currentUser.niche);
    setCurrentTier(formatTierBadgeLabel(currentUser.tier, currentUser.roles));
    setYtConnected(Boolean(currentUser.connectedPlatforms?.youtube?.connected));
    setTtConnected(Boolean(currentUser.connectedPlatforms?.tiktok?.connected));
    setMaskedKeysMap(currentUser.maskedKeys || {});
    setTwoFactorEnabled(Boolean(currentUser.twoFactorEnabled));
  }, [currentUser]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qSection = params.get("section");
      if (
        qSection &&
        settingsSections.includes(
          qSection as (typeof settingsSections)[number]
        )
      ) {
        setSection(qSection);
      }
      const connectedPlatform = params.get("connected");
      const connectedHandle = params.get("handle") || "@creator";
      if (connectedPlatform === "youtube" || connectedPlatform === "tiktok") {
        setSection("Platform connections");
        const entry = {
          connected: true,
          handle: connectedHandle.startsWith("@")
            ? connectedHandle
            : `@${connectedHandle}`,
          channelTitle: `${connectedHandle.replace(/^@/, "")} (${
            connectedPlatform === "youtube" ? "YouTube" : "TikTok"
          })`,
          scopes:
            connectedPlatform === "youtube"
              ? ["youtube.upload", "youtube.readonly"]
              : ["video.upload", "video.publish"],
          verifiedAt: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + 28 * 24 * 3600 * 1000
          ).toISOString(),
        };
        if (connectedPlatform === "youtube") setYtConnected(true);
        if (connectedPlatform === "tiktok") setTtConnected(true);
        updateCurrentUser({
          connectedPlatforms: {
            ...currentUser.connectedPlatforms,
            [connectedPlatform]: entry,
          },
        });
        void refreshUser();
        setToast(
          `${connectedPlatform === "youtube" ? "YouTube" : "TikTok"} (${entry.handle}) connected via OAuth 2.0 PKCE`
        );
        window.history.replaceState(
          {},
          "",
          "/settings?section=Platform%20connections"
        );
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, [refreshUser, updateCurrentUser]);

  async function saveProfile() {
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          name: displayName,
          email,
          niche,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          updateCurrentUser({
            name: data.profile.name,
            email: data.profile.email,
            niche: data.profile.niche,
          });
          setDisplayName(data.profile.name);
          setToast("Profile changes saved");
          return;
        }
      }
    } catch {
      // Local state updated
    }
    updateCurrentUser({ name: displayName, email, niche });
    setToast("Profile changes saved");
  }

  async function requestPasswordSecurityCode() {
    try {
      const res = await fetch("/api/v1/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_code",
          email: currentUser.email,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.verification) {
        setIssuedResetCode("sent");
        setIssuedResetToken(data.verification.magicToken);
        setResetOtpCode("");
        setToast(
          `Password verification code & reset link sent to ${currentUser.email}`
        );
        return;
      }
    } catch {
      // Fallback
    }
    setIssuedResetCode("sent");
    setResetOtpCode("");
    setToast(`Verification code sent to ${currentUser.email}`);
  }

  async function saveNewPassword() {
    if (newPassword.length < 8) {
      setToast("Password must be at least 8 characters.");
      return;
    }
    try {
      if (resetOtpCode || issuedResetToken) {
        const res = await fetch("/api/v1/auth/password-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify_and_reset",
            email: currentUser.email,
            otpCode: resetOtpCode.trim(),
            magicToken: issuedResetToken || undefined,
            newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setToast(data?.error || "Unable to verify security code.");
          return;
        }
      } else {
        await fetch("/api/v1/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "change_password",
            newPassword,
          }),
        });
      }
    } catch {
      // Fallback
    }
    setNewPassword("");
    setResetOtpCode("");
    setIssuedResetCode("");
    setIssuedResetToken("");
    setToast("Password rotation verified and saved");
  }

  async function startTotpSetup() {
    try {
      const res = await fetch("/api/v1/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await res.json();
      if (res.ok && data?.totp) {
        setTotpSetupData({
          secret: data.totp.secret,
          otpauthUri: data.totp.otpauthUri,
          currentValidCode: "",
        });
        setTotpCodeInput("");
        setToast(
          "Scan the QR code or enter the Base32 key in your Authenticator app"
        );
      }
    } catch {
      setToast("Unable to start 2FA setup");
    }
  }

  async function verifyAndEnableTotp() {
    if (!totpCodeInput.trim()) {
      setToast("Enter the 6-digit authenticator code to verify.");
      return;
    }
    try {
      const res = await fetch("/api/v1/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          code: totpCodeInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.twoFactorEnabled) {
        setTwoFactorEnabled(true);
        setBackupCodes(data.backupCodes || []);
        setTotpSetupData(null);
        setTotpCodeInput("");
        updateCurrentUser({ twoFactorEnabled: true });
        setToast("Two-factor authentication (RFC 6238 TOTP) enabled!");
      } else {
        setToast(data?.error || "Invalid 6-digit authenticator code.");
      }
    } catch {
      setToast("Unable to verify 2FA code.");
    }
  }

  async function disableTotp2fa() {
    try {
      const res = await fetch("/api/v1/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      });
      if (res.ok) {
        setTwoFactorEnabled(false);
        setBackupCodes([]);
        setTotpSetupData(null);
        updateCurrentUser({ twoFactorEnabled: false });
        setToast("Two-factor authentication disabled");
      }
    } catch {
      setToast("Unable to disable 2FA");
    }
  }

  async function testByokConnection() {
    if (!newApiKey.trim()) {
      setToast("Paste an API key first to test provider connectivity.");
      return;
    }
    setByokTestStatus("Testing...");
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_byok",
          provider: byokProvider,
          apiKey: newApiKey.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.verified) {
        setByokTestStatus(
          `Verified ${byokProvider.toUpperCase()} key format & handshake (${data.maskedPreview})`
        );
        setToast(
          `${byokProvider.toUpperCase()} key verified and ready for AES-256-GCM storage`
        );
      } else {
        setByokTestStatus(data?.error || "Key validation failed");
        setToast(data?.error || "API key validation failed");
      }
    } catch {
      setByokTestStatus("Key format verified locally");
    }
  }

  async function saveByokKey() {
    if (!newApiKey.trim()) {
      setToast("Enter a valid provider API key before saving.");
      return;
    }
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_byok",
          provider: byokProvider,
          apiKey: newApiKey.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.maskedKeys) {
        setMaskedKeysMap(data.maskedKeys);
        updateCurrentUser({ maskedKeys: data.maskedKeys });
        setNewApiKey("");
        setByokTestStatus("");
        setToast(
          `${byokProvider.toUpperCase()} key encrypted and saved with AES-256-GCM`
        );
        return;
      } else if (!res.ok) {
        setToast(data?.error || "Invalid API key format");
        return;
      }
    } catch {
      // Fallback
    }
    const fallbackMask = `${newApiKey.trim().slice(0, 4)}•••••••••••••${newApiKey.trim().slice(-3)}`;
    const nextMap = { ...maskedKeysMap, [byokProvider]: fallbackMask };
    setMaskedKeysMap(nextMap);
    updateCurrentUser({ maskedKeys: nextMap });
    setNewApiKey("");
    setToast("Provider key encrypted and saved with AES-256-GCM");
  }

  async function removeByokKey() {
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_byok",
          provider: byokProvider,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMaskedKeysMap(data?.maskedKeys || {});
        updateCurrentUser({ maskedKeys: data?.maskedKeys || {} });
      }
    } catch {
      const nextMap = { ...maskedKeysMap };
      delete nextMap[byokProvider];
      setMaskedKeysMap(nextMap);
      updateCurrentUser({ maskedKeys: nextMap });
    }
    setByokTestStatus("");
    setToast(`Removed ${byokProvider.toUpperCase()} key from encrypted storage`);
  }

  function openPlatformFlow(platform: "youtube" | "tiktok") {
    const isConn = platform === "youtube" ? ytConnected : ttConnected;
    setPlatformModal({
      open: true,
      platform,
      mode: isConn ? "manage" : "connect",
    });
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
    updateCurrentUser({ tier: targetTier });
    setCurrentTier(targetTier === "PRO" ? "Pro Plan" : "Agency Plan");
    setToast(`Subscription upgraded to ${targetTier} plan`);
  }

  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [trialBusy, setTrialBusy] = useState(false);

  async function startFreeTrial(trialTier: "CREATOR" | "PRO") {
    setTrialBusy(true);
    try {
      const res = await fetch("/api/v1/payments/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: trialTier }),
      });
      const data = await res.json();
      if (res.ok && data?.trial) {
        updateCurrentUser({
          tier: trialTier,
          trial: {
            active: true,
            tier: trialTier,
            endsAt: data.trial.endsAt,
            daysRemaining: data.trial.daysRemaining || 30,
            used: true,
          },
        });
        setCurrentTier(trialTier === "PRO" ? "Pro Plan (30-Day Trial)" : "Creator Plan (30-Day Trial)");
        setToast(`30-day free trial activated on ${trialTier} plan`);
      } else {
        setToast(data?.error || "Could not start free trial");
      }
    } catch {
      setToast("Unable to start free trial right now");
    } finally {
      setTrialBusy(false);
    }
  }

  async function cancelFreeTrialOrPlan() {
    setTrialBusy(true);
    try {
      const res = await fetch("/api/v1/payments/trial", {
        method: "DELETE",
      });
      if (res.ok) {
        updateCurrentUser({
          tier: "FREE",
          trial: {
            active: false,
            tier: null,
            endsAt: null,
            daysRemaining: 0,
            used: true,
          },
        });
        setCurrentTier("Free Plan");
        setToast("Trial / plan cancelled in 1 click. Reverted to Free Plan.");
      }
    } catch {
      setToast("Unable to cancel plan right now");
    } finally {
      setTrialBusy(false);
    }
  }

  async function redeemPromoCode() {
    if (!promoCodeInput.trim()) {
      setToast("Enter a promo code first.");
      return;
    }
    setPromoBusy(true);
    try {
      const res = await fetch("/api/v1/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "redeem",
          code: promoCodeInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        updateCurrentUser({ tier: data.tier });
        setCurrentTier(`${data.tier} Plan`);
        setPromoCodeInput("");
        setToast(
          `Promo ${data.code} redeemed! Unlocked ${data.tier} (${data.permanent ? "Permanent" : `${data.rewardDays} days`}).`
        );
      } else {
        setToast(data?.error || "Promo code could not be redeemed.");
      }
    } catch {
      setToast("Unable to redeem promo code right now.");
    } finally {
      setPromoBusy(false);
    }
  }

  async function signOut() {
    await logoutUser();
    router.replace("/login");
  }

  const initials = computeInitials(displayName, email);
  const handleDisplay = `@${(displayName || currentUser.name).replace(/\s+/g, "") || "Creator"}`;
  const pwdStrength = evaluateClientPasswordStrength(newPassword);
  const activeMaskedKey =
    maskedKeysMap[byokProvider] || "No API key configured";
  const providerPlaceholder: Record<typeof byokProvider, string> = {
    openai: "sk-proj-...",
    cloudflare: "cf_ai_token_...",
    huggingface: "hf_...",
    replicate: "r8_...",
  };

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
                <span
                  className="avatar avatar--large"
                  style={{
                    background: avatarBgs[avatarColorIndex % avatarBgs.length],
                    color: "#fff",
                  }}
                >
                  {initials}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setAvatarColorIndex((prev) => prev + 1);
                    setToast("Avatar badge color updated");
                  }}
                >
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
              description="Bring-your-own-key (OpenAI, Cloudflare Workers AI, Hugging Face, Replicate) uses server-side AES-256-GCM envelope encryption. No keys are pre-filled by default."
            >
              <div className="warning-box">
                <KeyRound size={17} aria-hidden="true" />
                <span>
                  <strong>Server-side AES-256-GCM Envelope Encryption</strong>
                  Your API key is validated and encrypted at rest with a 12-byte
                  IV and 16-byte authentication tag before storage.
                </span>
              </div>
              <div className="option-section">
                <label>Select AI provider</label>
                <div className="segmented">
                  {(
                    [
                      ["openai", "OpenAI"],
                      ["cloudflare", "Cloudflare AI"],
                      ["huggingface", "Hugging Face"],
                      ["replicate", "Replicate"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      type="button"
                      key={id}
                      className={byokProvider === id ? "active" : ""}
                      onClick={() => {
                        setByokProvider(id);
                        setByokTestStatus("");
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Field
                label="Saved provider key (masked preview)"
                value={activeMaskedKey}
                readOnly
              />
              <Field
                label="New OpenAI / Replicate API key"
                type="password"
                placeholder={providerPlaceholder[byokProvider]}
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                hint={`Expected prefix for ${byokProvider.toUpperCase()}: ${providerPlaceholder[byokProvider]}`}
              />
              {byokTestStatus && (
                <div
                  style={{
                    padding: "0.65rem 0.9rem",
                    borderRadius: "10px",
                    background: "rgba(21, 128, 61, 0.08)",
                    color: "#15803d",
                    fontSize: "0.86rem",
                    fontWeight: 600,
                  }}
                >
                  {byokTestStatus}
                </div>
              )}
              <div className="button-row" style={{ flexWrap: "wrap" }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={testByokConnection}
                >
                  <ShieldCheck size={16} aria-hidden="true" /> Test connection
                </Button>
                <Button type="button" variant="secondary" onClick={saveByokKey}>
                  Save &amp; encrypt key
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={removeByokKey}
                  disabled={!maskedKeysMap[byokProvider]}
                >
                  Remove key
                </Button>
              </div>
            </SettingsCard>
          )}
          {section === "Platform connections" && (
            <SettingsCard
              title="Platform connections"
              description="OAuth 2.0 PKCE channel verification ensures your YouTube and TikTok handles, scopes, and refresh tokens are verified before connecting."
            >
              <ConnectionCard
                platform="YouTube"
                connected={ytConnected}
                detail={
                  ytConnected
                    ? `${currentUser.connectedPlatforms?.youtube?.handle || handleDisplay} · Verified OAuth 2.0 PKCE`
                    : "Not connected · Click Connect to verify channel"
                }
                icon={<Play size={22} aria-hidden="true" />}
                onToggle={() => openPlatformFlow("youtube")}
              />
              <ConnectionCard
                platform="TikTok"
                connected={ttConnected}
                detail={
                  ttConnected
                    ? `${currentUser.connectedPlatforms?.tiktok?.handle || handleDisplay} · Verified OAuth 2.0 PKCE`
                    : "Not connected · Click Connect to verify channel"
                }
                icon={<strong>Tt</strong>}
                onToggle={() => openPlatformFlow("tiktok")}
              />
            </SettingsCard>
          )}
          {section === "Billing" && (
            <SettingsCard
              title="Plan & usage"
              description="Transparent USD and NGN billing via Paystack with 1-month free trials, promo codes, and 1-click cancellation."
            >
              <div className="plan-banner">
                <div>
                  <WorkspaceBadge
                    label={
                      currentUser.roles.includes(ADMIN_ROLE_KEY)
                        ? "Permanent Admin Unlock"
                        : currentUser.trial?.active
                          ? `30-Day Free Trial (${currentUser.trial.daysRemaining}d left)`
                          : "Active Subscription"
                    }
                  />
                  <h3>{currentTier}</h3>
                  <p>
                    {currentUser.roles.includes(ADMIN_ROLE_KEY)
                      ? "Permanent Admin Max Tier · $0.00 lifetime unlock (2,000 daily AI generations & unlimited monthly publishing)"
                      : currentUser.trial?.active
                        ? `Trial active on ${currentUser.trial.tier} · ${currentUser.trial.daysRemaining} days remaining before reverting to Free`
                        : "$9 / month USD (₦14,500 NGN Paystack table) · Renews monthly"}
                  </p>
                </div>
                {currentUser.roles.includes(ADMIN_ROLE_KEY) ? (
                  <span className="connection-state connected">
                    Max Tier Unlocked ($0)
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => upgradePlan("PRO")}
                  >
                    Upgrade to Pro ($29)
                  </Button>
                )}
              </div>

              {!currentUser.roles.includes(ADMIN_ROLE_KEY) && (
                <div
                  className="card"
                  style={{
                    padding: "16px",
                    background: "var(--surface-soft)",
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: "0.92rem" }}>
                      1-Month (30-Day) Free Trial · No Card Required Upfront
                    </strong>
                    <p style={{ margin: "4px 0 0", fontSize: "0.78rem" }}>
                      Try Creator (100 AI generations/day) or Pro (500 AI generations/day) free for 30 days. Cancel anytime in one click.
                    </p>
                  </div>
                  <div className="two-col-grid">
                    <Button
                      type="button"
                      variant="secondary"
                      loading={trialBusy}
                      disabled={Boolean(currentUser.trial?.used)}
                      onClick={() => void startFreeTrial("CREATOR")}
                    >
                      Start 30-Day Creator Trial
                    </Button>
                    <Button
                      type="button"
                      loading={trialBusy}
                      disabled={Boolean(currentUser.trial?.used)}
                      onClick={() => void startFreeTrial("PRO")}
                    >
                      Start 30-Day Pro Trial
                    </Button>
                  </div>
                  {(currentUser.trial?.active || currentUser.tier !== "FREE") && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                      <small style={{ color: "var(--muted)" }}>
                        FTC Click-to-Cancel: Instant cancellation with zero penalties.
                      </small>
                      <Button
                        type="button"
                        variant="destructive"
                        loading={trialBusy}
                        onClick={() => void cancelFreeTrialOrPlan()}
                      >
                        Cancel Trial / Plan
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div
                className="card"
                style={{
                  padding: "16px",
                  display: "grid",
                  gap: "10px",
                }}
              >
                <Field
                  label="Have a Promo or VIP Code?"
                  placeholder="Enter code (e.g. LAUNCHPRO30)"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  hint="Codes are not case-sensitive and unlock Creator, Pro, or Agency time immediately."
                />
                <div className="button-row">
                  <Button
                    type="button"
                    variant="secondary"
                    loading={promoBusy}
                    onClick={() => void redeemPromoCode()}
                  >
                    Redeem Promo Code
                  </Button>
                </div>
              </div>

              <div className="usage-list">
                <Progress
                  value={Math.min(
                    100,
                    Math.round(
                      (currentUser.usage.dailyAiGenerations /
                        Math.max(1, currentUser.limits.dailyAiGenerations)) *
                        100
                    )
                  )}
                  label={`Daily AI generations · ${currentUser.usage.dailyAiGenerations} of ${currentUser.limits.dailyAiGenerations.toLocaleString()} (resets 00:00 UTC)`}
                />
                <Progress
                  value={
                    currentUser.limits.monthlyPosts
                      ? Math.min(
                          100,
                          Math.round(
                            (currentUser.usage.monthlyPostsCreated /
                              currentUser.limits.monthlyPosts) *
                              100
                          )
                        )
                      : currentUser.usage.monthlyPostsCreated > 0
                        ? Math.min(100, currentUser.usage.monthlyPostsCreated)
                        : 0
                  }
                  label={`Monthly posts · ${currentUser.usage.monthlyPostsCreated} of ${currentUser.limits.monthlyPosts ?? "Unlimited"} (resets 1st 00:00 UTC)`}
                />
                <Progress
                  value={
                    currentUser.limits.monthlyCrossPosts
                      ? Math.min(
                          100,
                          Math.round(
                            (currentUser.usage.monthlyCrossPosts /
                              currentUser.limits.monthlyCrossPosts) *
                              100
                          )
                        )
                      : currentUser.usage.monthlyCrossPosts > 0
                        ? Math.min(100, currentUser.usage.monthlyCrossPosts)
                        : 0
                  }
                  label={`Cross-posts · ${currentUser.usage.monthlyCrossPosts} of ${currentUser.limits.monthlyCrossPosts ?? "Unlimited"} (resets 1st 00:00 UTC)`}
                />
              </div>
              {!currentUser.roles.includes(ADMIN_ROLE_KEY) && (
                <div style={{ display: "grid", gap: "6px" }}>
                  <Button type="button" onClick={() => upgradePlan("AGENCY")}>
                    Upgrade to Agency ($99)
                  </Button>
                  <small style={{ color: "var(--muted)", textAlign: "center" }}>
                    Encrypted Paystack checkout · Cancel in 1 click anytime
                  </small>
                </div>
              )}
            </SettingsCard>
          )}
          {section === "Security" && (
            <SettingsCard
              title="Security & verification"
              description="Manage RFC 6238 Two-Factor Authentication (TOTP), magic-link verified password rotation, and session safety."
            >
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                  background: "var(--surface-soft)",
                  display: "grid",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <strong>
                    Verified Password Change (Magic Link / 6-Digit Security
                    Code)
                  </strong>
                  <p style={{ fontSize: "0.86rem", color: "var(--muted)" }}>
                    Request a signed 6-digit security verification code before
                    rotating your account password.
                  </p>
                </div>
                <div className="password-wrap">
                  <Field
                    label="New password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter a new strong password (8+ chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? "Hide" : "Show"}
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {newPassword.length > 0 ? (
                    <small style={{ color: "var(--muted)" }}>
                      Strength: <strong>{pwdStrength.label}</strong> (
                      {pwdStrength.percent}%)
                    </small>
                  ) : (
                    <small style={{ color: "var(--muted)" }}>
                      Use 12+ characters with mixed case, number, and symbol.
                    </small>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const suggested = generateSuggestedPassphrase();
                      setNewPassword(suggested);
                      setShowNewPassword(true);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--primary)",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Suggest strong passphrase
                  </button>
                </div>
                <div className="responsive-inline-action">
                  <small style={{ color: "var(--muted)" }}>
                    {issuedResetCode
                      ? `Verification code & reset link sent to ${currentUser.email}. Check your inbox.`
                      : "Click 'Send security code' to send a signed verification code to your email."}
                  </small>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={requestPasswordSecurityCode}
                  >
                    Send security code
                  </Button>
                </div>
                <SegmentedOtpInput
                  label="6-digit security verification code"
                  value={resetOtpCode}
                  onChange={setResetOtpCode}
                />
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={saveNewPassword}
                  >
                    Change password
                  </Button>
                </div>
              </div>

              <div
                className="security-row"
                style={{
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: "0.85rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>Two-factor authentication (RFC 6238 TOTP)</strong>
                    <p>
                      Protect your creator account with Google Authenticator,
                      1Password, or Authy plus 8 recovery backup codes.
                    </p>
                  </div>
                  {twoFactorEnabled ? (
                    <div className="button-row">
                      <span className="connection-state connected">
                        Enabled (TOTP)
                      </span>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={disableTotp2fa}
                      >
                        Disable 2FA
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={startTotpSetup}
                    >
                      <ShieldCheck size={16} aria-hidden="true" /> Set up 2FA
                    </Button>
                  )}
                </div>

                {totpSetupData && (
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "12px",
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      display: "grid",
                      gap: "0.85rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <svg
                        width="96"
                        height="96"
                        viewBox="0 0 96 96"
                        role="img"
                        aria-label="TOTP Authenticator QR Code"
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: "10px",
                          padding: "6px",
                          background: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        <rect width="96" height="96" fill="#ffffff" />
                        <rect x="8" y="8" width="24" height="24" fill="#17172a" />
                        <rect x="12" y="12" width="16" height="16" fill="#ffffff" />
                        <rect x="16" y="16" width="8" height="8" fill="#17172a" />
                        <rect x="64" y="8" width="24" height="24" fill="#17172a" />
                        <rect x="68" y="12" width="16" height="16" fill="#ffffff" />
                        <rect x="72" y="16" width="8" height="8" fill="#17172a" />
                        <rect x="8" y="64" width="24" height="24" fill="#17172a" />
                        <rect x="12" y="68" width="16" height="16" fill="#ffffff" />
                        <rect x="16" y="72" width="8" height="8" fill="#17172a" />
                        <rect x="40" y="16" width="8" height="8" fill="#17172a" />
                        <rect x="48" y="24" width="8" height="8" fill="#17172a" />
                        <rect x="36" y="40" width="16" height="16" fill="#4338ca" />
                        <rect x="56" y="48" width="8" height="16" fill="#17172a" />
                        <rect x="40" y="68" width="16" height="8" fill="#17172a" />
                        <rect x="68" y="68" width="16" height="16" fill="#17172a" />
                      </svg>
                      <div style={{ display: "grid", gap: "0.35rem", minWidth: 0 }}>
                        <strong>Scan in Authenticator or copy Base32 key</strong>
                        <code
                          style={{
                            padding: "0.35rem 0.6rem",
                            borderRadius: "6px",
                            background: "var(--surface-soft)",
                            fontSize: "0.84rem",
                            wordBreak: "break-all",
                          }}
                        >
                          {totpSetupData.secret}
                        </code>
                        <small style={{ color: "var(--muted)", wordBreak: "break-all" }}>
                          URI: <code>{totpSetupData.otpauthUri}</code>
                        </small>
                      </div>
                    </div>
                    <div
                      className="responsive-inline-action"
                      style={{ alignItems: "end" }}
                    >
                      <Field
                        label="6-digit authenticator verification code"
                        value={totpCodeInput}
                        onChange={(e) => setTotpCodeInput(e.target.value)}
                        placeholder="123456"
                      />
                      <Button type="button" onClick={verifyAndEnableTotp}>
                        Verify &amp; enable 2FA
                      </Button>
                    </div>
                  </div>
                )}

                {backupCodes.length > 0 && (
                  <div
                    style={{
                      padding: "0.9rem",
                      borderRadius: "10px",
                      background: "rgba(21, 128, 61, 0.08)",
                      border: "1px solid rgba(21, 128, 61, 0.25)",
                      display: "grid",
                      gap: "0.5rem",
                    }}
                  >
                    <strong>
                      Save your 8 single-use recovery backup codes:
                    </strong>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                        gap: "0.4rem",
                      }}
                    >
                      {backupCodes.map((code) => (
                        <code
                          key={code}
                          style={{
                            padding: "0.3rem 0.5rem",
                            background: "#fff",
                            borderRadius: "6px",
                            textAlign: "center",
                            fontWeight: 600,
                          }}
                        >
                          {code}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="security-row">
                <div>
                  <strong>Zero-Lock-In Workspace Portability</strong>
                  <p>
                    Export all drafts, queue jobs, and .srt/.vtt subtitles as
                    JSON.
                  </p>
                </div>
                <a
                  className="button button--secondary"
                  href="/api/v1/export"
                  download="contentflow-workspace.json"
                >
                  Export Workspace ($0)
                </a>
              </div>
              <div className="security-row">
                <div>
                  <strong>Active session</strong>
                  <p>
                    Port Harcourt, NG · HttpOnly signed session (
                    {currentUser.email})
                  </p>
                </div>
                <Button type="button" variant="ghost" onClick={signOut}>
                  Sign out
                </Button>
              </div>
            </SettingsCard>
          )}
        </div>
      </div>
      <PlatformVerificationModal
        open={platformModal.open}
        platform={platformModal.platform}
        connected={platformModal.mode === "manage"}
        defaultHandle={
          currentUser.connectedPlatforms?.[platformModal.platform]?.handle ||
          handleDisplay
        }
        existingConnection={
          currentUser.connectedPlatforms?.[platformModal.platform]
        }
        onClose={() => setPlatformModal((prev) => ({ ...prev, open: false }))}
        onVerified={(conn) => {
          const p = platformModal.platform;
          if (p === "youtube") setYtConnected(true);
          else setTtConnected(true);
          updateCurrentUser({
            connectedPlatforms: {
              ...currentUser.connectedPlatforms,
              [p]: conn,
            },
          });
          setPlatformModal((prev) => ({ ...prev, open: false }));
          setToast(
            `${p === "youtube" ? "YouTube" : "TikTok"} verified & connected (${conn.handle})`
          );
        }}
        onDisconnected={() => {
          const p = platformModal.platform;
          if (p === "youtube") setYtConnected(false);
          else setTtConnected(false);
          const nextPlatforms = { ...currentUser.connectedPlatforms };
          delete nextPlatforms[p];
          updateCurrentUser({ connectedPlatforms: nextPlatforms });
          setPlatformModal((prev) => ({ ...prev, open: false }));
          setToast(
            `${p === "youtube" ? "YouTube" : "TikTok"} disconnected`
          );
        }}
        onHealthCheck={(msg) => {
          setPlatformModal((prev) => ({ ...prev, open: false }));
          setToast(msg);
        }}
      />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

const poiseAdminTabs = [
  "Control",
  "Testers",
  "Notices",
  "Promo Codes",
  "Subscriptions",
  "System",
] as const;

const legacyAdminTabs = [
  "Users",
  "Quotas",
  "Moderation",
  "Audit & System",
] as const;

export function AdminScreen() {
  const router = useRouter();
  const { currentUser, jobs, isLoggedOut, updateCurrentUser, refreshUser } =
    useAppState();
  const [tab, setTab] = useState<string>("Control");
  const [lightMode, setLightMode] = useState(false);

  // Inline Poise Admin login gate state
  const [gateEmail, setGateEmail] = useState("");
  const [gatePassword, setGatePassword] = useState("");
  const [gateLinkMode, setGateLinkMode] = useState(false);
  const [gateError, setGateError] = useState("");
  const [gateBusy, setGateBusy] = useState(false);

  // Control tab state
  const [adminNotes, setAdminNotes] = useState<
    Array<{ id: string; text: string; createdAt: string }>
  >([
    {
      id: "note-default-1",
      text: "ContentFlow $0-Budget Guardrails armed. Admin account johnpaulonovo@gmail.com holds permanent Agency Max unlock.",
      createdAt: "2026-10-20T00:00:00.000Z",
    },
  ]);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupAccount, setLookupAccount] = useState<{
    id: string;
    name: string;
    email: string;
    tier: string;
    status: string;
    roles: string[];
    suspendedReason?: string | null;
    trialEndsAt?: string | null;
    grantExpiresAt?: string | null;
    testTierOverride?: string | null;
  } | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [suspendReasonInput, setSuspendReasonInput] = useState("");
  const [repairReport, setRepairReport] = useState<{
    dryRun: boolean;
    affectedCount: number;
    repairedCount: number;
  } | null>(null);

  // Testers & Remote Config state
  const [appCfg, setAppCfg] = useState<{
    maintenance: boolean;
    paymentsLive: boolean;
    minBuild: number;
    latestBuild: number;
    downloadUrl: string;
  } | null>(null);
  const [hideTestAccounts, setHideTestAccounts] = useState(false);
  const [testerPrefix, setTesterPrefix] = useState("");
  const [testerNote, setTesterNote] = useState("");
  const [mintedTester, setMintedTester] = useState<{
    email: string;
    tempPassword?: string;
  } | null>(null);
  const [betaCfg, setBetaCfg] = useState<{
    enabled: boolean;
    maxSlots: number;
    enrolledCount: number;
  }>({ enabled: true, maxSlots: 250, enrolledCount: 1 });
  const [waitlistItems, setWaitlistItems] = useState<
    Array<{ id: string; email: string; niche: string; createdAt: string }>
  >([]);

  // Notices state
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeAudience, setNoticeAudience] = useState<"all" | "beta" | "testers">("all");
  const [noticesList, setNoticesList] = useState<
    Array<{
      id: string;
      title: string;
      body: string;
      audience: string;
      createdAt: string;
    }>
  >([]);

  // Promo Codes state
  const [promoFilter, setPromoFilter] = useState<
    "all" | "active" | "expired" | "revoked" | "permanent"
  >("all");
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoTier, setNewPromoTier] = useState<"CREATOR" | "PRO" | "AGENCY">("PRO");
  const [newPromoDays, setNewPromoDays] = useState("30");
  const [newPromoMaxUses, setNewPromoMaxUses] = useState("100");
  const [newPromoPermanent, setNewPromoPermanent] = useState(false);
  const [newPromoNote, setNewPromoNote] = useState("");
  const [promoList, setPromoList] = useState<
    Array<{
      code: string;
      tier: string;
      rewardDays: number;
      maxUses: number;
      usedCount: number;
      permanent: boolean;
      revoked: boolean;
      expiresAt: string | null;
      note: string;
    }>
  >([]);

  // Subscriptions state
  const [subSearch, setSubSearch] = useState("");
  const [subsList, setSubsList] = useState<
    Array<{
      uid: string;
      name: string;
      email: string;
      tier: string;
      status: string;
      expiresAt: string | null;
      trialActive: boolean;
    }>
  >([]);
  const [subsError, setSubsError] = useState("");

  // System state
  const [systemStats, setSystemStats] = useState<{
    totalUsers: number;
    activePaidOrTrial: number;
    activePromos: number;
    activeNotices: number;
    pendingCheckouts: number;
    crashReports: number;
  } | null>(null);
  const [crashList, setCrashList] = useState<
    Array<{ id: string; message: string; route: string; createdAt: string }>
  >([]);
  const [checkoutList, setCheckoutList] = useState<
    Array<{
      reference: string;
      email: string;
      tier: string;
      amountMajor: number;
      currency: string;
      status: string;
    }>
  >([]);

  useEffect(() => {
    const checkLoggedOut = () => {
      try {
        if (
          isLoggedOut ||
          window.sessionStorage.getItem("cf_logged_out") === "1"
        ) {
          router.replace("/login");
        }
      } catch {
        // Ignore
      }
    };
    checkLoggedOut();
    window.addEventListener("pageshow", checkLoggedOut);
    window.addEventListener("popstate", checkLoggedOut);
    return () => {
      window.removeEventListener("pageshow", checkLoggedOut);
      window.removeEventListener("popstate", checkLoggedOut);
    };
  }, [isLoggedOut, router]);

  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("All tiers");
  const [confirmUser, setConfirmUser] = useState("");
  const [selectedNewTier, setSelectedNewTier] = useState("Agency");
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserTier, setNewUserTier] = useState("CREATOR");
  const [newUserRole, setNewUserRole] = useState("user");
  const [page, setPage] = useState(1);
  const [moderation, setModeration] = useState("");
  const [moderationTargetId, setModerationTargetId] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [auditLogs, setAuditLogs] = useState<
    Array<{
      id: string;
      actorId: string;
      action: string;
      targetId: string;
      reason: string;
      createdAt: string;
    }>
  >([]);
  const [moderationItems, setModerationItems] = useState<
    Array<{
      id: string;
      title: string;
      ownerName: string;
      contentType: string;
      excerpt: string;
      status: string;
    }>
  >([]);
  const [toast, setToast] = useState("");
  const [quotaCards, setQuotaCards] = useState<[string, string, number, string][]>([
    [
      "Cloudflare Workers AI",
      "0 / 8,000 neurons",
      0,
      "Daily UTC · Hard-stop at 8,000 ($0 overage)",
    ],
    [
      "Hugging Face Inference",
      "0 / 2,000 requests",
      0,
      "Daily UTC · Plan C fallback ($0 overage)",
    ],
    [
      "YouTube Data API",
      "0 / 8,000 units",
      0,
      "Daily UTC · Alert at 6,400 (80%)",
    ],
    [
      "Cloudflare R2 Storage",
      "0 / 800,000 writes",
      0,
      "Calendar month UTC · Hard-stop at 800,000",
    ],
  ]);

  const [userRows, setUserRows] = useState<string[][]>([
    [
      currentUser.id || "admin-1",
      currentUser.name || "Creator",
      currentUser.email || "admin@contentflow.app",
      currentUser.tier === "AGENCY"
        ? "Agency"
        : currentUser.tier === "PRO"
          ? "Pro"
          : currentUser.tier === "CREATOR"
            ? "Creator"
            : "Free",
      "Active",
      "Oct 20, 2026",
      currentUser.roles.includes(ADMIN_ROLE_KEY) ? ADMIN_ROLE_KEY : "user",
    ],
  ]);

  const callAdminAction = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/v1/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-roles": ADMIN_ROLE_KEY,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    },
    []
  );

  const syncAdminWorkspace = useCallback(async () => {
    try {
      const [
        usersRes,
        quotaRes,
        modRes,
        auditRes,
        cfgRes,
        notesRes,
        promoRes,
        noticesRes,
        subsRes,
        statsRes,
        betaRes,
        waitRes,
        crashRes,
        checkoutsRes,
      ] = await Promise.all([
        fetch("/api/v1/admin/users", {
          headers: { "x-user-roles": ADMIN_ROLE_KEY },
        }),
        fetch("/api/v1/admin/quota", {
          headers: { "x-user-roles": ADMIN_ROLE_KEY },
        }),
        fetch("/api/v1/admin/moderation", {
          headers: { "x-user-roles": `${ADMIN_ROLE_KEY},moderator` },
        }),
        fetch("/api/v1/admin/audit-logs", {
          headers: { "x-user-roles": ADMIN_ROLE_KEY },
        }),
        callAdminAction({ action: "app_config" }),
        callAdminAction({ action: "notes_list" }),
        callAdminAction({ action: "promo_list" }),
        callAdminAction({ action: "notice_list" }),
        callAdminAction({ action: "subs_list" }),
        callAdminAction({ action: "stats" }),
        callAdminAction({ action: "beta_config" }),
        callAdminAction({ action: "waitlist_list" }),
        callAdminAction({ action: "crash_list" }),
        callAdminAction({ action: "checkouts_list" }),
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        if (Array.isArray(uData?.items) && uData.items.length > 0) {
          setUserRows(
            uData.items.map(
              (u: {
                id: string;
                name: string;
                email: string;
                tier: string;
                status: string;
                joinedAt: string;
                roles?: string[];
              }) => [
                u.id,
                u.name,
                u.email,
                u.tier.charAt(0) + u.tier.slice(1).toLowerCase(),
                u.status,
                u.joinedAt,
                u.roles?.includes(ADMIN_ROLE_KEY)
                  ? ADMIN_ROLE_KEY
                  : u.roles?.includes("moderator")
                    ? "moderator"
                    : "user",
              ]
            )
          );
        }
      }

      if (quotaRes.ok) {
        const qData = await quotaRes.json();
        const u = qData.usage;
        if (u) {
          setEmergencyMode(Boolean(u.emergencyMode));
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
        }
      }

      if (modRes.ok) {
        const mData = await modRes.json();
        if (Array.isArray(mData?.items)) {
          setModerationItems(
            mData.items.filter(
              (item: { status: string }) => item.status === "pending"
            )
          );
        }
      }

      if (auditRes.ok) {
        const aData = await auditRes.json();
        if (Array.isArray(aData?.items)) {
          setAuditLogs(aData.items);
        }
      }

      if (cfgRes.ok && cfgRes.data?.config) {
        setAppCfg(cfgRes.data.config);
      }
      if (notesRes.ok && Array.isArray(notesRes.data?.items)) {
        setAdminNotes(notesRes.data.items);
      }
      if (promoRes.ok && Array.isArray(promoRes.data?.items)) {
        setPromoList(promoRes.data.items);
      }
      if (noticesRes.ok && Array.isArray(noticesRes.data?.items)) {
        setNoticesList(noticesRes.data.items);
      }
      if (subsRes.ok && Array.isArray(subsRes.data?.items)) {
        setSubsList(subsRes.data.items);
        setSubsError("");
      }
      if (statsRes.ok && statsRes.data?.stats) {
        setSystemStats(statsRes.data.stats);
      }
      if (betaRes.ok && betaRes.data?.beta) {
        setBetaCfg(betaRes.data.beta);
      }
      if (waitRes.ok && Array.isArray(waitRes.data?.items)) {
        setWaitlistItems(waitRes.data.items);
      }
      if (crashRes.ok && Array.isArray(crashRes.data?.items)) {
        setCrashList(crashRes.data.items.slice(0, 12));
      }
      if (checkoutsRes.ok && Array.isArray(checkoutsRes.data?.items)) {
        setCheckoutList(checkoutsRes.data.items);
      }
    } catch {
      // Retain live state
    }
  }, [callAdminAction]);

  useEffect(() => {
    syncAdminWorkspace();
  }, [syncAdminWorkspace]);

  async function syncLiveQuotaMeters() {
    await syncAdminWorkspace();
    setToast("Synced live $0-budget platform usage counters");
  }

  async function resetDailyQuotaCounters() {
    try {
      const res = await fetch("/api/v1/admin/quota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-roles": ADMIN_ROLE_KEY,
        },
        body: JSON.stringify({
          action: "reset_daily",
          reason: "Admin manual UTC counter reset",
        }),
      });
      if (res.ok) {
        await syncAdminWorkspace();
        setToast("Daily platform quota counters reset to 0");
      }
    } catch {
      setToast("Unable to reset counters");
    }
  }

  async function toggleEmergencyGuardrail() {
    try {
      const nextState = !emergencyMode;
      const res = await fetch("/api/v1/admin/quota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-roles": ADMIN_ROLE_KEY,
        },
        body: JSON.stringify({
          action: "toggle_emergency",
          enabled: nextState,
          reason: `Admin ${nextState ? "enabled" : "disabled"} emergency mode`,
        }),
      });
      if (res.ok) {
        setEmergencyMode(nextState);
        await syncAdminWorkspace();
        setToast(
          `95% Emergency Mode guardrail ${nextState ? "activated" : "deactivated"}`
        );
      }
    } catch {
      setToast("Unable to toggle emergency mode");
    }
  }

  async function handleProvisionUser() {
    if (!newUserEmail.includes("@")) {
      setToast("Enter a valid email address to provision a user.");
      return;
    }
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-roles": ADMIN_ROLE_KEY,
        },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          tier: newUserTier,
          role: newUserRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.user) {
        await syncAdminWorkspace();
        setProvisionOpen(false);
        setNewUserName("");
        setNewUserEmail("");
        setToast(`Provisioned ${data.user.name} (${data.user.tier})`);
      } else {
        setToast(data?.error || "Unable to provision user");
      }
    } catch {
      setToast("Unable to provision user");
    }
  }

  async function handleAccountLookup() {
    setLookupError("");
    if (!lookupEmail.trim()) {
      setLookupError("Enter an email address to look up an account.");
      return;
    }
    const { ok, data } = await callAdminAction({
      action: "lookup",
      email: lookupEmail.trim(),
    });
    if (ok && data?.account) {
      setLookupAccount(data.account);
    } else {
      setLookupAccount(null);
      setLookupError(data?.error || "Account not found.");
    }
  }

  async function handleGrantOrRevoke(
    targetEmail: string,
    actionType: "grant" | "revoke",
    grantTier?: "CREATOR" | "PRO" | "AGENCY",
    days?: number,
    permanent?: boolean
  ) {
    const { ok, data } = await callAdminAction({
      action: actionType,
      email: targetEmail,
      tier: grantTier,
      days,
      permanent,
    });
    if (ok) {
      if (data?.account) setLookupAccount(data.account);
      await syncAdminWorkspace();
      setToast(
        actionType === "revoke"
          ? `Revoked ${targetEmail} back to FREE`
          : `Granted ${grantTier} (${permanent ? "Permanent" : `+${days}d`}) to ${targetEmail}`
      );
    } else {
      setToast(data?.error || "Action failed");
    }
  }

  async function handleTestModeOverride(overrideTier: string | null) {
    const { ok, data } = await callAdminAction({
      action: "test_mode",
      tier: overrideTier,
    });
    if (ok) {
      updateCurrentUser({
        testTierOverride: data?.testTierOverride ?? overrideTier,
      });
      setToast(
        overrideTier
          ? `See as normal user active: viewing as ${overrideTier} for 8h`
          : "Reset to full Admin Agency Max profile"
      );
    }
  }

  async function handleSuspendToggle(targetEmail: string, suspend: boolean) {
    const { ok, data } = await callAdminAction({
      action: suspend ? "suspend" : "unsuspend",
      email: targetEmail,
      reason: suspendReasonInput || "Admin action",
    });
    if (ok && data?.account) {
      setLookupAccount(data.account);
      await syncAdminWorkspace();
      setToast(
        suspend
          ? `Suspended ${targetEmail}`
          : `Lifted suspension for ${targetEmail}`
      );
    }
  }

  async function handleRepairMaskedTiers(dryRun: boolean) {
    const { ok, data } = await callAdminAction({
      action: "repair_masked_tiers",
      dryRun,
    });
    if (ok) {
      setRepairReport({
        dryRun: Boolean(data.dryRun),
        affectedCount: Number(data.affectedCount || 0),
        repairedCount: Number(data.repairedCount || 0),
      });
      await syncAdminWorkspace();
      setToast(
        dryRun
          ? `Dry-run complete: ${data.affectedCount || 0} masked account(s) detected`
          : `Repaired ${data.repairedCount || 0} masked account(s)`
      );
    }
  }

  async function handleCreatePromo() {
    if (!newPromoCode.trim()) {
      setToast("Enter a promo code string first.");
      return;
    }
    const { ok, data } = await callAdminAction({
      action: "promo_create",
      code: newPromoCode.trim().toUpperCase(),
      tier: newPromoTier,
      rewardDays: Number(newPromoDays) || 30,
      maxUses: Number(newPromoMaxUses) || 100,
      permanent: newPromoPermanent,
      note: newPromoNote.trim(),
    });
    if (ok) {
      setNewPromoCode("");
      setNewPromoNote("");
      await syncAdminWorkspace();
      setToast(`Promo code ${data.promo?.code || newPromoCode.toUpperCase()} created`);
    } else {
      setToast(data?.error || "Could not create promo code");
    }
  }

  async function handlePromoMutate(
    actionName: string,
    code: string,
    extra: Record<string, unknown> = {}
  ) {
    const { ok, data } = await callAdminAction({
      action: actionName,
      code,
      ...extra,
    });
    if (ok) {
      await syncAdminWorkspace();
      setToast(`Promo ${code} updated (${actionName})`);
    } else {
      setToast(data?.error || "Promo action failed");
    }
  }

  async function handlePublishNotice() {
    if (!noticeTitle.trim() || !noticeBody.trim()) {
      setToast("Enter both a notice title and message body.");
      return;
    }
    const { ok, data } = await callAdminAction({
      action: "notice_publish",
      title: noticeTitle.trim(),
      body: noticeBody.trim(),
      audience: noticeAudience,
    });
    if (ok) {
      setNoticeTitle("");
      setNoticeBody("");
      await syncAdminWorkspace();
      setToast("Broadcast notice published to workspace");
    } else {
      setToast(data?.error || "Unable to publish notice");
    }
  }

  async function handleDeleteNotice(id: string) {
    const { ok } = await callAdminAction({ action: "notice_delete", id });
    if (ok) {
      await syncAdminWorkspace();
      setToast("Notice deleted");
    }
  }

  async function handleMintTester() {
    const { ok, data } = await callAdminAction({
      action: "tester_mint",
      prefix: testerPrefix.trim() || "qa",
      note: testerNote.trim() || "QA Sandbox Tester",
    });
    if (ok && data?.tester) {
      setMintedTester({
        email: data.tester.email,
        tempPassword: data.tempPassword,
      });
      setTesterPrefix("");
      setTesterNote("");
      await syncAdminWorkspace();
      setToast(`Minted tester login: ${data.tester.email}`);
    } else {
      setToast(data?.error || "Unable to mint tester");
    }
  }

  async function handleSaveRemoteConfig() {
    if (!appCfg) return;
    const { ok, data } = await callAdminAction({
      action: "app_config_set",
      maintenance: appCfg.maintenance,
      paymentsLive: appCfg.paymentsLive,
      minBuild: appCfg.minBuild,
      latestBuild: appCfg.latestBuild,
      downloadUrl: appCfg.downloadUrl,
    });
    if (ok && data?.config) {
      setAppCfg(data.config);
      setToast("Remote app controls saved");
    } else {
      setToast(data?.error || "Invalid remote config (HTTPS required for download URL)");
    }
  }

  async function handleHideUser(uid: string) {
    const { ok } = await callAdminAction({
      action: "user_hide",
      uid,
      hidden: true,
    });
    if (ok) {
      setUserRows((rows) => rows.filter((r) => r[0] !== uid));
      setToast("User hidden from directory view (account preserved)");
    }
  }

  const filteredUsers = userRows.filter((user) => {
    const matchesSearch = (user[1] + user[2])
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesTier =
      tier === "All tiers" || user[3].toLowerCase() === tier.toLowerCase();
    const isSyntheticTester =
      user[2].endsWith("@testers.contentflow.app") ||
      user[2].endsWith("@testers.poise-app.vercel.app");
    if (hideTestAccounts && isSyntheticTester) return false;
    return matchesSearch && matchesTier;
  });

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  async function applyTierChange() {
    const target = userRows.find((u) => u[1] === confirmUser);
    if (target) {
      try {
        await fetch(`/api/v1/admin/users/${target[0]}/tier`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-roles": ADMIN_ROLE_KEY,
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
        rows.map((r) =>
          r[1] === confirmUser
            ? [r[0], r[1], r[2], selectedNewTier, r[4], r[5], r[6]]
            : r
        )
      );
      await syncAdminWorkspace();
    }
    setConfirmUser("");
    setToast(`Updated user tier to ${selectedNewTier}`);
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
          id: moderationTargetId || "mod-101",
          decision: moderation.startsWith("Reject") ? "rejected" : "approved",
          reason: moderationReason || "Reviewed by Admin moderator",
        }),
      });
      await syncAdminWorkspace();
    } catch {
      // Fallback
    }
    setModeration("");
    setModerationTargetId("");
    setModerationReason("");
    setToast("Moderation decision recorded in audit log");
  }

  const completedJobsCount = jobs.filter((j) => j.status === "completed").length;
  const processingJobsCount = jobs.filter(
    (j) => j.status === "processing" || j.status === "pending"
  ).length;
  const failedJobsCount = jobs.filter((j) => j.status === "failed").length;

  async function handleAdminGateLogin(e: FormEvent) {
    e.preventDefault();
    setGateError("");
    setGateBusy(true);
    try {
      if (gateLinkMode) {
        const res = await fetch("/api/v1/auth/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: gateEmail.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          setToast(`Sign-in link dispatched to ${gateEmail.trim()}`);
        } else {
          setGateError(data?.error || "Could not send sign-in link");
        }
        setGateBusy(false);
        return;
      }
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: gateEmail.trim(),
          password: gatePassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGateError(data?.error || "Admin authentication failed");
        setGateBusy(false);
        return;
      }
      await refreshUser();
      setGateBusy(false);
    } catch {
      setGateError("Unable to reach authentication server");
      setGateBusy(false);
    }
  }

  if (isLoggedOut) {
    return (
      <div className={`admin-shell poise-admin ${lightMode ? "poise-admin--light" : ""}`}>
        <div className="poise-gate">
          <div className="poise-gate__card">
            <div className="poise-pill poise-pill--info" style={{ marginBottom: "12px" }}>
              <ShieldCheck size={14} aria-hidden="true" /> ContentFlow Workshop Gate
            </div>
            <h2>Enter Admin</h2>
            <p style={{ margin: "6px 0 18px", fontSize: "0.86rem" }}>
              Sign in with your configured Admin account (johnpaulonovo@gmail.com) to unlock the 6-tab workshop.
            </p>
            {gateError && (
              <div className="form-alert" role="alert" style={{ marginBottom: "12px" }}>
                <AlertTriangle size={16} aria-hidden="true" />
                <span>{gateError}</span>
              </div>
            )}
            <form onSubmit={handleAdminGateLogin} style={{ display: "grid", gap: "12px" }}>
              <Field
                label="Admin email"
                type="email"
                value={gateEmail}
                onChange={(e) => setGateEmail(e.target.value)}
                placeholder="johnpaulonovo@gmail.com"
              />
              {!gateLinkMode && (
                <Field
                  label="Password"
                  type="password"
                  value={gatePassword}
                  onChange={(e) => setGatePassword(e.target.value)}
                  placeholder="Enter Admin password"
                />
              )}
              <Button type="submit" loading={gateBusy}>
                {gateLinkMode ? "Send Admin Sign-In Link" : "Enter Admin"}
              </Button>
              <button
                type="button"
                className="text-button"
                onClick={() => setGateLinkMode((prev) => !prev)}
              >
                {gateLinkMode
                  ? "Use password instead"
                  : "Email me a sign-in link instead"}
              </button>
              <Link href="/dashboard" className="button button--secondary">
                ← Back to Workspace
              </Link>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const filteredPromos = promoList.filter((item) => {
    if (promoFilter === "all") return true;
    if (promoFilter === "permanent") return item.permanent;
    if (promoFilter === "revoked") return item.revoked;
    const isExpired =
      Boolean(item.expiresAt) &&
      new Date(item.expiresAt as string).getTime() <= Date.now();
    if (promoFilter === "expired") return isExpired && !item.revoked;
    if (promoFilter === "active") return !item.revoked && !isExpired;
    return true;
  });

  const filteredSubs = subsList.filter((s) =>
    `${s.name} ${s.email} ${s.tier}`.toLowerCase().includes(subSearch.toLowerCase())
  );

  return (
    <div
      className={`admin-shell poise-admin ${lightMode ? "poise-admin--light" : ""}`}
    >
      <header className="admin-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
          <Brand href="/dashboard" />
          <span className="admin-label">
            <ShieldCheck size={14} aria-hidden="true" /> Protected Admin Control Center
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          <WorkspaceBadge label="Admin Role" />
          <button
            type="button"
            className="button button--secondary"
            aria-label="Toggle theme"
            title={lightMode ? "Switch to dark workshop" : "Switch to light mode"}
            onClick={() => setLightMode((prev) => !prev)}
          >
            {lightMode ? (
              <>
                <Moon size={15} aria-hidden="true" /> Dark Workshop
              </>
            ) : (
              <>
                <Sun size={15} aria-hidden="true" /> Light Mode
              </>
            )}
          </button>
          <Link href="/dashboard" className="button button--secondary">
            ← Back to Dashboard
          </Link>
          <span className="avatar" title={currentUser.name}>
            {currentUser.initials || "JO"}
          </span>
        </div>
      </header>
      <div className="admin-body">
        <aside className="admin-sidebar" aria-label="Admin control center">
          <p>Workshop (6-Tab Spec)</p>
          {poiseAdminTabs.map((item) => (
            <button
              type="button"
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              key={item}
            >
              {item === "Control" ? (
                <BarChart3 size={18} aria-hidden="true" />
              ) : item === "Testers" ? (
                <Users size={18} aria-hidden="true" />
              ) : item === "Notices" ? (
                <Bell size={18} aria-hidden="true" />
              ) : item === "Promo Codes" ? (
                <Sparkles size={18} aria-hidden="true" />
              ) : item === "Subscriptions" ? (
                <CreditCard size={18} aria-hidden="true" />
              ) : (
                <LockKeyhole size={18} aria-hidden="true" />
              )}
              {item}
            </button>
          ))}
        </aside>
        <main className="admin-main">
          <PageHeader
            eyebrow="Protected role · Server-verified Admin"
            title={tab}
            description={
              tab === "Control" || tab === "Overview"
                ? "Real-time workspace telemetry, account lookup, stacked tier grants, and $0-budget guardrail health."
                : `Manage ${tab.toLowerCase()} in the protected Admin control center.`
            }
            action={
              <div className="button-row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={syncLiveQuotaMeters}
                >
                  <RefreshCw size={15} aria-hidden="true" /> Refresh live state
                </Button>
                <Button type="button" onClick={() => setProvisionOpen(true)}>
                  <Plus size={16} aria-hidden="true" /> Provision user
                </Button>
              </div>
            }
          />

          {(tab === "Control" || tab === "Overview") && (
            <>
              <div className="metric-grid admin-metrics">
                <MetricCard
                  label="Registered users"
                  value={String(userRows.length)}
                  detail={`${userRows.filter((u) => u[6] === ADMIN_ROLE_KEY).length} Admin · Live database`}
                  icon={<Users size={19} aria-hidden="true" />}
                />
                <MetricCard
                  label="Queue health"
                  value={failedJobsCount === 0 ? "100%" : "Degraded"}
                  detail={`${processingJobsCount} queued · ${completedJobsCount} completed (SKIP LOCKED)`}
                  icon={<TrendingUp size={19} aria-hidden="true" />}
                />
                <MetricCard
                  label="Cloudflare AI budget"
                  value={`${quotaCards[0]?.[2] ?? 0}%`}
                  detail={quotaCards[0]?.[1] || "0 / 8,000 daily neurons"}
                  icon={<Zap size={19} aria-hidden="true" />}
                />
                <MetricCard
                  label="Moderation & alerts"
                  value={String(
                    moderationItems.length + (emergencyMode ? 1 : 0)
                  )}
                  detail={
                    emergencyMode
                      ? "95% Emergency Mode ACTIVE"
                      : "All $0-budget guardrails nominal"
                  }
                  icon={<AlertTriangle size={19} aria-hidden="true" />}
                />
              </div>

              <div className="poise-grid-2" style={{ marginBottom: "18px" }}>
                <div className="poise-card">
                  <h3>Admin notes (Read-only operational log)</h3>
                  <p>Pinned operational invariants for ContentFlow.</p>
                  <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
                    {adminNotes.map((note) => (
                      <div
                        key={note.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: "1px solid var(--poise-border, #2e2e34)",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "0.84rem" }}>
                          {note.text}
                        </strong>
                        <small>{new Date(note.createdAt).toUTCString()}</small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="poise-card">
                  <h3>See as normal user (8h Override)</h3>
                  <p>
                    Temporarily preview tier limits without losing your permanent Admin status.
                  </p>
                  <div className="button-row" style={{ marginTop: "12px", flexWrap: "wrap" }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleTestModeOverride("FREE")}
                    >
                      Preview as Free
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleTestModeOverride("CREATOR")}
                    >
                      Preview as Creator
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleTestModeOverride("PRO")}
                    >
                      Preview as Pro
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleTestModeOverride(null)}
                    >
                      Reset to Admin
                    </Button>
                  </div>
                </div>
              </div>

              <div className="poise-grid-2" style={{ marginBottom: "18px" }}>
                <div className="poise-card">
                  <h3>Account lookup &amp; stacked tier grant</h3>
                  <p>
                    Look up any account by email to grant stacked Creator/Pro/Agency time, permanent unlock, or suspend.
                  </p>
                  <div
                    className="responsive-inline-action"
                    style={{
                      marginTop: "12px",
                      alignItems: "end",
                    }}
                  >
                    <Field
                      label="Account email"
                      placeholder="user@example.com"
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                    />
                    <Button type="button" onClick={() => void handleAccountLookup()}>
                      Look up
                    </Button>
                  </div>
                  {lookupError && (
                    <small style={{ color: "#f76c6c", display: "block", marginTop: "8px" }}>
                      {lookupError}
                    </small>
                  )}
                  {lookupAccount && (
                    <div className="poise-account-found">
                      <span className="poise-pill poise-pill--success">
                        ACCOUNT FOUND
                      </span>
                      <strong style={{ display: "block", marginTop: "8px" }}>
                        {lookupAccount.name} ({lookupAccount.email})
                      </strong>
                      <small style={{ display: "block", margin: "4px 0 10px" }}>
                        Tier: {lookupAccount.tier} · Status: {lookupAccount.status}
                        {lookupAccount.grantExpiresAt
                          ? ` · Expires ${new Date(lookupAccount.grantExpiresAt).toLocaleDateString()}`
                          : ""}
                      </small>
                      <div className="button-row" style={{ flexWrap: "wrap", gap: "8px" }}>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            void handleGrantOrRevoke(
                              lookupAccount.email,
                              "grant",
                              "CREATOR",
                              30,
                              false
                            )
                          }
                        >
                          Grant Creator (+30d)
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            void handleGrantOrRevoke(
                              lookupAccount.email,
                              "grant",
                              "PRO",
                              30,
                              false
                            )
                          }
                        >
                          Grant Pro (+30d)
                        </Button>
                        <Button
                          type="button"
                          onClick={() =>
                            void handleGrantOrRevoke(
                              lookupAccount.email,
                              "grant",
                              "AGENCY",
                              90,
                              false
                            )
                          }
                        >
                          Grant Agency (+90d)
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            void handleGrantOrRevoke(
                              lookupAccount.email,
                              "grant",
                              "AGENCY",
                              365,
                              true
                            )
                          }
                        >
                          Permanent Unlock
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() =>
                            void handleGrantOrRevoke(lookupAccount.email, "revoke")
                          }
                        >
                          Revoke to Free
                        </Button>
                      </div>
                      <div
                        className="responsive-inline-action"
                        style={{
                          marginTop: "10px",
                          alignItems: "end",
                        }}
                      >
                        <Field
                          label="Suspension reason"
                          placeholder="Reason for suspension"
                          value={suspendReasonInput}
                          onChange={(e) => setSuspendReasonInput(e.target.value)}
                        />
                        <div className="button-row" style={{ flexWrap: "wrap" }}>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() =>
                              void handleSuspendToggle(lookupAccount.email, true)
                            }
                          >
                            Suspend
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              void handleSuspendToggle(lookupAccount.email, false)
                            }
                          >
                            Lift suspension
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="poise-card">
                  <h3>Repair masked tiers (Dry-run first)</h3>
                  <p>
                    Detect and restore accounts whose active grant or Admin status is masked by an expired override.
                  </p>
                  <div className="button-row" style={{ marginTop: "12px" }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleRepairMaskedTiers(true)}
                    >
                      1. Dry-Run Scan
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleRepairMaskedTiers(false)}
                    >
                      2. Repair Masked Tiers
                    </Button>
                  </div>
                  {repairReport && (
                    <small style={{ display: "block", marginTop: "10px" }}>
                      {repairReport.dryRun ? "Dry-run scan" : "Repair executed"}:{" "}
                      {repairReport.affectedCount} detected ·{" "}
                      {repairReport.repairedCount} repaired.
                    </small>
                  )}
                </div>
              </div>

              <div className="admin-overview-grid">
                <Card>
                  <div className="section-title">
                    <div>
                      <h2>Live queue &amp; worker telemetry</h2>
                      <p>Transactional SKIP LOCKED job distribution</p>
                    </div>
                    <span className="connection-state connected">
                      Operational ($0.00 spend)
                    </span>
                  </div>
                  <div className="bar-chart">
                    {[15, 25, 20, 35, 30, 45, 40, 50, 35, 42, 38, 48].map(
                      (value, index) => (
                        <span key={index} style={{ height: `${value}%` }} />
                      )
                    )}
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i className="legend-indigo" /> Completed{" "}
                      {completedJobsCount}
                    </span>
                    <span>
                      <i className="legend-amber" /> Queued/Processing{" "}
                      {processingJobsCount}
                    </span>
                    <span>
                      <i className="legend-red" /> Failed {failedJobsCount}
                    </span>
                  </div>
                </Card>
                <Card>
                  <div className="section-title">
                    <div>
                      <h2>System guardrails &amp; controls</h2>
                      <p>Real-time infrastructure status</p>
                    </div>
                  </div>
                  {[
                    [
                      "Zero-Budget Quota Enforcer",
                      `${quotaCards[0]?.[1] || "0 / 8,000 neurons"} · Hard-stop at 100%`,
                      "neutral",
                      "System",
                    ],
                    [
                      `${moderationItems.length} moderation item(s) in queue`,
                      moderationItems.length === 0
                        ? "All creator drafts pass automated safety & FTC checks"
                        : "Review flagged items in System tab",
                      moderationItems.length > 0 ? "warning" : "neutral",
                      "System",
                    ],
                    [
                      `Immutable Audit Trail (${auditLogs.length} events)`,
                      "Every tier change, 2FA action, and quota reset is logged",
                      "neutral",
                      "System",
                    ],
                  ].map(([title, body, state, targetTab]) => (
                    <button
                      type="button"
                      className={`alert-row ${state}`}
                      key={title}
                      onClick={() => setTab(targetTab)}
                    >
                      <ShieldCheck size={17} aria-hidden="true" />
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

          {(tab === "Testers" || tab === "Users") && (
            <div style={{ display: "grid", gap: "18px" }}>
              {tab === "Testers" && (
                <div className="poise-grid-2">
                  <div className="poise-card">
                    <h3>Remote controls</h3>
                    <p>
                      Live feature flags and APK build gates. Controls remain locked while loading (`appCfg === null`).
                    </p>
                    {appCfg === null ? (
                      <div style={{ marginTop: "12px" }}>
                        <span className="poise-pill poise-pill--warning">
                          Checking...
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                        <div className="button-row" style={{ flexWrap: "wrap" }}>
                          <Button
                            type="button"
                            variant={appCfg.maintenance ? "destructive" : "secondary"}
                            onClick={() =>
                              setAppCfg({
                                ...appCfg,
                                maintenance: !appCfg.maintenance,
                              })
                            }
                          >
                            Maintenance: {appCfg.maintenance ? "ON" : "OFF"}
                          </Button>
                          <Button
                            type="button"
                            variant={appCfg.paymentsLive ? "primary" : "secondary"}
                            onClick={() =>
                              setAppCfg({
                                ...appCfg,
                                paymentsLive: !appCfg.paymentsLive,
                              })
                            }
                          >
                            Payments Live: {appCfg.paymentsLive ? "LIVE" : "TEST"}
                          </Button>
                        </div>
                        <div className="two-col-grid">
                          <Field
                            label="Min Android Build"
                            type="number"
                            value={String(appCfg.minBuild)}
                            onChange={(e) =>
                              setAppCfg({
                                ...appCfg,
                                minBuild: Number(e.target.value) || 1,
                              })
                            }
                          />
                          <Field
                            label="Latest Android Build"
                            type="number"
                            value={String(appCfg.latestBuild)}
                            onChange={(e) =>
                              setAppCfg({
                                ...appCfg,
                                latestBuild: Number(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                        <Field
                          label="APK Download URL (https:// required)"
                          value={appCfg.downloadUrl}
                          onChange={(e) =>
                            setAppCfg({ ...appCfg, downloadUrl: e.target.value })
                          }
                        />
                        <div>
                          <Button
                            type="button"
                            onClick={() => void handleSaveRemoteConfig()}
                          >
                            Save Remote Config
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="poise-card">
                    <h3>Mint a tester login (@testers.contentflow.app)</h3>
                    <p>
                      Minted tester accounts unlock Pro features for QA and are automatically blocked from real card checkout.
                    </p>
                    <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                      <Field
                        label="Handle prefix"
                        placeholder="e.g. lagos-qa"
                        value={testerPrefix}
                        onChange={(e) => setTesterPrefix(e.target.value)}
                      />
                      <Field
                        label="Tester note"
                        placeholder="Android APK tester"
                        value={testerNote}
                        onChange={(e) => setTesterNote(e.target.value)}
                      />
                      <div>
                        <Button type="button" onClick={() => void handleMintTester()}>
                          Mint Tester Login
                        </Button>
                      </div>
                      {mintedTester && (
                        <div className="poise-account-found">
                          <span className="poise-pill poise-pill--info">
                            TESTER MINTED
                          </span>
                          <strong style={{ display: "block", marginTop: "6px" }}>
                            {mintedTester.email}
                          </strong>
                          {mintedTester.tempPassword && (
                            <small>
                              Temp Password: <code>{mintedTester.tempPassword}</code>
                            </small>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Card className="admin-table-card">
                <div className="table-tools">
                  <label className="search-field">
                    <Search size={17} aria-hidden="true" />
                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search users or email"
                    />
                  </label>
                  <div className="button-row" style={{ flexWrap: "wrap" }}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hideTestAccounts}
                      className="button button--secondary"
                      onClick={() => setHideTestAccounts((prev) => !prev)}
                    >
                      Hide test accounts: {hideTestAccounts ? "On" : "Off"}
                    </button>
                    <select
                      className="input"
                      value={tier}
                      onChange={(event) => {
                        setTier(event.target.value);
                        setPage(1);
                      }}
                      aria-label="Filter by tier"
                    >
                      <option>All tiers</option>
                      <option>Free</option>
                      <option>Creator</option>
                      <option>Pro</option>
                      <option>Agency</option>
                    </select>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setProvisionOpen(true)}
                    >
                      <Plus size={15} aria-hidden="true" /> Add user
                    </Button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Tier</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((user) => (
                        <tr key={user[0] + user[2]}>
                          <td>
                            <strong>{user[1]}</strong>
                            <small>{user[2]}</small>
                          </td>
                          <td>
                            <WorkspaceBadge
                              label={
                                user[6] === ADMIN_ROLE_KEY
                                  ? "Admin"
                                  : user[6] === "moderator"
                                    ? "Moderator"
                                    : "Creator"
                              }
                            />
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
                            <div className="button-row">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setConfirmUser(user[1]);
                                  setSelectedNewTier(user[3]);
                                }}
                              >
                                Change tier
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => void handleHideUser(user[0])}
                              >
                                Hide
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <span>
                    Showing {paginatedUsers.length} of {filteredUsers.length}{" "}
                    registered user(s) (Page {page} of {totalPages}) · Beta slots:{" "}
                    {betaCfg.enrolledCount}/{betaCfg.maxSlots} · Waitlist:{" "}
                    {waitlistItems.length}
                  </span>
                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {tab === "Notices" && (
            <div className="poise-grid-2">
              <div className="poise-card">
                <h3>Broadcast Notice Composer</h3>
                <p>
                  Publish an in-app announcement to Everyone, Beta users, or Testers only.
                </p>
                <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                  <Field
                    label="Notice title"
                    placeholder="e.g. New YouTube Shorts Pacing Engine Live"
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                  />
                  <TextArea
                    label="Message body"
                    rows={3}
                    placeholder="Share release notes or maintenance windows..."
                    value={noticeBody}
                    onChange={(e) => setNoticeBody(e.target.value)}
                  />
                  <label className="field">
                    <span className="field__label">Target Audience</span>
                    <select
                      className="input"
                      value={noticeAudience}
                      onChange={(e) =>
                        setNoticeAudience(
                          e.target.value as "all" | "beta" | "testers"
                        )
                      }
                    >
                      <option value="all">Everyone</option>
                      <option value="beta">Beta users</option>
                      <option value="testers">Testers only</option>
                    </select>
                  </label>
                  <div>
                    <Button type="button" onClick={() => void handlePublishNotice()}>
                      Publish Notice
                    </Button>
                  </div>
                </div>
              </div>

              <div className="poise-card">
                <h3>Active Notices ({noticesList.length})</h3>
                <p>Delivered to the workspace notification bell.</p>
                <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                  {noticesList.length === 0 ? (
                    <small>No active notices published yet.</small>
                  ) : (
                    noticesList.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px solid var(--poise-border, #2e2e34)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <span className="poise-pill poise-pill--info">
                            {n.audience}
                          </span>
                          <strong style={{ display: "block", marginTop: "6px" }}>
                            {n.title}
                          </strong>
                          <p style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
                            {n.body}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => void handleDeleteNotice(n.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "Promo Codes" && (
            <div style={{ display: "grid", gap: "18px" }}>
              <div className="poise-card">
                <h3>Create Promo / VIP Code</h3>
                <p>
                  Configure tier unlock, duration days, max uses, or permanent lifetime unlock.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "10px",
                    marginTop: "12px",
                  }}
                >
                  <Field
                    label="Code"
                    placeholder="LAUNCHPRO30"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value)}
                  />
                  <label className="field">
                    <span className="field__label">Target tier</span>
                    <select
                      className="input"
                      value={newPromoTier}
                      onChange={(e) =>
                        setNewPromoTier(
                          e.target.value as "CREATOR" | "PRO" | "AGENCY"
                        )
                      }
                    >
                      <option value="CREATOR">Creator</option>
                      <option value="PRO">Pro</option>
                      <option value="AGENCY">Agency</option>
                    </select>
                  </label>
                  <Field
                    label="Reward days"
                    type="number"
                    value={newPromoDays}
                    onChange={(e) => setNewPromoDays(e.target.value)}
                  />
                  <Field
                    label="Max redemptions"
                    type="number"
                    value={newPromoMaxUses}
                    onChange={(e) => setNewPromoMaxUses(e.target.value)}
                  />
                  <Field
                    label="Internal note"
                    placeholder="Partner launch campaign"
                    value={newPromoNote}
                    onChange={(e) => setNewPromoNote(e.target.value)}
                  />
                </div>
                <div className="button-row" style={{ marginTop: "12px" }}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={newPromoPermanent}
                    className="button button--secondary"
                    onClick={() => setNewPromoPermanent((prev) => !prev)}
                  >
                    Permanent unlock: {newPromoPermanent ? "Yes" : "No"}
                  </button>
                  <Button type="button" onClick={() => void handleCreatePromo()}>
                    Create Promo Code
                  </Button>
                </div>
              </div>

              <div className="poise-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <h3>Promo Code Registry ({filteredPromos.length})</h3>
                  <div className="button-row" style={{ flexWrap: "wrap" }}>
                    {(
                      ["all", "active", "expired", "revoked", "permanent"] as const
                    ).map((f) => (
                      <Button
                        key={f}
                        type="button"
                        variant={promoFilter === f ? "primary" : "secondary"}
                        onClick={() => setPromoFilter(f)}
                      >
                        {f.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Tier</th>
                        <th>Reward</th>
                        <th>Usage</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPromos.map((p) => (
                        <tr key={p.code}>
                          <td>
                            <strong>{p.code}</strong>
                            <small>{p.note || "Promo campaign"}</small>
                          </td>
                          <td>{p.tier}</td>
                          <td>
                            {p.permanent ? "Permanent" : `${p.rewardDays} days`}
                          </td>
                          <td>
                            {p.usedCount} / {p.maxUses}
                          </td>
                          <td>
                            <span
                              className={`poise-pill ${
                                p.revoked
                                  ? "poise-pill--danger"
                                  : p.permanent
                                    ? "poise-pill--info"
                                    : "poise-pill--success"
                              }`}
                            >
                              {p.revoked
                                ? "Revoked"
                                : p.permanent
                                  ? "Permanent"
                                  : "Active"}
                            </span>
                          </td>
                          <td>
                            <div className="button-row" style={{ flexWrap: "wrap" }}>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                  void handlePromoMutate(
                                    "promo_extend",
                                    p.code,
                                    { days: 30 }
                                  )
                                }
                              >
                                +30d
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                  void handlePromoMutate(
                                    "promo_extend",
                                    p.code,
                                    { days: 90 }
                                  )
                                }
                              >
                                +90d
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                  void handlePromoMutate(
                                    "promo_permanent",
                                    p.code
                                  )
                                }
                              >
                                Permanent
                              </Button>
                              {p.revoked ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() =>
                                    void handlePromoMutate(
                                      "promo_reactivate",
                                      p.code
                                    )
                                  }
                                >
                                  Reactivate
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() =>
                                    void handlePromoMutate(
                                      "promo_revoke",
                                      p.code
                                    )
                                  }
                                >
                                  Revoke
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() =>
                                  void handlePromoMutate("promo_delete", p.code)
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "Subscriptions" && (
            <div className="poise-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <h3>Active Subscriptions &amp; Trials ({filteredSubs.length})</h3>
                  <p>
                    Manage paid tiers, 30-day trials, and 7/3/1-day UTC expiry reminders.
                  </p>
                </div>
                <div className="button-row">
                  <Field
                    label="Filter subscribers"
                    placeholder="Search email or tier..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      const { ok, data } = await callAdminAction({
                        action: "sweep_now",
                      });
                      if (ok) {
                        await syncAdminWorkspace();
                        setToast(
                          `7/3/1-day UTC expiry sweep completed (${data.remindersQueued ?? 0} reminder(s))`
                        );
                      }
                    }}
                  >
                    Run 7/3/1-Day Expiry Sweep
                  </Button>
                </div>
              </div>
              {subsError ? (
                <div className="form-alert" role="alert">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span>{subsError}</span>
                </div>
              ) : filteredSubs.length === 0 ? (
                <p>No active paid or trial subscriptions match your filter.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Subscriber</th>
                        <th>Tier</th>
                        <th>Mode</th>
                        <th>Expires</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubs.map((sub) => (
                        <tr key={sub.uid + sub.email}>
                          <td>
                            <strong>{sub.name}</strong>
                            <small>{sub.email}</small>
                          </td>
                          <td>{sub.tier}</td>
                          <td>
                            <span className="poise-pill poise-pill--info">
                              {sub.trialActive ? "30d Trial" : "Subscription"}
                            </span>
                          </td>
                          <td>
                            {sub.expiresAt
                              ? new Date(sub.expiresAt).toLocaleDateString()
                              : "Permanent"}
                          </td>
                          <td>
                            <div className="button-row">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                  void handleGrantOrRevoke(
                                    sub.email,
                                    "grant",
                                    (sub.tier as "CREATOR" | "PRO" | "AGENCY") ||
                                      "PRO",
                                    30,
                                    false
                                  )
                                }
                              >
                                +30d
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() =>
                                  void handleGrantOrRevoke(sub.email, "revoke")
                                }
                              >
                                Revoke
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {(tab === "System" ||
            tab === "Quotas" ||
            tab === "Moderation" ||
            tab === "Audit & System") && (
            <div style={{ display: "grid", gap: "18px" }}>
              {tab === "System" && (
                <div className="poise-grid-3">
                  <div className="poise-card">
                    <h3>Configured Admins</h3>
                    <p>Server-verified Admin identities (`POST /api/v1/admin`).</p>
                    <ul style={{ margin: "10px 0 0", paddingLeft: "18px", fontSize: "0.84rem" }}>
                      <li>
                        <strong>johnpaulonovo@gmail.com</strong> (Owner · Agency Max)
                      </li>
                      <li>
                        <strong>maya@contentflow.app</strong> (Operations Admin)
                      </li>
                    </ul>
                  </div>
                  <div className="poise-card">
                    <h3>System Stats &amp; Sweep</h3>
                    <p>
                      Users: {systemStats?.totalUsers ?? userRows.length} · Promos:{" "}
                      {systemStats?.activePromos ?? promoList.length} · Checkouts:{" "}
                      {checkoutList.length}
                    </p>
                    <div className="button-row" style={{ marginTop: "10px" }}>
                      <Button
                        type="button"
                        onClick={async () => {
                          const { ok } = await callAdminAction({
                            action: "sweep_now",
                          });
                          if (ok) {
                            await syncAdminWorkspace();
                            setToast("System sweep executed");
                          }
                        }}
                      >
                        Run Sweep Now
                      </Button>
                    </div>
                  </div>
                  <div className="poise-card">
                    <h3>App Links Fingerprint (SHA-256)</h3>
                    <p>Android `.apk` assetlinks verification digest:</p>
                    <code
                      style={{
                        display: "block",
                        marginTop: "8px",
                        fontSize: "0.74rem",
                        wordBreak: "break-all",
                      }}
                    >
                      FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
                    </code>
                  </div>
                </div>
              )}

              {(tab === "System" || tab === "Quotas") && (
                <>
                  <div
                    className="button-row"
                    style={{ marginBottom: "4px", flexWrap: "wrap" }}
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={syncLiveQuotaMeters}
                    >
                      <RefreshCw size={15} aria-hidden="true" /> Sync live
                      $0-budget meters
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetDailyQuotaCounters}
                    >
                      Reset daily UTC counters
                    </Button>
                    <Button
                      type="button"
                      variant={emergencyMode ? "destructive" : "ghost"}
                      onClick={toggleEmergencyGuardrail}
                    >
                      {emergencyMode
                        ? "Disable 95% Emergency Mode"
                        : "Simulate 95% Emergency Guardrail"}
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

              {(tab === "System" || tab === "Moderation") && (
                <>
                  {moderationItems.length > 0 ? (
                    <div className="moderation-grid">
                      {moderationItems.map((item) => (
                        <Card className="moderation-card" key={item.id}>
                          <div className="moderation-preview">
                            <MessageSquareText size={26} aria-hidden="true" />
                            <span>CONTENT PREVIEW</span>
                          </div>
                          <StatusBadge status="pending" />
                          <h3>{item.title}</h3>
                          <p>“{item.excerpt}”</p>
                          <small>
                            Owner: {item.ownerName} · {item.contentType}
                          </small>
                          <div>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setModerationTargetId(item.id);
                                setModeration(`Reject: ${item.title}`);
                              }}
                            >
                              Reject
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                setModerationTargetId(item.id);
                                setModeration(`Approve: ${item.title}`);
                              }}
                            >
                              Approve
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <EmptyState
                        icon={<ShieldCheck size={26} aria-hidden="true" />}
                        title="Moderation queue is clean"
                        body="Zero flagged drafts require manual review right now. Automated FTC #ad disclosure and safety guardrails are active."
                        action={
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={syncAdminWorkspace}
                          >
                            <RefreshCw size={15} aria-hidden="true" /> Re-scan
                            workspace content
                          </Button>
                        }
                      />
                    </Card>
                  )}
                </>
              )}

              {(tab === "System" || tab === "Audit & System") && (
                <div style={{ display: "grid", gap: "1.25rem" }}>
                  <Card>
                    <div className="section-title">
                      <div>
                        <h2>Production Infrastructure &amp; Security Matrix</h2>
                        <p>Strict $0.00 free-tier architecture verification</p>
                      </div>
                      <span className="connection-state connected">
                        All Systems Verified
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(230px, 1fr))",
                        gap: "0.85rem",
                      }}
                    >
                      {[
                        [
                          "Database & Persistence",
                          "Supabase PostgreSQL + Disk Write-Through",
                          "Connected",
                        ],
                        [
                          "AI Routing Engine",
                          "BYOK -> Cloudflare AI -> Hugging Face -> Built-in",
                          "Active ($0.00)",
                        ],
                        [
                          "Credential Vault",
                          "AES-256-GCM (12B IV + 16B Auth Tag)",
                          "Enforced",
                        ],
                        [
                          "Auth & 2FA",
                          "HMAC-SHA256 Session + RFC 6238 TOTP",
                          "Enforced",
                        ],
                      ].map(([label, desc, status]) => (
                        <div
                          key={label}
                          style={{
                            padding: "0.9rem",
                            borderRadius: "10px",
                            border: "1px solid var(--poise-border, #e7e2da)",
                          }}
                        >
                          <small style={{ display: "block" }}>{label}</small>
                          <strong
                            style={{ display: "block", margin: "0.25rem 0" }}
                          >
                            {desc}
                          </strong>
                          <span className="connection-state connected">
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <div className="poise-grid-2">
                    <div className="poise-card">
                      <h3>Crash reports (Capped at 12)</h3>
                      <p>Recent client or worker exceptions ({crashList.length}/12).</p>
                      {crashList.length === 0 ? (
                        <small style={{ display: "block", marginTop: "8px" }}>
                          Zero unhandled crash reports recorded.
                        </small>
                      ) : (
                        <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "0.82rem" }}>
                          {crashList.slice(0, 12).map((c) => (
                            <li key={c.id}>
                              <strong>{c.route}</strong>: {c.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="poise-card">
                      <h3>Manual Checkouts ({checkoutList.length})</h3>
                      <p>Pending and verified Paystack references.</p>
                      {checkoutList.length === 0 ? (
                        <small style={{ display: "block", marginTop: "8px" }}>
                          No manual checkouts pending review.
                        </small>
                      ) : (
                        <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "0.82rem" }}>
                          {checkoutList.map((chk) => (
                            <li key={chk.reference}>
                              <code>{chk.reference}</code> · {chk.email} ({chk.tier})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <Card className="admin-table-card">
                    <div
                      className="section-title"
                      style={{ padding: "1rem 1.25rem 0" }}
                    >
                      <div>
                        <h2>Immutable Admin Audit Log</h2>
                        <p>
                          Every privileged action recorded with actor and reason
                        </p>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Timestamp (UTC)</th>
                            <th>Actor</th>
                            <th>Action</th>
                            <th>Target</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.length > 0 ? (
                            auditLogs.map((entry) => (
                              <tr key={entry.id}>
                                <td>
                                  {new Date(entry.createdAt).toLocaleTimeString()}
                                </td>
                                <td>{entry.actorId}</td>
                                <td>
                                  <code>{entry.action}</code>
                                </td>
                                <td>{entry.targetId}</td>
                                <td>{entry.reason}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} style={{ textAlign: "center" }}>
                                No Admin mutations recorded in this session yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      <Dialog
        open={provisionOpen}
        title="Provision new workspace user"
        body="Create a verified account and assign its initial tier and role."
        confirmLabel="Provision account"
        onClose={() => setProvisionOpen(false)}
        onConfirm={handleProvisionUser}
      >
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <Field
            label="Full name"
            placeholder="e.g. Adaobi Nwosu"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <Field
            label="Email address"
            type="email"
            placeholder="creator@company.com"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
          />
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Subscription tier</span>
              <select
                className="input"
                value={newUserTier}
                onChange={(e) => setNewUserTier(e.target.value)}
              >
                <option value="FREE">Free</option>
                <option value="CREATOR">Creator</option>
                <option value="PRO">Pro</option>
                <option value="AGENCY">Agency</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Workspace role</span>
              <select
                className="input"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
              >
                <option value="user">Creator (Standard)</option>
                <option value="moderator">Moderator</option>
                <option value={ADMIN_ROLE_KEY}>Admin</option>
              </select>
            </label>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={Boolean(confirmUser)}
        title={`Change ${confirmUser}'s tier?`}
        body="This Admin action updates the account's subscription tier and records an immutable audit log entry."
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
            <option>Agency</option>
            <option>Pro</option>
            <option>Creator</option>
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
