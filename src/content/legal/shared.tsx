import type { ReactNode } from 'react';

/** Layout helpers for the legal pages. Content lives in the per-locale files next to this one. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="legal max-w-prose">
      <h1 className="text-4xl font-extrabold">{title}</h1>
      <p className="mt-2 text-sm text-muted">{updated}</p>
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

export const CONTACT = (
  <a href="mailto:hello@wantedlevel.be" className="link">
    hello@wantedlevel.be
  </a>
);
