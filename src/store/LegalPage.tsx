import type { FC } from 'react';
import type { Translation } from '../locales';
import { renderMarkdown, type MdBlock, type MdInline } from '../lib/markdown';
import { Inlines, MdBlockView } from './Markdown';
import PageHero from './PageHero';

/**
 * Huquqiy hujjat (2026-09-15): Ommaviy oferta, Maxfiylik siyosati, Qaytarish va almashtirish.
 * Matn bazadan (admin → Sahifalar) — sahifa faqat uni joylashtiradi: gradient hero, `lg`da chapda
 * joyida turadigan mundarija (har `##` bo'lim), o'ngda 17px matn, bo'limlar hairline bilan ajraladi,
 * band raqamlari ("1.1.") alohida ustunda (`MdBlockView` `ol`).
 *
 * Hujjat ustuni mundarija bo'lmasa ham ikkinchi ustunda turadi — uchala hujjatda matn bir xil
 * chiziqdan boshlanadi. Bo'lim id'lari tartib raqamidan (`bolim-N`): o'zbekcha sarlavhadan slug
 * yasash apostrof va kirillda mo'rt bo'lardi.
 */
const LegalPage: FC<{ t: Translation; title: string; lede: string; source: string }> = ({ t, title, lede, source }) => {
  const intro: MdBlock[] = [];
  const sections: { heading: MdInline[]; body: MdBlock[] }[] = [];
  for (const b of renderMarkdown(source)) {
    if (b.type === 'h2') sections.push({ heading: b.inlines, body: [] });
    else if (sections.length > 0) sections[sections.length - 1].body.push(b);
    else intro.push(b);
  }

  return (
    <>
      <PageHero title={title} lede={lede} compact />

      <div className="shell grid gap-10 pb-14 pt-10 md:pb-20 md:pt-14 lg:grid-cols-[220px_minmax(0,760px)] lg:justify-center lg:gap-20">
        {sections.length > 1 && (
          <nav aria-label={t.legalToc} className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-label font-semibold text-muted-2">{t.legalToc}</p>
              <ol className="mt-4 flex flex-col gap-3 border-l border-divider text-label">
                {sections.map((s, i) => (
                  <li key={i}>
                    <a
                      href={`#bolim-${i + 1}`}
                      className="-ml-px block border-l border-transparent pl-4 text-muted hover:border-primary hover:text-primary"
                    >
                      {s.heading.map((seg) => seg.text).join('')}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
        )}

        <article className="flex min-w-0 flex-col gap-10 text-copy lg:col-start-2">
          {intro.length > 0 && (
            <div className="flex flex-col gap-4">
              {intro.map((b, i) => <MdBlockView key={i} block={b} />)}
            </div>
          )}
          {sections.map((s, i) => (
            <section
              key={i}
              id={`bolim-${i + 1}`}
              className="flex scroll-mt-32 flex-col gap-4 border-t border-divider pt-10 first:border-t-0 first:pt-0 lg:scroll-mt-28"
            >
              <h2 className="text-subhead font-semibold text-balance text-primary"><Inlines inlines={s.heading} /></h2>
              {s.body.map((b, j) => <MdBlockView key={j} block={b} />)}
            </section>
          ))}
        </article>
      </div>
    </>
  );
};

export default LegalPage;
