import { SiteHeader } from "@/components/SiteHeader";
import type { LegalSection } from "@/lib/legal/content";

/** Renders a Scrolls legal document (title + numbered sections) like the app. */
export function LegalDocument({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <div className="scrolls-glass rounded-[2rem] p-7">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Scrolls</p>
          <h1 className="mt-3 text-4xl font-black">{title}</h1>
          <div className="mt-7 space-y-7">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-black text-white">{section.title}</h2>
                <p className="mt-2 text-sm leading-7 text-white/72">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
