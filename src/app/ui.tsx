"use client";

import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  XCircle,
} from "lucide-react";

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
    <button
      className={`button button--${variant} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  error,
  valid,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  valid?: boolean;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className={
          error ? "input input--error" : valid ? "input input--valid" : "input"
        }
        aria-invalid={Boolean(error)}
        {...props}
      />
      {(error || hint) && (
        <span className={error ? "field__error" : "field__hint"}>
          {error || hint}
        </span>
      )}
    </label>
  );
}

export function TextArea({
  label,
  error,
  hint,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <textarea
        className={error ? "textarea input--error" : "textarea"}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {(error || hint) && (
        <span className={error ? "field__error" : "field__hint"}>
          {error || hint}
        </span>
      )}
    </label>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}

export type Status =
  | "draft"
  | "ready"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export function StatusBadge({ status }: { status: Status }) {
  const icon =
    status === "completed" || status === "ready" ? (
      <CheckCircle2 size={13} aria-hidden="true" />
    ) : status === "failed" || status === "cancelled" ? (
      <XCircle size={13} aria-hidden="true" />
    ) : status === "processing" ? (
      <LoaderCircle size={13} className="spin" aria-hidden="true" />
    ) : status === "pending" ? (
      <Clock3 size={13} aria-hidden="true" />
    ) : (
      <CircleAlert size={13} aria-hidden="true" />
    );
  return (
    <span className={`status status--${status}`}>
      {icon}
      {status}
    </span>
  );
}

export function WorkspaceBadge({
  label = "Active workspace",
  planned = false,
}: {
  label?: string;
  planned?: boolean;
}) {
  return <span className="demo-badge">{planned ? "Planned" : label}</span>;
}

export const DemoBadge = WorkspaceBadge;

export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div className="progress-wrap">
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          <strong>{value}%</strong>
        </div>
      )}
      <div
        className="progress"
        role="progressbar"
        aria-label={label || "Progress"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
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
      <div className="metric__top">
        <span>{label}</span>
        {icon}
      </div>
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
    <div
      className="tabs"
      role="tablist"
      onKeyDown={(e) => {
        const idx = items.indexOf(active);
        if (idx === -1) return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          onChange(items[(idx + 1) % items.length]);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          onChange(items[(idx - 1 + items.length) % items.length]);
        } else if (e.key === "Home") {
          e.preventDefault();
          onChange(items[0]);
        } else if (e.key === "End") {
          e.preventDefault();
          onChange(items[items.length - 1]);
        }
      }}
    >
      {items.map((item) => (
        <button
          key={item}
          type="button"
          className={active === item ? "tab tab--active" : "tab"}
          onClick={() => onChange(item)}
          role="tab"
          aria-selected={active === item}
          tabIndex={active === item ? 0 : -1}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function SegmentedOtpInput({
  value,
  onChange,
  length = 6,
  label = "6-digit verification code",
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  label?: string;
}) {
  const digits = Array.from({ length }, (_, idx) => value[idx] || "");

  function updateAt(index: number, char: string) {
    const clean = char.replace(/\D/g, "").slice(-1);
    const nextArr = [...digits];
    nextArr[index] = clean;
    onChange(nextArr.join(""));
  }

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div
        className="otp-grid"
        role="group"
        aria-label={label}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))`,
          gap: "8px",
        }}
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className="input"
            aria-label={`Digit ${index + 1}`}
            value={digit}
            style={{
              textAlign: "center",
              fontWeight: 700,
              fontSize: "1.05rem",
              padding: "10px 0",
            }}
            onChange={(e) => {
              const val = e.target.value;
              updateAt(index, val);
              if (val && e.currentTarget.nextElementSibling instanceof HTMLElement) {
                e.currentTarget.nextElementSibling.focus();
              }
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Backspace" &&
                !digits[index] &&
                e.currentTarget.previousElementSibling instanceof HTMLElement
              ) {
                e.currentTarget.previousElementSibling.focus();
              }
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData
                .getData("text")
                .replace(/\D/g, "")
                .slice(0, length);
              if (pasted) {
                e.preventDefault();
                onChange(pasted);
              }
            }}
          />
        ))}
      </div>
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
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title">{title}</h2>
        {body && <p>{body}</p>}
        {children}
        <div className="dialog__actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <CheckCircle2 size={18} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">
        ×
      </button>
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-label="Loading content">
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
