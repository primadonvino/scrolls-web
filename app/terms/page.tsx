import { LegalDocument } from "@/components/legal/LegalDocument";
import { termsSections } from "@/lib/legal/content";

export const metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Scrolls."
};

export default function TermsPage() {
  return <LegalDocument title="Terms of Service" sections={termsSections} />;
}
