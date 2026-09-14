import { useState } from 'react';
import type { FC } from 'react';
import { Check, X } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiBrand } from '../../shared/types';
import { activeFilterCount, type CatalogFilters, type CatalogFacets } from '../../app/lib/catalog';
import { formatThousands, parseDigits } from '../admin/lib/format';

/** Bo'lim sarlavhasi — o'ngida ixtiyoriy izoh ("1 tanlangan"). */
const Heading: FC<{ title: string; note?: string }> = ({ title, note }) => (
  <div className="mb-2 flex items-baseline justify-between gap-3">
    <h3 className="text-label font-semibold text-primary">{title}</h3>
    {note && <span className="text-label text-muted-2">{note}</span>}
  </div>
);

// Ikki chiziq: matn (sarlavha, yorliq, input ichidagi raqam) konteyner chetida,
// bosiladigan quti (qator to'ldirmasi, input) undan 12px tashqarida (`BLEED`).
// Desktop kartasi ham, mobil varaq ham `px-6` — quti chetdan 12px ichkarida qoladi
// va uning 8px radiusi kartaning 20px radiusi bilan konsentrik (20 − 12).
const BLEED = '-mx-3';
// Ajratgich ustida ham, ostida ham ~24px ko'rinadigan bo'shliq: qatorning o'z ichki bo'shlig'i
// (36px balandlikda 14px matn) pastki `pb-3`ga qo'shiladi, shuning uchun tepadagi `pt-5` kattaroq.
const SECTION = 'border-t border-line pt-5 pb-3 first:border-t-0 first:pt-0 last:pb-0';
// Qator balandligi: mobil varaqda 44px (tegish maydonining pastki chegarasi), desktop panelda 36px.
// Tanlangan qator to'ldirilmaydi — tanlovni belgi aytadi; "Holati"da bittasi doim tanlangan edi
// va uning kulrang polosasi hech narsa bildirmay turardi. Hover `fill-2`: panel endi karta
// (`surface`) ustida, `row-alt` esa sahifa foniga moslangan — dark'da u kartadan to'qroq chiqardi.
// Fokus halqasi butun qatorda: 18px doiradagi halqa klaviaturada sezilmasdi.
const ROW = 'press press-surface group flex h-11 cursor-pointer items-center gap-3 rounded-xs px-3 text-label outline-none hover:bg-fill-2 focus-visible:ring-2 focus-visible:ring-accent has-focus-visible:ring-2 has-focus-visible:ring-accent lg:h-9';
// Native input `sr-only` (klaviatura va skrinrider qoladi; brauzerning oq checkbox'i dark rejimda
// og'ir ko'rinardi), ko'rinadigan doira `group-has-checked` bilan bo'yaladi. Checkbox ham, radio ham dumaloq: radius shkalasida 18px kvadrat uchun pog'ona
// yo'q — 8px uni baribir doiraga aylantiradi, o'tkir burchak esa tizimga begona. Farq belgilanganda
// ko'rinadi (✓ yoki nuqta); "Holati"da bittasi doim tanlangan, shuning uchun nuqta doim ko'rinadi.
const GLYPH = 'flex size-4.5 shrink-0 items-center justify-center rounded-full border border-muted-3 transition-colors group-hover:border-muted-2 group-has-checked:border-accent group-has-checked:bg-accent';
// Mobil varaqda 16px (pastida iOS fokusda zoom qiladi), desktop panelda 14px.
const INPUT = 'h-11 w-full min-w-0 rounded-xs border border-line bg-transparent px-3 text-control text-primary tabular-nums transition-colors placeholder:text-muted-2 hover:border-muted-3 focus:border-accent focus:outline-none lg:h-9 lg:text-label';

const FilterPanel: FC<{
  t: Translation;
  brands: ApiBrand[];
  facets: CatalogFacets;
  filters: CatalogFilters;
  onChange: (next: Partial<CatalogFilters>) => void;
  onClear: () => void;
  hideBrands?: boolean;
}> = ({ t, brands, facets, filters, onChange, onClear, hideBrands }) => {
  const appliedLo = filters.priceMin !== null ? String(filters.priceMin) : '';
  const appliedHi = filters.priceMax !== null ? String(filters.priceMax) : '';
  const [lo, setLo] = useState(appliedLo);
  const [hi, setHi] = useState(appliedHi);
  // "Ko'rsatish" faqat kiritilgan qiymat qo'llanganidan farq qilganda chiqadi.
  const dirty = lo.trim() !== appliedLo || hi.trim() !== appliedHi;

  function toggleBrand(id: string) {
    const next = filters.brands.includes(id) ? filters.brands.filter((x) => x !== id) : [...filters.brands, id];
    onChange({ brands: next });
  }
  function applyPrice() {
    if (!dirty) return;
    const pm = parseDigits(lo) || null; // "11 900 000" ham o'tadi; 0/bo'sh → chegara yo'q
    const px = parseDigits(hi) || null;
    onChange({ priceMin: pm, priceMax: px });
  }

  const visibleBrands = brands.filter((b) => (facets.brandCounts[b.id] ?? 0) > 0 || filters.brands.includes(b.id));
  const active = activeFilterCount(filters, { ignoreBrands: hideBrands });
  const onEnter = (e: { key: string }) => { if (e.key === 'Enter') applyPrice(); };

  return (
    <div className="flex flex-col">
      {!hideBrands && visibleBrands.length > 0 && (
        <section className={SECTION}>
          <Heading title={t.filterBrand} note={filters.brands.length > 0 ? `${filters.brands.length} ${t.filterSelected}` : undefined} />
          <div className={`${BLEED} flex flex-col`}>
            {visibleBrands.map((b) => (
              <label key={b.id} className={`${ROW} text-primary`}>
                <input type="checkbox" className="sr-only" aria-label={b.name} checked={filters.brands.includes(b.id)} onChange={() => toggleBrand(b.id)} />
                <span aria-hidden className={GLYPH}>
                  <Check className="size-3 text-bg opacity-0 transition-opacity group-has-checked:opacity-100" strokeWidth={3} />
                </span>
                <span className="flex-1 truncate">{b.name}</span>
                <span className="text-muted-2 tabular-nums">{facets.brandCounts[b.id] ?? 0}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      <section className={SECTION}>
        <Heading title={t.filterPrice} />
        {/* Placeholder — joriy natijadagi narx diapazoni. Oradagi tire yo'q: 240px kartada
            u "60 480 000"ni kesib qo'yardi, ikki maydonning "dan–gacha" ekani esa
            placeholder'dan ko'rinib turadi (skrinrider uchun `aria-label`). */}
        <div className={BLEED}>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              placeholder={formatThousands(facets.priceMin) || t.filterPriceFrom}
              aria-label={t.filterPriceFrom}
              className={INPUT}
              value={lo}
              onChange={(e) => setLo(e.target.value)}
              onKeyDown={onEnter}
            />
            <input
              inputMode="numeric"
              placeholder={formatThousands(facets.priceMax) || t.filterPriceTo}
              aria-label={t.filterPriceTo}
              className={INPUT}
              value={hi}
              onChange={(e) => setHi(e.target.value)}
              onKeyDown={onEnter}
            />
          </div>
          {dirty && (
            <button onClick={applyPrice} className="press mt-2 flex h-11 w-full items-center justify-center rounded-xs bg-accent text-control text-bg hover:bg-accent-hover lg:h-9 lg:text-label">
              {t.filterApply}
            </button>
          )}
        </div>
      </section>

      <section className={SECTION}>
        <Heading title={t.filterCondition} />
        {/* Ilgari bu uchta teng bo'lakli segment-kontrol edi. 240px enli panelda
            "Ishlatilgan" o'z bo'lagiga zo'rg'a sig'ar, "Yangi" esa bo'sh joyda
            suzib turardi — uchala yorliq uzunligi har xil bo'lgani uchun teng
            bo'lish ishlamaydi. Endi u tepasidagi brendlar ro'yxati bilan bir xil
            qator idiomasi: to'liq enli, bosish maydoni butun qator. */}
        <div className={`${BLEED} flex flex-col`}>
          {([null, 'yangi', 'ishlatilgan'] as const).map((c) => {
            const label = c === null ? t.filterAll : c === 'yangi' ? t.badgeNew : t.badgeUsed;
            return (
              <label key={c ?? 'all'} className={`${ROW} text-primary`}>
                <input type="radio" name="holat" className="sr-only" aria-label={label} checked={filters.condition === c} onChange={() => onChange({ condition: c })} />
                <span aria-hidden className={GLYPH}>
                  <span className="size-1.5 rounded-full bg-bg opacity-0 transition-opacity group-has-checked:opacity-100" />
                </span>
                <span className="flex-1 truncate">{label}</span>
              </label>
            );
          })}
        </div>
      </section>

      {active > 0 && (
        <section className={SECTION}>
          <div className={`${BLEED} flex flex-col`}>
            {/* Belgi ustunida X — yorliq brend nomlari bilan bir chiziqda. */}
            <button onClick={onClear} className={`${ROW} text-muted hover:text-primary`}>
              <X aria-hidden className="size-4.5 shrink-0" />
              {t.filterClear}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
export default FilterPanel;
