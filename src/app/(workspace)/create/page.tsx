import type { Metadata } from "next";
import { CreateScreen } from "../../screens";

export const metadata: Metadata = {
  title: "Create Content",
  description:
    "Generate and refine editable drafts with channel-specific adaptations for YouTube and TikTok.",
  alternates: {
    canonical: "/create",
  },
};

export default function CreatePage() {
  return <CreateScreen />;
}
