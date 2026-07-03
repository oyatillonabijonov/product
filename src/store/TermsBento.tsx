import type { FC, ReactNode } from 'react';
import { CalendarDays, ShieldCheck, UserRound, IdCard, Wallet, Lock } from 'lucide-react';
import type { LocalizedText } from '../../shared/types';
import { localeToTextKey, type Locale } from '../../app/lib/i18n';

type Tone = 'accent' | 'trust' | 'plain';

interface Cell {
  icon: FC<{ className?: string }>;
  eyebrow: LocalizedText;
  title: LocalizedText;
  desc: LocalizedText;
  span: string;
  tone: Tone;
}

const L = (uz: string, ru: string, en: string, uzCyrl: string): LocalizedText => ({ uz, ru, en, uzCyrl });

const CELLS: Cell[] = [
  {
    icon: CalendarDays,
    eyebrow: L('Muddat', 'Срок', 'Term', 'Муддат'),
    title: L('3 – 12 oy', '3 – 12 мес.', '3 – 12 mo.', '3 – 12 ой'),
    desc: L(
      "O'zingizga qulay to'lov muddatini tanlang — 3, 6, 9 yoki 12 oy.",
      'Выберите удобный срок оплаты — 3, 6, 9 или 12 месяцев.',
      'Choose a payment term that suits you — 3, 6, 9 or 12 months.',
      'Ўзингизга қулай тўлов муддатини танланг — 3, 6, 9 ёки 12 ой.',
    ),
    span: 'md:col-span-2 md:row-span-2',
    tone: 'accent',
  },
  {
    icon: ShieldCheck,
    eyebrow: L('Halol', 'Честно', 'Halal', 'Ҳалол'),
    title: L('Ribosiz, jarimasiz', 'Без рибы и штрафов', 'No riba, no penalties', 'Рибосиз, жаримасиз'),
    desc: L(
      "To'lov kechiksa ham penya yo'q — bu halol muddatli to'lov.",
      'Даже при задержке нет пени — это честная рассрочка.',
      'No penalty even for a late payment — this is halal installment.',
      'Тўлов кечикса ҳам пеня йўқ — бу ҳалол муддатли тўлов.',
    ),
    span: 'md:col-span-1 md:row-span-2',
    tone: 'trust',
  },
  {
    icon: UserRound,
    eyebrow: L('Yosh', 'Возраст', 'Age', 'Ёш'),
    title: L('21 yoshdan', 'От 21 года', '21 and over', '21 ёшдан'),
    desc: L(
      "Rasmiylashtirish uchun 21 yoshdan katta bo'lish kifoya.",
      'Для оформления достаточно быть старше 21 года.',
      'You just need to be over 21 to apply.',
      'Расмийлаштириш учун 21 ёшдан катта бўлиш кифоя.',
    ),
    span: 'md:col-span-1',
    tone: 'plain',
  },
  {
    icon: IdCard,
    eyebrow: L('Hujjat', 'Документ', 'Document', 'Ҳужжат'),
    title: L('Bitta hujjat', 'Один документ', 'One document', 'Битта ҳужжат'),
    desc: L(
      "Faqat passport yoki ID karta — kafil va ortiqcha qog'oz shart emas.",
      'Только паспорт или ID-карта — без поручителей и лишних бумаг.',
      'Just a passport or ID card — no guarantors or extra paperwork.',
      'Фақат паспорт ёки ID карта — кафил ва ортиқча қоғоз шарт эмас.',
    ),
    span: 'md:col-span-1',
    tone: 'plain',
  },
  {
    icon: Wallet,
    eyebrow: L("Boshlang'ich", 'Первый взнос', 'Down payment', 'Бошланғич'),
    title: L("Boshlang'ich to'lov", 'Первоначальный взнос', 'Down payment', 'Бошланғич тўлов'),
    desc: L(
      "Boshlang'ich to'lov miqdori tanlagan model narxiga qarab belgilanadi.",
      'Размер первого взноса зависит от цены выбранной модели.',
      'The down payment depends on the price of the model you choose.',
      'Бошланғич тўлов миқдори танланган модел нархига қараб белгиланади.',
    ),
    span: 'md:col-span-1',
    tone: 'plain',
  },
  {
    icon: Lock,
    eyebrow: L('Kafolat', 'Гарантия', 'Guarantee', 'Кафолат'),
    title: L('Kafolat va himoya', 'Гарантия и защита', 'Safe & secure', 'Кафолат ва ҳимоя'),
    desc: L(
      "Qarz uzilgunicha korobka do'konda saqlanadi va qurilmaga iCloud himoyasi qo'yiladi.",
      'До погашения коробка хранится в магазине, а на устройство ставится защита iCloud.',
      'Until the debt is paid, the box is kept in store and iCloud protection is set on the device.',
      'Қарз узилгунича коробка дўконда сақланади ва қурилмага iCloud ҳимояси қўйилади.',
    ),
    span: 'md:col-span-3',
    tone: 'plain',
  },
];

const TONE: Record<Tone, { card: string; eyebrow: string; title: string; desc: string; icon: string }> = {
  accent: {
    card: 'bg-gradient-to-br from-accent to-accent-hover text-white border-transparent shadow-[--shadow-apple]',
    eyebrow: 'text-white/70',
    title: 'text-white',
    desc: 'text-white/85',
    icon: 'bg-white/15 text-white',
  },
  trust: {
    card: 'bg-trust-soft border-transparent',
    eyebrow: 'text-trust',
    title: 'text-primary',
    desc: 'text-body',
    icon: 'bg-trust/12 text-trust',
  },
  plain: {
    card: 'bg-white border-line/60 hover:border-line-2 transition-colors',
    eyebrow: 'text-muted-2',
    title: 'text-primary',
    desc: 'text-muted',
    icon: 'bg-bg text-accent',
  },
};

const Card: FC<{ cell: Cell; textKey: keyof LocalizedText }> = ({ cell, textKey }) => {
  const tone = TONE[cell.tone];
  const Icon = cell.icon;
  const big = cell.span.includes('row-span-2');
  return (
    <div className={`rounded-[24px] border p-6 md:p-7 flex flex-col ${cell.span} ${tone.card}`}>
      <span className={`inline-flex w-11 h-11 rounded-2xl items-center justify-center ${tone.icon}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="mt-auto pt-6">
        <p className={`text-[12px] font-semibold uppercase tracking-[0.08em] mb-1.5 ${tone.eyebrow}`}>
          {cell.eyebrow[textKey]}
        </p>
        <h3 className={`font-semibold tracking-[-0.02em] ${tone.title} ${big ? 'text-[28px] md:text-[36px]' : 'text-[19px] md:text-[21px]'}`}>
          {cell.title[textKey]}
        </h3>
        <p className={`mt-2 leading-relaxed ${tone.desc} ${big ? 'text-[15px] md:text-[16px]' : 'text-[14px]'}`}>
          {cell.desc[textKey]}
        </p>
      </div>
    </div>
  );
};

const TermsBento: FC<{ locale: Locale; heading: string; lead?: ReactNode }> = ({ locale, heading, lead }) => {
  const textKey = localeToTextKey(locale);
  return (
    <section className="max-w-[1100px] mx-auto px-4 py-10 md:py-16">
      <div className="max-w-[640px] mb-8 md:mb-12">
        <h1 className="text-[34px] md:text-[46px] font-semibold text-primary tracking-[-0.03em]">{heading}</h1>
        {lead && <p className="mt-4 text-[16px] md:text-[18px] text-muted leading-relaxed">{lead}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 md:auto-rows-[minmax(150px,auto)]">
        {CELLS.map((cell, i) => (
          <Card key={i} cell={cell} textKey={textKey} />
        ))}
      </div>
    </section>
  );
};

export default TermsBento;
