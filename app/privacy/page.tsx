import { LegalDocument } from "@/components/legal/LegalDocument";
import { privacySections } from "@/lib/legal/content";

export const metadata = {
  title: "Privacy Policy",
  description: "How Scrolls collects, uses, and protects your information."
};

export default function PrivacyPage() {
  return <LegalDocument title="Privacy Policy" sections={privacySections} />;
}
