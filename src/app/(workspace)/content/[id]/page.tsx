import type { Metadata } from "next";
import { ContentDetailScreen } from "../../../screens";

export const metadata: Metadata = {
  title: "Content Editor & Adaptations",
  description:
    "Edit your draft, customize YouTube and TikTok variants, and queue publishing jobs.",
};

export default function ContentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <ContentDetailScreen id={params.id} />;
}
