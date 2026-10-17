import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { CheckCircle2, CircleAlert, Clock3, LoaderCircle, XCircle } from "lucide-react";

export function Button({
  variant = "primary",
  loading,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  loading?: boolean;
}) {
  return (
    <button className={`button button--${variant} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className={error ? "input input--error" : "input"} aria-invalid={Boolean(error)} {...props} />
      {(error || hint) && <span className={error ? "field__error" : "field__hint"}>{error || hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  error,
  hint,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <textarea className={error ? "textarea input--error" : "textarea"} aria-invalid={Boolean(error)} {...props} />
      {(error || hint) && <span className={error ? "field__error" : "field__hint"}>{error || hint}</span>}
    </label>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export type Status = "draft" | "ready" | "pending" | "processing" | "completed" | "failed" | "cancelled";

export function StatusBadge({ status }: { status: Status }) {
  const icon =
    status === "completed" || status === "ready" ? (
      <CheckCircle2 size={13} />
    ) : status === "failed" || status === "cancelled" ? (
      <XCircle size={13} />
    ) : status === "processing" ? (
      <LoaderCircle size={13} className="spin" />
    ) : status === "pending" ? (
      <Clock3 size={13} />
    ) : (
      <CircleAlert size={13} />
    );
  return (
    <span className={`status status--${status}`}>
      {icon}
      {status}
    </span>
  );
}

export function DemoBadge({ planned = false }: { planned?: boolean }) {
  return <span className="demo-badge">{planned ? "Planned" : "Demo mode"}</span>;
}

export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div className="progress-wrap">
      {label && <div className="progress-label"><span>{label}</span><strong>{value}%</strong></div>}
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="metric">
      <div className="metric__top"><span>{label}</span>{icon}</div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (item: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item}
          className={active === item ? "tab tab--active" : "tab"}
          onClick={() => onChange(item)}
          role="tab"
          aria-selected={active === item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function Dialog({
  open,
  title,
  body,
  confirmLabel,
  destructive,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="dialog-title">{title}</h2>
        {body && <p>{body}</p>}
        {children}
        <div className="dialog__actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={18} />
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss notification">×</button>
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-label="Loading content">
      {Array.from({ length: lines }).map((_, index) => <span key={index} />)}
    </div>
  );
}
