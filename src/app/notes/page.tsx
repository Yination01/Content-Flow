import type { Metadata } from "next";
import { ProductNotesScreen } from "../screens";

export const metadata: Metadata = {
  title: "Product & Architecture Notes",
  description:
    "Architecture and security policy decisions for ContentFlow.",
  alternates: {
    canonical: "/notes",
  },
};

export default function NotesPage() {
  return <ProductNotesScreen />;
}
