import type { ReactNode } from "react";
import { WorkspaceShell } from "../screens";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
