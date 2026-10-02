import { Wordmark } from '@/components/freyr/Wordmark';
import { ATUALIZADO_EM, LEGAL_DOCS, legalHref, type LegalDocKey } from '@/legal/content';

const css = `
.fr-legal { min-height: 100vh; background: var(--background); color: var(--ink); }
.fr-legal-inner { max-width: 760px; margin: 0 auto; padding: var(--space-8) var(--space-4) var(--space-12); display: grid; gap: var(--space-8); }
.fr-legal-top { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
.fr-legal-nav { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); font-size: 14px; }
.fr-legal-nav a { color: var(--ink-muted); text-decoration: underline; text-underline-offset: 3px; }
.fr-legal-nav a[aria-current="page"] { color: var(--ink); font-weight: 700; text-decoration: none; }
.fr-legal h1 { margin: 0; font-size: 32px; line-height: 36px; font-weight: 800; letter-spacing: -0.02em; }
.fr-legal-updated { margin: var(--space-2) 0 0; font-size: 14px; color: var(--ink-muted); }
.fr-legal section { display: grid; gap: var(--space-3); }
.fr-legal h2 { margin: 0; font-size: 20px; line-height: 26px; font-weight: 700; }
.fr-legal p, .fr-legal li { margin: 0; font-size: 16px; line-height: 26px; }
.fr-legal ul { margin: 0; padding-left: var(--space-6); list-style: disc; display: grid; gap: var(--space-2); }
.fr-legal-back { font-size: 14px; font-weight: 700; color: var(--ink); }
`;

function Body({ lines }: { lines: string[] }) {
  // Consecutive "• " lines become one list; the rest are paragraphs.
  const blocks: (string | string[])[] = [];
  for (const line of lines) {
    if (line.startsWith('• ')) {
      const last = blocks.at(-1);
      if (Array.isArray(last)) last.push(line.slice(2));
      else blocks.push([line.slice(2)]);
    } else blocks.push(line);
  }
  return (
    <>
      {blocks.map((block, i) =>
        Array.isArray(block)
          ? <ul key={i}>{block.map(item => <li key={item}>{item}</li>)}</ul>
          : <p key={i}>{block}</p>
      )}
    </>
  );
}

/** Privacy policy, terms of use and LGPD rights: public pages, reachable with or without a session. */
export function LegalPage({ doc }: { doc: LegalDocKey }) {
  const current = LEGAL_DOCS[doc];
  return (
    <main className="fr-legal">
      <style href="freyr-legal" precedence="default">{css}</style>
      <div className="fr-legal-inner">
        <div className="fr-legal-top">
          <Wordmark />
          <a className="fr-legal-back" href="#/">← Voltar ao Freyr</a>
        </div>
        <nav aria-label="Documentos" className="fr-legal-nav">
          {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map(key => (
            <a key={key} href={legalHref(key)} aria-current={key === doc ? 'page' : undefined}>{LEGAL_DOCS[key].linkLabel}</a>
          ))}
        </nav>
        <header>
          <h1>{current.title}</h1>
          <p className="fr-legal-updated">Atualizado em {ATUALIZADO_EM}</p>
        </header>
        {current.sections.map(section => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            <Body lines={section.body} />
          </section>
        ))}
      </div>
    </main>
  );
}
