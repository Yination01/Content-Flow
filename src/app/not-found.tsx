import Link from "next/link";
import { Brand } from "./screens";

export default function NotFound() {
  return (
    <div className="notes-page">
      <Brand />
      <div className="card" style={{ maxWidth: 520, textAlign: "center" }}>
        <p className="eyebrow">Error 404</p>
        <h1 style={{ fontSize: "2rem", marginBottom: 12 }}>
          Page not found
        </h1>
        <p style={{ marginBottom: 24 }}>
          The page or draft you requested does not exist or has been moved. Check
          the URL or return to your workspace.
        </p>
        <div
          className="button-row"
          style={{ justifyContent: "center", flexWrap: "wrap", gap: 10 }}
        >
          <Link className="button button--primary" href="/dashboard">
            Open workspace
          </Link>
          <Link className="button button--secondary" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
