import { SiteHeader } from "@/components/SiteHeader";
import type { ReactNode } from "react";

export default function PrivacyPage() {
  return (
    <div>
      <SiteHeader />
      <LegalPage title="Privacy Policy">
        <p>
          Scrolls collects the information needed to create your account, show your profile, deliver posts,
          messages, comments, moments, moderation tools, and keep the service secure.
        </p>
        <p>
          This includes account details such as username, email address, display name, profile details,
          posts, comments, media uploads, messages, follows, reports, blocks, and app interaction data used
          for app functionality and safety. Scrolls does not sell your personal information or use it for
          cross-app tracking.
        </p>
        <p>
          Media you upload may be stored with Scrolls' cloud media providers so it can be displayed in the
          app and on public web previews when you choose to share it. You can delete your account from
          account settings.
        </p>
      </LegalPage>
    </div>
  );
}

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-3xl px-5 pb-16">
      <div className="scrolls-glass rounded-[2rem] p-7">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Scrolls</p>
        <h1 className="mt-3 text-4xl font-black">{title}</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-white/72">{children}</div>
      </div>
    </section>
  );
}
