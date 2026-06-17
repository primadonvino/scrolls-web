import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export default function TermsPage() {
  return (
    <div>
      <SiteHeader />
      <LegalPage title="Terms of Service">
        <p>
          By using Scrolls, you agree to use the service lawfully and respectfully. You are responsible for
          the content you post, message, upload, or share.
        </p>
        <p>
          Do not post or send illegal content, harassment, hate speech, explicit sexual content, spam,
          impersonation, or anything that violates another person's rights. Scrolls may remove content,
          limit access, or terminate accounts that violate these terms or our safety rules.
        </p>
        <p>
          Scrolls includes user-generated content. You can report objectionable content and block abusive
          users. Account deletion is available from account settings and permanently removes your Scrolls
          account and associated data from active surfaces.
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
