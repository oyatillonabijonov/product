import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { ArrowRight, CaretDown, ChatCircleDots, FilmSlate, Megaphone, ShieldCheck, Slideshow, SquaresFour, TagSimple, TextAa } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { SiteSection } from '../../lib/site-content';
import { ASSET_DEFAULTS } from '../../store/SiteAssets';
import { listBanners, listBrands, listNews } from '../api';
import { AssetInput, ContentPage, delay, SECTION_META, SectionCard, SiteTextInput, type SiteContent } from '../ContentFields';
import type { ContentSection } from '../lib/content-form';
import SectionTabs from '../SectionTabs';
import { Button, Card, Dot, HUE_DOT, IconTile, type Hue } from '../ui';

type BlockId = 'hero' | 'banners' | 'services' | 'news' | 'brands' | 'consult';

/** Landing bloklari saytdagi tartibda (spec §5): hero → bannerlar → xizmatlar → yangiliklar → brendlar → konsultatsiya. */
const BLOCKS: { id: BlockId; icon: PhIcon; hue: Hue }[] = [
  { id: 'hero', icon: SquaresFour, hue: 'violet' },
  { id: 'banners', icon: Slideshow, hue: 'orange' },
  { id: 'services', icon: ShieldCheck, hue: 'green' },
  { id: 'news', icon: Megaphone, hue: 'pink' },
  { id: 'brands', icon: TagSimple, hue: 'blue' },
  { id: 'consult', icon: ChatCircleDots, hue: 'teal' },
];
const HERO_SECTIONS: SiteSection[] = ['heroApple', 'heroPc', 'heroAudio', 'heroVideo'];
/** `homeTitles` kartasining maydonlari o'z bloklariga bo'linadi; qolgani (shior) — oxirida. */
const TITLE_OF: Partial<Record<BlockId, string>> = { news: 'newsTitle', brands: 'homeBrands' };

const anchor = (id: BlockId) => `home-block-${id}`;

/** Timeline bloki: chapda rangli raqam va chiziq, o'ngda nom, saytdagi vazifasi va kartalar. */
const Block: FC<{ id: BlockId; n: number; hue: Hue; title: string; text: string; last?: boolean; children: ReactNode }> = ({ id, n, hue, title, text, last, children }) => (
  <section id={anchor(id)} style={delay(n)} className="stagger grid scroll-mt-28 grid-cols-[28px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[36px_minmax(0,1fr)] sm:gap-x-4">
    <div className="flex flex-col items-center">
      <span className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums text-white sm:size-9 sm:text-base ${HUE_DOT[hue]}`}>{n}</span>
      {!last && <span aria-hidden className="mt-2 w-px flex-1 bg-border-strong" />}
    </div>
    <div className={`min-w-0 ${last ? '' : 'pb-8'}`}>
      <div className="flex min-h-7 flex-col justify-center sm:min-h-9">
        <h2 className="text-lg font-bold text-text">{title}</h2>
      </div>
      <p className="mt-0.5 max-w-2xl text-base text-text-muted">{text}</p>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </div>
  </section>
);

/** Yo'nalish kartasi: chapda saytdagi ustun nusxasi (rasm + nom), o'ngda nom va rasmlar, pastda cover videolari. */
const DirectionCard: FC<{ content: SiteContent; section: ContentSection }> = ({ content, section }) => {
  const { t } = useTranslation(['site', 'content']);
  // `FC` props tipsiz — bo'lim tipi shu yerda tiklanadi.
  const s: ContentSection = section;
  const meta = SECTION_META[s.id];
  const image = s.assets.find((f) => f.key.endsWith('.image'));
  const videos = s.assets.filter((f) => f.kind === 'video');
  const stills = s.assets.filter((f) => f.kind === 'image');
  const src = image ? content.assets[image.key] || ASSET_DEFAULTS[image.key] : '';
  const label = s.texts[0] ? content.texts[s.texts[0].key]?.uz ?? '' : '';
  return (
    <Card icon={meta.icon} hue={meta.hue} title={t(`sections.${s.id}`)} description={t(`sectionHints.${s.id}`)}>
      <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)]">
        <figure className="mx-auto w-40 md:w-full">
          <div className="relative aspect-[3/4] overflow-hidden rounded-control bg-inverted">
            {src && <img src={src} alt="" className="absolute inset-0 size-full object-cover" />}
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/45 via-black/0 to-black/0" />
            <p className="absolute inset-x-3 bottom-4 whitespace-pre-line text-center text-lg font-medium leading-tight text-white">{label}</p>
          </div>
          <figcaption className="mt-2 text-center text-sm text-text-muted">{t('content:contentHome.heroPreview')}</figcaption>
        </figure>
        <div className="flex min-w-0 flex-col gap-5">
          {s.texts.map((f) => <SiteTextInput key={f.key} content={content} field={f} rows={2} />)}
          <div className="grid gap-4 sm:grid-cols-2">
            {stills.map((f) => <AssetInput key={f.key} field={f} value={content.assets[f.key] ?? ''} onChange={(url) => content.setAsset(f.key, url)} />)}
          </div>
        </div>
      </div>
      {videos.length > 0 && (
        // Videolar landing'da emas, yo'nalish sahifasida — yig'ilgan turadi, kartani uzaytirmaydi.
        <details className="group -mx-6 -mb-6 overflow-hidden rounded-b-surface border-t border-border">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 px-6 py-4 text-base font-semibold text-text transition-colors hover:bg-surface-sunken [&::-webkit-details-marker]:hidden">
            <FilmSlate weight="fill" className="size-[18px] text-text-faint" />
            <span className="min-w-0 flex-1">{t('content:contentHome.coverVideos')}</span>
            <CaretDown weight="bold" className="size-3.5 text-text-faint transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 px-6 pb-6 pt-1 sm:grid-cols-2">
            {videos.map((f) => <AssetInput key={f.key} field={f} value={content.assets[f.key] ?? ''} onChange={(url) => content.setAsset(f.key, url)} />)}
          </div>
        </details>
      )}
    </Card>
  );
};

/** Alohida bo'limda boshqariladigan blok: saytdagi holati (nechta chiqadi), eskizlar, o'tish tugmasi va sarlavha maydoni. */
const LinkedCard: FC<{ block: BlockId; live: string | null; ok: boolean; to: string; action: string; thumbs?: ReactNode; children?: ReactNode }> = ({ block, live, ok, to, action, thumbs, children }) => {
  const b = BLOCKS.find((x) => x.id === block) ?? BLOCKS[0];
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {thumbs ?? <IconTile icon={b.icon} hue={b.hue} soft size="lg" />}
        <div className="min-w-0 flex-1">
          {live === null ? <span className="skeleton block h-5 w-48 rounded-item" /> : <Dot tone={ok ? 'ok' : 'attention'}>{live}</Dot>}
        </div>
        <Button variant="outline" to={to} className="max-sm:w-full">{action}<ArrowRight weight="bold" /></Button>
      </div>
      {children && <div className="flex flex-col gap-5 border-t border-border pt-5">{children}</div>}
    </Card>
  );
};

interface Counts { banners: string[]; news: string[]; brands: number }

/** Landing bloklari: sayt matnlari kartalari va alohida bo'limlarga (bannerlar, yangiliklar, brendlar) o'tish. */
const HomeBlocks: FC<{ content: SiteContent }> = ({ content }) => {
  const { t } = useTranslation('content');
  const [rawCounts, setCounts] = useState(null as Counts | null);
  const counts = rawCounts as Counts | null;

  useEffect(() => {
    // Holat qatori uchun — yuklanmasa bloklar baribir ishlaydi (sanoq o'rniga «yo'q» chiqmasin, skelet qoladi).
    Promise.all([listBanners(), listNews(), listBrands()])
      .then(([b, n, br]) => setCounts({
        banners: b.filter((x) => x.isActive).map((x) => x.imageUrl),
        news: n.filter((x) => x.isActive).slice(0, 3).map((x) => x.imageUrl),
        brands: br.filter((x) => x.logoUrl).length,
      }))
      .catch(() => {});
  }, []);

  const section = (id: SiteSection) => content.sections.find((s: ContentSection) => s.id === id);
  const titles = section('homeTitles');
  const titleField = (id: BlockId) => titles?.texts.find((f) => f.key === TITLE_OF[id]);
  const otherTitles = titles?.texts.filter((f) => !Object.values(TITLE_OF).includes(f.key)) ?? [];
  const status = (list: number, key: 'banners' | 'news' | 'brands') =>
    counts === null ? null : list > 0 ? t(`contentHome.blocks.${key}.live`, { n: list }) : t(`contentHome.blocks.${key}.none`);

  const body = (id: BlockId): ReactNode => {
    if (id === 'hero') {
      return HERO_SECTIONS.map((sid) => {
        const s = section(sid);
        return s ? <DirectionCard key={sid} content={content} section={s} /> : null;
      });
    }
    if (id === 'services' || id === 'consult') {
      const s = section(id);
      return s ? <SectionCard content={content} section={s} /> : null;
    }
    const field = titleField(id);
    const titleInput = field ? <SiteTextInput content={content} field={field} /> : undefined;
    if (id === 'banners') {
      const n = counts?.banners.length ?? 0;
      return (
        <LinkedCard
          block="banners" live={status(n, 'banners')} ok={n > 0} to="/admin/content/banners" action={t('contentHome.blocks.banners.action')}
          thumbs={n > 0 ? (
            <div className="flex shrink-0 gap-1.5">
              {counts?.banners.slice(0, 3).map((src) => <img key={src} src={src} alt="" className="h-11 w-24 rounded-item bg-surface-sunken object-cover" />)}
            </div>
          ) : undefined}
        />
      );
    }
    if (id === 'news') {
      const n = counts?.news.length ?? 0;
      return (
        <LinkedCard
          block="news" live={status(n, 'news')} ok={n > 0} to="/admin/content/news" action={t('contentHome.blocks.news.action')}
          thumbs={n > 0 ? (
            <div className="flex shrink-0 gap-1.5">
              {counts?.news.map((src) => <img key={src} src={src} alt="" className="size-11 rounded-item bg-surface-sunken object-contain p-1" />)}
            </div>
          ) : undefined}
        >
          {titleInput}
        </LinkedCard>
      );
    }
    const n = counts?.brands ?? 0;
    return (
      <LinkedCard block="brands" live={status(n, 'brands')} ok={n > 0} to="/admin/products/brands" action={t('contentHome.blocks.brands.action')}>
        {titleInput}
      </LinkedCard>
    );
  };

  return (
    <>
      <Card icon={SquaresFour} hue="violet" title={t('contentHome.mapTitle')} description={t('contentHome.mapDescription')}>
        <ol className="flex flex-wrap gap-2">
          {BLOCKS.map((b, i) => {
            const I = b.icon;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => document.getElementById(anchor(b.id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-surface-sunken pl-1.5 pr-3.5 text-base font-medium text-text transition-colors duration-150 hover:bg-surface-sunken-hover"
                >
                  <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold text-white ${HUE_DOT[b.hue]}`}>{i + 1}</span>
                  <I className="size-4 text-text-faint" />
                  {t(`contentHome.blocks.${b.id}.title`)}
                </button>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="mt-4">
        {BLOCKS.map((b, i) => (
          <Block
            key={b.id}
            id={b.id}
            n={i + 1}
            hue={b.hue}
            title={t(`contentHome.blocks.${b.id}.title`)}
            text={t(`contentHome.blocks.${b.id}.text`)}
            last={i === BLOCKS.length - 1}
          >
            {body(b.id)}
          </Block>
        ))}
      </div>

      {otherTitles.length > 0 && (
        <div className="stagger mt-4" style={delay(BLOCKS.length + 1)}>
          <Card icon={TextAa} hue="slate" title={t('contentHome.blocks.other.title')} description={t('contentHome.blocks.other.text')}>
            <div className="flex flex-col gap-5">
              {otherTitles.map((f) => <SiteTextInput key={f.key} content={content} field={f} />)}
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

/** Kontent → Bosh sahifa: landing matnlari va rasmlari saytdagi bloklar tartibida (spec §5). */
const ContentHome: FC = () => {
  const { t } = useTranslation('content');
  return (
    <ContentPage
      group="home"
      title={t('contentHome.title')}
      siteHref="/"
      description={t('contentHome.description')}
      top={<SectionTabs section="content" active="home" />}
      render={(content) => <HomeBlocks content={content} />}
    />
  );
};

export default ContentHome;
