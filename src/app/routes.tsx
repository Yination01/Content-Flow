import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  CircleUserRound,
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
  Rocket,
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
import {
  createBrowserRouter,
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useParams,
} from "react-router";
import { StateProvider, useAppState, type Job } from "./state";
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

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label="ContentFlow home">
      <span className="brand__mark"><Sparkles size={18} /></span>
      {!compact && <span>ContentFlow</span>}
    </Link>
  );
}

function Root() {
  return <StateProvider><Outlet /></StateProvider>;
}

const features = [
  { icon: WandSparkles, title: "Create with momentum", body: "Turn a rough idea into an editable first draft, without giving up creative control." },
  { icon: RefreshCw, title: "Adapt, don't duplicate", body: "Shape one core idea for YouTube and TikTok with platform-aware fields and previews." },
  { icon: Calendar, title: "Move work forward", body: "Prepare, review, and queue content from one calm workspace built for creators." },
];

function Landing() {
  const [faq, setFaq] = useState(0);
  return (
    <div className="marketing">
      <nav className="marketing-nav">
        <Brand />
        <div className="marketing-nav__links">
          <a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
        </div>
        <div className="marketing-nav__actions">
          <Link className="button button--ghost" to="/login">Log in</Link>
          <Link className="button button--primary" to="/signup">Get started</Link>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero__copy">
            <div className="announcement"><Sparkles size={14} /> Your idea, ready for every channel <ArrowRight size={14} /></div>
            <h1>Create once. Shape it for every platform.</h1>
            <p>ContentFlow helps creators turn a single idea into polished, platform-ready content for YouTube and TikTok—all in one focused workspace.</p>
            <div className="hero__actions">
              <Link className="button button--primary button--large" to="/signup">Start creating free <ArrowRight size={17} /></Link>
              <a className="button button--secondary button--large" href="#workflow"><Play size={16} /> See how it works</a>
            </div>
            <small>No credit card required · Free plan available · Demo prototype</small>
          </div>
          <ProductPreview />
        </section>

        <section className="logo-strip" aria-label="Made for creators">
          <span>Built for modern creator workflows</span>
          <strong>VIDEO ESSAYS</strong><strong>EDUCATION</strong><strong>WELLNESS</strong><strong>TECH</strong><strong>LIFESTYLE</strong>
        </section>

        <section className="section" id="features">
          <SectionHeading eyebrow="One clear workflow" title="From first thought to final draft" body="Spend less time moving between tools and more time refining the work only you can make." />
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, body }, index) => (
              <Card className="feature-card" key={title}>
                <div className="feature-card__top"><span className="feature-icon"><Icon size={20} /></span><small>0{index + 1}</small></div>
                <h3>{title}</h3><p>{body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="section workflow" id="workflow">
          <SectionHeading eyebrow="How it works" title="A lighter way to create consistently" body="Keep your voice at the center while ContentFlow handles the repetitive shaping and organizing." />
          <div className="workflow__grid">
            {[
              ["01", "Start with an idea", "Write a prompt or choose an example to get moving."],
              ["02", "Edit your draft", "Refine every word in a focused, editable workspace."],
              ["03", "Prepare each channel", "Customize titles, captions, tags, and timing."],
            ].map(([number, title, body]) => <div className="step" key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></div>)}
          </div>
        </section>

        <section className="section" id="pricing">
          <SectionHeading eyebrow="Simple pricing" title="A plan for every publishing rhythm" body="Reference pricing for this demo. Final billing currency, cadence, and terms are not yet confirmed." />
          <div className="pricing-grid">
            {[
              ["Free", "$0", "Try the core workflow", "5 AI generations / day"],
              ["Creator", "$9", "For a consistent solo practice", "100 generations / month"],
              ["Pro", "$29", "For growing multi-channel creators", "500 generations / month"],
              ["Agency", "$99", "For teams managing more volume", "2,000 generations / month"],
            ].map(([name, price, body, quota], index) => (
              <Card className={index === 2 ? "price-card price-card--featured" : "price-card"} key={name}>
                {index === 2 && <span className="price-card__flag">Most popular</span>}
                <h3>{name}</h3><p>{body}</p><div className="price"><strong>{price}</strong><span>{price !== "$0" ? "/ month*" : "forever"}</span></div>
                <ul><li><Check size={16} /> {quota}</li><li><Check size={16} /> Editable content workspace</li><li><Check size={16} /> YouTube & TikTok preparation</li></ul>
                <Link className={`button ${index === 2 ? "button--primary" : "button--secondary"}`} to="/signup">Choose {name}</Link>
              </Card>
            ))}
          </div>
        </section>

        <section className="section faq" id="faq">
          <SectionHeading eyebrow="Questions, answered" title="Know before you flow" />
          <div className="faq__list">
            {[
              ["Is ContentFlow publishing content for me?", "Not in this prototype. Generation, account connections, scheduling, and publishing are clearly simulated in Demo mode."],
              ["Can I edit generated content?", "Yes. Every result is designed to be fully editable before you save or prepare it for a platform."],
              ["Do I need to add an API key?", "No. Provider setup is not required for this prototype, and no real credentials should be entered."],
              ["Is there a free plan?", "Yes. The proposed Free tier lets you explore the core creation workflow with limited daily usage."],
            ].map(([question, answer], index) => (
              <button className="faq-item" onClick={() => setFaq(index)} aria-expanded={faq === index} key={question}>
                <span><strong>{question}</strong>{faq === index && <p>{answer}</p>}</span><span>{faq === index ? "−" : "+"}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="cta-band"><div><p className="eyebrow">Your next idea is ready</p><h2>Make more room for the creative part.</h2></div><Link className="button button--primary button--large" to="/signup">Start creating free <ArrowRight size={17} /></Link></section>
      </main>
      <footer><Brand /><p>© 2026 ContentFlow. Prototype for demonstration only.</p><div><a href="#pricing">Pricing</a><a href="#faq">FAQ</a><Link to="/notes">Product notes</Link></div></footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{body && <p>{body}</p>}</div>;
}

function ProductPreview() {
  return (
    <div className="product-preview">
      <div className="product-preview__chrome"><span /><span /><span /><small>ContentFlow workspace</small><DemoBadge /></div>
      <div className="product-preview__body">
        <aside><Brand compact /><span className="preview-nav active"><Home size={14} /> Home</span><span className="preview-nav"><Plus size={14} /> Create</span><span className="preview-nav"><FileText size={14} /> Content</span></aside>
        <div className="preview-main">
          <div className="preview-welcome"><div><small>Good morning, Maya</small><h3>What will you create today?</h3></div><span className="button button--primary"><Plus size={14} /> Create</span></div>
          <div className="preview-metrics"><div><span>Daily generations</span><strong>3 <small>/ 5</small></strong><Progress value={60} /></div><div><span>Monthly posts</span><strong>18 <small>/ 50</small></strong><Progress value={36} /></div></div>
          <div className="preview-editor"><div className="preview-image"><Play size={22} /></div><div><StatusBadge status="draft" /><h4>Five habits for a calmer morning</h4><p>A practical guide to protecting the first hour of your day...</p><span className="preview-platform"><Play size={14} /> YouTube</span></div></div>
        </div>
      </div>
    </div>
  );
}

function AuthPage({ signup = false }: { signup?: boolean }) {
  const navigate = useNavigate();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      if (signup) setComplete(true); else navigate("/dashboard");
    }, 800);
  }
  return (
    <div className="auth-layout">
      <div className="auth-aside">
        <Brand />
        <div><span className="auth-quote__mark">“</span><blockquote>ContentFlow gives every idea a clear path forward, without losing the voice that makes it yours.</blockquote><p>Built for thoughtful creators</p></div>
        <small>Demo prototype · No real account is created</small>
      </div>
      <main className="auth-main">
        <div className="auth-mobile-brand"><Brand /></div>
        {complete ? (
          <Card className="confirmation">
            <div className="success-icon"><Check size={28} /></div>
            <DemoBadge />
            <h1>You're ready to create</h1>
            <p>Your demo workspace is set up. Start with a blank slate and turn your first idea into content.</p>
            <Button onClick={() => navigate("/dashboard?new=true")}>Open my workspace <ArrowRight size={16} /></Button>
          </Card>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <DemoBadge />
            <div><h1>{signup ? "Create your workspace" : "Welcome back"}</h1><p>{signup ? "Start with the Free plan. No credit card required." : "Sign in to continue to your creator workspace."}</p></div>
            <Field label="Email address" type="email" placeholder="you@example.com" required />
            <div className="password-wrap">
              <Field label="Password" type={passwordVisible ? "text" : "password"} placeholder={signup ? "Create a strong password" : "Enter your password"} hint={signup ? "Use at least 8 characters, with a number and symbol." : undefined} required minLength={8} />
              <button type="button" onClick={() => setPasswordVisible(!passwordVisible)}>{passwordVisible ? "Hide" : "Show"}</button>
            </div>
            {!signup && <div className="form-row"><label><input type="checkbox" /> Remember me</label><button type="button" className="text-button" onClick={() => setError("Password reset is simulated in Demo mode.")}>Forgot password?</button></div>}
            {error && <p className="form-error"><AlertTriangle size={15} /> {error}</p>}
            <Button loading={loading} type="submit">{loading ? (signup ? "Creating demo workspace" : "Signing in") : (signup ? "Create free account" : "Sign in")}</Button>
            <p className="auth-switch">{signup ? "Already have an account?" : "New to ContentFlow?"} <Link to={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create an account"}</Link></p>
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
];

function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={mobileOpen ? "sidebar sidebar--open" : "sidebar"}>
        <div className="sidebar__top"><Brand /><button className="mobile-only icon-button" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
        <div className="sidebar__workspace"><span className="avatar">MC</span><div><strong>Maya Chen</strong><small>Creator plan</small></div><ChevronDown size={15} /></div>
        <nav>
          <p>Workspace</p>
          {appNavigation.map(([to, label, Icon]) => <NavLink key={to as string} to={to as string} onClick={() => setMobileOpen(false)}><Icon size={18} />{label as string}</NavLink>)}
          <p>Account</p>
          <NavLink to="/settings" onClick={() => setMobileOpen(false)}><Settings size={18} />Settings</NavLink>
          <NavLink to="/admin" onClick={() => setMobileOpen(false)}><ShieldCheck size={18} />Admin demo</NavLink>
        </nav>
        <div className="sidebar__upgrade"><Sparkles size={18} /><strong>Keep your flow going</strong><p>2 of 5 daily generations left.</p><Link to="/settings?section=Billing">View usage</Link></div>
        <div className="sidebar__footer"><HelpCircle size={18} /> Help & feedback</div>
      </aside>
      {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}
      <div className="app-content">
        <header className="topbar">
          <button className="mobile-only icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="topbar__demo"><DemoBadge /><span>Simulated workspace</span></div>
          <div className="topbar__actions"><button className="icon-button" aria-label="Notifications"><Bell size={19} /><i /></button><span className="avatar">MC</span></div>
        </header>
        <main className="app-main"><Outlet /></main>
      </div>
    </div>
  );
}

function Dashboard() {
  const { hasContent } = useAppState();
  return (
    <>
      <PageHeader eyebrow="Monday, June 23" title="Good morning, Maya" description="Pick up where you left off, or turn a fresh idea into something worth sharing." action={<Link className="button button--primary" to="/create"><Plus size={17} /> Create content</Link>} />
      <div className="metric-grid">
        <MetricCard label="Daily AI generations" value="3 / 5" detail="Resets in 9h 14m" icon={<Sparkles size={19} />} />
        <MetricCard label="Monthly posts" value="18 / 50" detail="Resets July 1" icon={<Send size={19} />} />
        <MetricCard label="Cross-posts" value="12 / 25" detail="48% of monthly allowance" icon={<RefreshCw size={19} />} />
      </div>
      <div className="dashboard-grid">
        <section>
          <div className="section-title"><div><h2>Recent content</h2><p>Your latest drafts and platform-ready ideas.</p></div>{hasContent && <Link to="/content/1">View all</Link>}</div>
          {hasContent ? <div className="content-grid"><ContentCard /><ContentCard alternate /></div> :
            <Card><EmptyState icon={<PenLine size={24} />} title="Your first idea starts here" body="Create a piece of content, refine it, and prepare it for every platform from one workspace." action={<Link className="button button--primary" to="/create"><Sparkles size={16} /> Create your first piece</Link>} /></Card>}
        </section>
        <section>
          <div className="section-title"><div><h2>Publishing activity</h2><p>Recent and upcoming demo jobs.</p></div><Link to="/jobs">View jobs</Link></div>
          <Card className="activity-card">
            <div className="activity-row"><span className="platform-icon tiktok">Tt</span><div><strong>3 habits that improved my focus</strong><small>TikTok · Today, 4:30 PM</small></div><StatusBadge status="completed" /></div>
            <div className="activity-row"><span className="platform-icon youtube"><Play size={16} /></span><div><strong>Build a calmer morning routine</strong><small>YouTube · Jun 18, 10:00 AM</small></div><StatusBadge status="failed" /></div>
          </Card>
        </section>
      </div>
      <section className="connections-section">
        <div className="section-title"><div><h2>Platform connections</h2><p>Connections shown below are simulated.</p></div><DemoBadge /></div>
        <div className="connection-grid">
          <ConnectionCard platform="YouTube" connected detail="@MayaCreates · Expires in 28 days" icon={<Play size={22} />} />
          <ConnectionCard platform="TikTok" detail="Connect to prepare TikTok jobs" icon={<strong>Tt</strong>} />
        </div>
      </section>
    </>
  );
}

function ContentCard({ alternate = false }: { alternate?: boolean }) {
  return <Link to="/content/1" className="content-card"><div className={`content-card__media ${alternate ? "alt" : ""}`}><span>{alternate ? "PRODUCTIVITY" : "MINDFUL CREATION"}</span></div><div><div><StatusBadge status={alternate ? "ready" : "draft"} /><small>Updated 2h ago</small></div><h3>{alternate ? "3 ways to protect your creative energy" : "A creator's guide to consistent content"}</h3><p>{alternate ? "YouTube + TikTok ready" : "Text · 842 words"}</p></div></Link>;
}

function ConnectionCard({ platform, connected = false, detail, icon }: { platform: string; connected?: boolean; detail: string; icon: ReactNode }) {
  return <Card className="connection-card"><span className={`platform-icon ${platform.toLowerCase()}`}>{icon}</span><div><div><h3>{platform}</h3><span className={connected ? "connection-state connected" : "connection-state"}>{connected ? "Connected · Demo" : "Not connected"}</span></div><p>{detail}</p></div><Button variant="secondary">{connected ? "Manage" : "Connect"}</Button></Card>;
}

function CreatePage() {
  const navigate = useNavigate();
  const { setHasContent } = useAppState();
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState("Text");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [result, setResult] = useState("");
  const [toast, setToast] = useState("");
  function generate() {
    if (!prompt.trim()) return;
    setLoading(true); setGenerated(false);
    window.setTimeout(() => {
      setResult("Consistency is not about showing up every day—it is about building a creative rhythm you can return to.\n\nStart by choosing one idea worth repeating. Then shape it for the way your audience listens on each platform. A thoughtful YouTube title can open the door; a focused TikTok caption can carry the same idea further.\n\nThe goal is not more content. It is a clearer path from idea to impact.");
      setLoading(false); setGenerated(true);
    }, 1100);
  }
  function save() {
    setHasContent(true); setToast("Draft saved in Demo mode"); window.setTimeout(() => navigate("/content/1"), 550);
  }
  return (
    <>
      <PageHeader eyebrow="AI creation workspace" title="Turn an idea into a strong first draft" description="Describe what you want to make. You stay in control of every word." action={<div className="quota-pill"><Sparkles size={15} /><strong>2</strong> generations left today</div>} />
      <div className="create-layout">
        <Card className="creation-panel">
          <div className="field">
            <div className="field__label-row"><span className="field__label">What do you want to create?</span><span>{prompt.length} / 1,000</span></div>
            <textarea className="prompt-area" value={prompt} maxLength={1000} onChange={(event) => setPrompt(event.target.value)} placeholder="Example: Write a practical, encouraging guide for creators who struggle to post consistently..." />
          </div>
          <div className="example-chips"><span>Try an example:</span>{["5 lessons from building in public", "A calmer morning routine", "Why consistency beats intensity"].map((example) => <button key={example} onClick={() => setPrompt(example)}>{example}</button>)}</div>
          <div className="option-section"><label>Content type</label><div className="segmented">{["Text", "Image", "Video"].map((item) => <button disabled={item === "Video"} className={type === item ? "active" : ""} onClick={() => setType(item)} key={item}>{item === "Text" ? <FileText size={17} /> : item === "Image" ? <Image size={17} /> : <Film size={17} />}{item}{item === "Video" && <small>Planned</small>}</button>)}</div></div>
          <div className="form-grid">
            <label className="field"><span className="field__label">Tone</span><select className="input"><option>Clear & encouraging</option><option>Confident & direct</option><option>Warm & conversational</option></select></label>
            <label className="field"><span className="field__label">Format</span><select className="input"><option>Short article</option><option>Video script</option><option>Listicle</option></select></label>
          </div>
          <div className="platform-toggles"><div><label>Adapt for platforms</label><p>Prepare channel-specific suggestions.</p></div><Toggle label="YouTube" defaultChecked /><Toggle label="TikTok" /></div>
          <div className="creation-actions"><Button variant="secondary" onClick={() => setToast("Blank draft saved in Demo mode")}><Save size={16} /> Save blank draft</Button><Button onClick={generate} loading={loading} disabled={!prompt.trim()}><Sparkles size={16} /> {loading ? "Generating demo draft" : "Generate draft"}</Button></div>
          <p className="demo-notice"><ShieldCheck size={15} /> Demo mode: generation is simulated. No provider API or real account is used.</p>
        </Card>
        <Card className="result-panel">
          <div className="result-panel__header"><div><span className="eyebrow">Generated preview</span><h2>Your editable result</h2></div>{generated && <StatusBadge status="draft" />}</div>
          {loading ? <div className="generation-loading"><span className="spark-orbit"><Sparkles size={22} /></span><h3>Shaping your idea</h3><p>Creating structure, refining the tone, and preparing an editable draft.</p><Skeleton lines={5} /></div> :
            generated ? <><textarea className="generated-editor" value={result} onChange={(event) => setResult(event.target.value)} aria-label="Generated content" /><div className="result-meta"><span>{result.split(/\s+/).length} words</span><span>About 1 min read</span><span>Edited just now</span></div><div className="result-actions"><Button variant="ghost" onClick={() => navigator.clipboard?.writeText(result)}><Copy size={16} /> Copy</Button><Button variant="ghost" onClick={generate}><RefreshCw size={16} /> Regenerate</Button><Button onClick={save}><Save size={16} /> Save draft</Button></div></> :
            <EmptyState icon={<WandSparkles size={26} />} title="Your draft will appear here" body="Add a prompt and choose your options. You'll be able to edit everything before saving." />}
        </Card>
      </div>
      <Card className="quota-callout"><div><AlertTriangle size={20} /><div><strong>Quota limit preview</strong><p>If your daily quota is reached, generation pauses until reset. Upgrade prompts lead to Billing—never a simulated payment.</p></div></div><Link className="button button--secondary" to="/settings?section=Billing">View billing</Link></Card>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function Toggle({ label, defaultChecked = false }: { label: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return <button className={checked ? "toggle-row active" : "toggle-row"} onClick={() => setChecked(!checked)} role="switch" aria-checked={checked}><span>{label}</span><i><b /></i></button>;
}

function ContentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addJobs } = useAppState();
  const [title, setTitle] = useState("A creator's guide to consistent content");
  const [body, setBody] = useState("Consistency is not about showing up every day—it is about building a creative rhythm you can return to.\n\nStart by choosing one idea worth repeating. Then shape it for the way your audience listens on each platform.");
  const [selected, setSelected] = useState<string[]>(["YouTube"]);
  const [schedule, setSchedule] = useState("Today at 4:30 PM");
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState("");
  function queue() {
    addJobs(selected, schedule); setToast("Post queued in Demo mode"); window.setTimeout(() => navigate("/jobs"), 650);
  }
  return (
    <>
      <div className="detail-breadcrumb"><Link to="/dashboard">Content</Link><span>/</span><span>Draft #{id}</span></div>
      <PageHeader title={title} description={dirty ? "Unsaved changes" : "All changes saved"} action={<div className="header-actions"><Button variant="ghost" onClick={() => setDeleteOpen(true)}><Trash2 size={16} /> Delete</Button><Button onClick={() => { setDirty(false); setToast("Changes saved"); }}><Save size={16} /> Save changes</Button></div>} />
      <div className="detail-layout">
        <div className="detail-main">
          <Card>
            <div className="editor-heading"><StatusBadge status="draft" /><span>Last edited just now</span></div>
            <Field label="Title" value={title} onChange={(event) => { setTitle(event.target.value); setDirty(true); }} />
            <TextArea label="Content" value={body} rows={12} onChange={(event) => { setBody(event.target.value); setDirty(true); }} hint={`${body.length} characters · ${body.split(/\s+/).length} words`} />
          </Card>
          <Card>
            <div className="section-title"><div><h2>Platform adaptations</h2><p>Customize how the idea appears on each channel.</p></div><DemoBadge /></div>
            <Tabs items={["YouTube", "TikTok"]} active={selected.includes("TikTok") ? "TikTok" : "YouTube"} onChange={(value) => setSelected([value])} />
            <div className="adaptation-form">
              {selected.includes("TikTok") ? <>
                <TextArea label="TikTok caption" defaultValue="Consistency is a rhythm, not a streak. Here's how to find yours." rows={4} hint="68 / 2,200 characters" />
                <Field label="Hashtags" defaultValue="#creatortips #creativeprocess #consistency" />
              </> : <>
                <Field label="YouTube title" defaultValue="How to Create Consistently Without Burning Out" hint="50 / 100 characters" />
                <TextArea label="YouTube description" defaultValue="Build a creative rhythm you can actually sustain. In this video, we'll explore a calmer approach to consistency." rows={5} hint="112 / 5,000 characters" />
                <Field label="Tags" defaultValue="creator tips, consistency, creative process" />
              </>}
            </div>
          </Card>
        </div>
        <aside className="detail-aside">
          <Card className="media-preview"><div className="media-placeholder"><span>CREATIVE RHYTHM</span><button aria-label="Play preview"><Play size={22} /></button></div><div><Image size={16} /><span>Cover image · Demo media</span></div></Card>
          <Card className="cross-post">
            <div><p className="eyebrow">Cross-post</p><h2>Queue for publishing</h2><p>Choose where and when this content should go.</p></div>
            <DemoBadge />
            <label>Platforms</label>
            {["YouTube", "TikTok"].map((platform) => <button className={selected.includes(platform) ? "platform-select selected" : "platform-select"} key={platform} onClick={() => setSelected((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform])}><span className={`platform-icon ${platform.toLowerCase()}`}>{platform === "YouTube" ? <Play size={17} /> : "Tt"}</span><span><strong>{platform}</strong><small>{platform === "YouTube" ? "Connected · Demo" : "Connection required"}</small></span><span className="check-box">{selected.includes(platform) && <Check size={14} />}</span></button>)}
            {selected.includes("TikTok") && <div className="warning-box"><AlertTriangle size={17} /><span><strong>TikTok needs attention</strong>Connect a demo account in Settings before queueing.</span></div>}
            <label className="field"><span className="field__label">Schedule</span><select className="input" value={schedule} onChange={(event) => setSchedule(event.target.value)}><option>Today at 4:30 PM</option><option>Tomorrow at 9:00 AM</option><option>Post now (simulated)</option></select></label>
            <Button onClick={queue} disabled={!selected.length}><Calendar size={16} /> Queue post</Button>
            <small>No content will be published in Demo mode.</small>
          </Card>
        </aside>
      </div>
      <Dialog open={deleteOpen} title="Delete this draft?" body="This demo action removes the draft from the current session. It cannot be undone." confirmLabel="Delete draft" destructive onClose={() => setDeleteOpen(false)} onConfirm={() => navigate("/dashboard")} />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function JobsPage() {
  const { jobs, updateJob } = useAppState();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Job | null>(null);
  const [toast, setToast] = useState("");
  const shown = jobs.filter((job) => filter === "all" || job.status === filter);
  function simulate(job: Job) {
    updateJob(job.id, "processing");
    setToast("Job moved to processing");
    window.setTimeout(() => updateJob(job.id, job.platform === "YouTube" ? "completed" : "failed"), 1500);
  }
  return (
    <>
      <PageHeader eyebrow="Distribution queue" title="Jobs" description="Track every scheduled and recent publishing job. All activity is simulated." action={<DemoBadge />} />
      <Tabs items={["all", "pending", "processing", "completed", "failed", "cancelled"]} active={filter} onChange={setFilter} />
      <Card className="jobs-card">
        {shown.length ? <>
          <div className="table-wrap"><table><thead><tr><th>Content</th><th>Platform</th><th>Schedule</th><th>Status</th><th>Attempts</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{shown.map((job) => <tr key={job.id}><td><strong>{job.content}</strong><small>Job #{job.id.toString().slice(-4)}</small></td><td><span className="table-platform">{job.platform === "YouTube" ? <Play size={16} /> : <strong>Tt</strong>}{job.platform}</span></td><td>{job.schedule}</td><td><StatusBadge status={job.status} /></td><td>{job.attempts}</td><td><button className="icon-button" onClick={() => setSelected(job)} aria-label={`View ${job.content}`}><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div>
          <div className="mobile-job-list">{shown.map((job) => <button className="mobile-job-card" key={job.id} onClick={() => setSelected(job)}><div><span className="table-platform">{job.platform === "YouTube" ? <Play size={16} /> : <strong>Tt</strong>}{job.platform}</span><StatusBadge status={job.status} /></div><strong>{job.content}</strong><p><Calendar size={14} /> {job.schedule}</p></button>)}</div>
        </> : <EmptyState icon={<Clock3 size={25} />} title={`No ${filter} jobs`} body="When a job matches this filter, it will appear here with its latest status." />}
      </Card>
      {selected && <div className="drawer-scrim" onClick={() => setSelected(null)}><aside className="job-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-header"><div><p className="eyebrow">Job #{selected.id.toString().slice(-4)}</p><h2>Job details</h2></div><button className="icon-button" onClick={() => setSelected(null)}><X size={20} /></button></div><div className="job-summary"><StatusBadge status={selected.status} /><h3>{selected.content}</h3><p>{selected.platform} · {selected.schedule}</p></div><div className="timeline"><div className="done"><Check size={15} /><span><strong>Job created</strong><small>Demo workspace · 2:14 PM</small></span></div><div className={selected.status !== "pending" ? "done" : ""}><UploadCloud size={15} /><span><strong>Sent to {selected.platform}</strong><small>{selected.status === "pending" ? "Waiting in demo queue" : "Simulated provider request"}</small></span></div><div className={selected.status === "completed" ? "done" : selected.status === "failed" ? "error" : ""}><FlagIcon status={selected.status} /><span><strong>{selected.status === "failed" ? "Publishing failed" : "Publishing result"}</strong><small>{selected.status === "failed" ? "The demo connection expired. Reconnect the account and retry." : selected.status === "completed" ? "Completed successfully in Demo mode." : "Awaiting result"}</small></span></div></div>{selected.status === "pending" && <div className="drawer-actions"><Button variant="destructive" onClick={() => { updateJob(selected.id, "cancelled"); setSelected(null); }}>Cancel job</Button><Button onClick={() => simulate(selected)}>Simulate processing</Button></div>}{selected.status === "failed" && <Button onClick={() => simulate(selected)}><RefreshCw size={16} /> Retry demo job</Button>}</aside></div>}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function FlagIcon({ status }: { status: Status }) {
  return status === "failed" ? <X size={15} /> : <Check size={15} />;
}

const settingsSections = ["Profile", "AI providers", "Platform connections", "Billing", "Security"];
function SettingsPage() {
  const initial = new URLSearchParams(window.location.search).get("section") || "Profile";
  const [section, setSection] = useState(settingsSections.includes(initial) ? initial : "Profile");
  const [toast, setToast] = useState("");
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Manage your workspace preferences, connections, and plan." />
      <div className="settings-layout">
        <nav className="settings-nav">{settingsSections.map((item) => <button className={section === item ? "active" : ""} onClick={() => setSection(item)} key={item}>{item === "Profile" ? <UserRound size={17} /> : item === "AI providers" ? <KeyRound size={17} /> : item === "Platform connections" ? <RefreshCw size={17} /> : item === "Billing" ? <CreditCard size={17} /> : <LockKeyhole size={17} />}{item}</button>)}</nav>
        <div className="settings-content">
          {section === "Profile" && <SettingsCard title="Profile details" description="How you appear across your ContentFlow workspace."><div className="profile-row"><span className="avatar avatar--large">MC</span><Button variant="secondary">Change photo</Button></div><div className="form-grid"><Field label="Display name" defaultValue="Maya Chen" /><Field label="Email address" type="email" defaultValue="maya@example.com" /></div><Field label="Creator niche" defaultValue="Creative education & mindful productivity" /><Button onClick={() => setToast("Profile changes saved")}>Save changes</Button></SettingsCard>}
          {section === "AI providers" && <SettingsCard title="AI providers / BYOK" description="Bring-your-own-key support is planned. Never enter a real secret in this prototype."><div className="warning-box"><KeyRound size={17} /><span><strong>Demo only</strong>Key storage and encryption approach is still an open product decision.</span></div><Field label="Saved provider key" value="sk-demo-••••••••••••••••9K2" readOnly /><div className="button-row"><Button variant="secondary">Replace demo key</Button><Button variant="destructive">Remove</Button></div></SettingsCard>}
          {section === "Platform connections" && <SettingsCard title="Platform connections" description="Connection and token expiry states are simulated."><ConnectionCard platform="YouTube" connected detail="@MayaCreates · Demo expiry: 28 days" icon={<Play size={22} />} /><ConnectionCard platform="TikTok" detail="Not connected · Demo" icon={<strong>Tt</strong>} /></SettingsCard>}
          {section === "Billing" && <SettingsCard title="Plan & usage" description="No payment can be completed in this prototype. Pricing is unconfirmed reference only."><div className="plan-banner"><div><DemoBadge /><h3>Creator plan</h3><p>$9 / month reference price · Billing terms not final</p></div><Button variant="secondary" disabled>Manage payment (Demo)</Button></div><div className="usage-list"><Progress value={60} label="Daily generations · 3 of 5" /><Progress value={36} label="Monthly posts · 18 of 50" /><Progress value={48} label="Cross-posts · 12 of 25" /></div><Button onClick={() => setToast("Plan selection is a Demo; no payment was made.")}>Explore plans</Button></SettingsCard>}
          {section === "Security" && <SettingsCard title="Security" description="Manage password and session preferences."><Button variant="secondary">Change password</Button><div className="security-row"><div><strong>Two-factor authentication</strong><p>Planned for a future release.</p></div><DemoBadge planned /></div><div className="security-row"><div><strong>Active demo session</strong><p>Chrome · San Francisco, CA · Current session</p></div><Button variant="ghost">Sign out</Button></div></SettingsCard>}
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <Card className="settings-card"><div><h2>{title}</h2><p>{description}</p></div>{children}</Card>;
}

const adminTabs = ["Overview", "Users", "Quotas", "Moderation"];
function AdminPage() {
  const [tab, setTab] = useState("Overview");
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
  ].filter((user) => (user[0] + user[1]).toLowerCase().includes(search.toLowerCase()) && (tier === "All tiers" || user[2] === tier));
  return (
    <div className="admin-shell">
      <header className="admin-topbar"><div><Brand /><span className="admin-label"><ShieldCheck size={14} /> Protected admin</span></div><div><DemoBadge /><Link to="/dashboard" className="button button--ghost">Creator app</Link><span className="avatar">AD</span></div></header>
      <div className="admin-body">
        <aside className="admin-sidebar"><p>Control center</p>{adminTabs.map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item === "Overview" ? <BarChart3 size={18} /> : item === "Users" ? <Users size={18} /> : item === "Quotas" ? <Zap size={18} /> : <ShieldCheck size={18} />}{item}</button>)}</aside>
        <main className="admin-main">
          <PageHeader eyebrow="Protected role · Admin demo" title={tab} description={tab === "Overview" ? "Monitor workspace health, usage, and items requiring attention." : `Manage ${tab.toLowerCase()} in the protected admin workspace.`} />
          {tab === "Overview" && <><div className="metric-grid admin-metrics"><MetricCard label="Total users" value="12,482" detail="+8.4% this month" icon={<Users size={19} />} /><MetricCard label="Queue health" value="98.7%" detail="41 jobs processing" icon={<TrendingUp size={19} />} /><MetricCard label="Provider quota" value="72%" detail="Rolling 24-hour usage" icon={<Zap size={19} />} /><MetricCard label="Open alerts" value="3" detail="1 requires attention" icon={<AlertTriangle size={19} />} /></div><div className="admin-overview-grid"><Card><div className="section-title"><div><h2>Queue health</h2><p>Jobs by state · last 24 hours</p></div><span className="connection-state connected">Operational</span></div><div className="bar-chart">{[62, 84, 48, 91, 72, 58, 80, 96, 76, 88, 69, 92].map((value, index) => <span key={index} style={{ height: `${value}%` }} />)}</div><div className="chart-legend"><span><i className="legend-indigo" /> Completed 8,421</span><span><i className="legend-amber" /> Processing 41</span><span><i className="legend-red" /> Failed 86</span></div></Card><Card><div className="section-title"><div><h2>Needs attention</h2><p>Current operational alerts</p></div></div>{[["Provider quota at 72%", "Rolling 24-hour text generation usage", "warning"], ["12 moderation items waiting", "Oldest item is 43 minutes", "neutral"], ["TikTok retries elevated", "2.1% failure rate in demo data", "danger"]].map(([title, body, state]) => <button className={`alert-row ${state}`} key={title} onClick={() => setTab(state === "neutral" ? "Moderation" : "Quotas")}><AlertTriangle size={17} /><span><strong>{title}</strong><small>{body}</small></span><ArrowRight size={16} /></button>)}</Card></div></>}
          {tab === "Users" && <Card className="admin-table-card"><div className="table-tools"><label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users or email" /></label><select className="input" value={tier} onChange={(event) => setTier(event.target.value)}><option>All tiers</option><option>Free</option><option>Creator</option><option>Pro</option><option>Agency</option></select></div><div className="table-wrap"><table><thead><tr><th>User</th><th>Tier</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead><tbody>{users.map((user) => <tr key={user[1]}><td><strong>{user[0]}</strong><small>{user[1]}</small></td><td>{user[2]}</td><td><span className={user[3] === "Active" ? "connection-state connected" : "connection-state"}>{user[3]}</span></td><td>{user[4]}</td><td><Button variant="ghost" onClick={() => setConfirmUser(user[0])}>Change tier</Button></td></tr>)}</tbody></table></div><div className="pagination"><span>Showing {users.length} of 12,482 users</span><div><Button variant="secondary" disabled>Previous</Button><Button variant="secondary">Next</Button></div></div></Card>}
          {tab === "Quotas" && <div className="quota-grid">{[["Text generation provider", "720K / 1M tokens", 72, "Rolling 24 hours"], ["Image generation provider", "1,842 / 5,000 images", 37, "Calendar month"], ["Publishing API", "84K / 100K requests", 84, "Rolling 24 hours"], ["Storage", "1.4 / 5 TB", 28, "Current billing period"]].map(([name, value, percent, period]) => <Card className="quota-card" key={name as string}><div><span className="feature-icon"><Zap size={19} /></span><DemoBadge /></div><h3>{name}</h3><strong>{value}</strong><Progress value={percent as number} /><p>{period} · Units shown explicitly</p></Card>)}</div>}
          {tab === "Moderation" && <div className="moderation-grid">{[["A controversial take on creator burnout", "Jon Bell", "Text · 684 words"], ["Stop chasing the algorithm", "Avery Studio", "Video script · 2m 14s"], ["The productivity advice I regret", "Priya Shah", "Text · 910 words"]].map(([title, owner, type]) => <Card className="moderation-card" key={title}><div className="moderation-preview"><MessageSquareText size={26} /><span>CONTENT PREVIEW</span></div><StatusBadge status="pending" /><h3>{title}</h3><p>“The advice that helped me grow eventually became the same advice I needed to question...”</p><small>Owner: {owner} · {type}</small><div><Button variant="secondary" onClick={() => { setModeration(`Reject: ${title}`); }}>Reject</Button><Button onClick={() => { setModeration(`Approve: ${title}`); }}>Approve</Button></div></Card>)}</div>}
        </main>
      </div>
      <Dialog open={Boolean(confirmUser)} title={`Change ${confirmUser}'s tier?`} body="This is a simulated admin action. No billing or account permissions will be changed." confirmLabel="Confirm tier change" onClose={() => setConfirmUser("")} onConfirm={() => { setConfirmUser(""); setToast("User tier updated in Demo mode"); setTab("Quotas"); }}><label className="field"><span className="field__label">New tier</span><select className="input"><option>Pro</option><option>Creator</option><option>Agency</option><option>Free</option></select></label></Dialog>
      <Dialog open={Boolean(moderation)} title={moderation} body="Add a reason to keep the moderation decision clear and auditable." confirmLabel="Confirm decision" destructive={moderation.startsWith("Reject")} onClose={() => setModeration("")} onConfirm={() => { setModeration(""); setToast("Moderation decision saved in Demo mode"); }}><TextArea label="Decision reason" placeholder="Explain why this content was approved or rejected..." rows={4} /></Dialog>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}

function ProductNotes() {
  return <div className="notes-page"><Brand /><Card><p className="eyebrow">Product handoff</p><h1>Open product decisions</h1><p>These details require product, legal, and engineering alignment before implementation.</p><ul><li><strong>Quota resets:</strong> Confirm the timezone used for daily and monthly reset labels.</li><li><strong>Billing:</strong> Confirm billing currency, cadence, taxes, and final tier terms.</li><li><strong>BYOK storage:</strong> Define encryption, key rotation, access controls, and deletion policy.</li><li><strong>Social permissions:</strong> Approve the exact YouTube and TikTok publishing scopes.</li></ul><Link className="button button--secondary" to="/">Back to home</Link></Card></div>;
}

export const router = createBrowserRouter([
  {
    Component: Root,
    children: [
      { index: true, Component: Landing },
      { path: "login", element: <AuthPage /> },
      { path: "signup", element: <AuthPage signup /> },
      {
        Component: AppShell,
        children: [
          { path: "dashboard", Component: Dashboard },
          { path: "create", Component: CreatePage },
          { path: "content/:id", Component: ContentDetail },
          { path: "jobs", Component: JobsPage },
          { path: "settings", Component: SettingsPage },
        ],
      },
      { path: "admin", Component: AdminPage },
      { path: "notes", Component: ProductNotes },
      { path: "*", element: <div className="notes-page"><Brand /><EmptyState icon={<BookOpen size={26} />} title="Page not found" body="The page you're looking for isn't part of this demo." action={<Link className="button button--primary" to="/">Go home</Link>} /></div> },
    ],
  },
]);
