import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, MagnifyingGlass } from './icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { InboxIcon, Package01Icon, UserMultiple02Icon } from '@hugeicons/core-free-icons';
import { useTranslation } from 'react-i18next';
import { adminPath } from './lib/admin-path';
import { SECTIONS } from './nav';

interface Item { id: string; label: string; hint?: string; icon: IconSvgElement; to: string }

/**
 * Tezkor qidiruv (⌘K / Ctrl+K / «/»): bo'lim va tablar nomi bo'yicha o'tish, yozilgan matnni mahsulot,
 * buyurtma yoki mijozlar ro'yxatida qidirish. ↑↓ tanlaydi, Enter ochadi, Esc yopadi.
 */
const CommandPalette: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useTranslation('shell');
  const navigate = useNavigate();
  const [rawQ, setQ] = useState('');
  const q = rawQ as string;
  const [rawActive, setActive] = useState(0);
  const active = rawActive as number;
  const input = useRef(null) as { current: HTMLInputElement | null };

  const pages = useMemo(() => SECTIONS.flatMap((s): Item[] => (s.tabs.length > 1
    ? s.tabs.map((tab): Item => ({ id: `${s.id}:${tab.id}`, label: t(tab.labelKey), hint: t(s.labelKey), icon: tab.Icon, to: adminPath(s.id, tab.segment) }))
    : [{ id: s.id, label: t(s.labelKey), icon: s.Icon, to: adminPath(s.id) }])), [t]);

  const items = useMemo(() => {
    const term = q.trim().toLocaleLowerCase();
    const found = term ? pages.filter((p) => `${p.label} ${p.hint ?? ''}`.toLocaleLowerCase().includes(term)) : pages;
    const enc = encodeURIComponent(q.trim());
    const actions: Item[] = term ? [
      { id: 'q:products', label: t('search.inProducts', { q: q.trim() }), icon: Package01Icon, to: `${adminPath('products')}?q=${enc}` },
      { id: 'q:orders', label: t('search.inOrders', { q: q.trim() }), icon: InboxIcon, to: `${adminPath('orders')}?q=${enc}` },
      { id: 'q:customers', label: t('search.inCustomers', { q: q.trim() }), icon: UserMultiple02Icon, to: `${adminPath('orders', 'customers')}?q=${enc}` },
    ] : [];
    return { found, actions, all: [...found, ...actions] };
  }, [q, pages, t]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    const id = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);
  useEffect(() => { setActive(0); }, [q]);

  const go = (it: Item | undefined) => {
    if (!it) return;
    onClose();
    navigate(it.to);
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(items.all.length - 1, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(items.all[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  const row = (it: Item, idx: number) => {
    const on = idx === active;
    return (
      <li key={it.id}>
        <button
          type="button"
          onMouseMove={() => setActive(idx)}
          onClick={() => go(it)}
          className={`flex h-11 w-full items-center gap-3 rounded-full px-4 text-left text-base transition-colors duration-100 ${on ? 'bg-surface-sunken text-text' : 'text-text-muted'}`}
        >
          <HugeiconsIcon icon={it.icon} size={18} strokeWidth={1.5} className={`shrink-0 ${on ? 'text-text' : 'text-text-faint'}`} />
          <span className="min-w-0 flex-1 truncate font-medium text-text">{it.label}</span>
          {it.hint && <span className="shrink-0 text-sm text-text-faint">{it.hint}</span>}
          {on && <ArrowRight weight="bold" className="size-3.5 shrink-0 text-text-faint" />}
        </button>
      </li>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-overlay backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('search.open')}
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            className="relative w-full max-w-xl overflow-hidden rounded-overlay bg-surface-raised"
          >
            <label className="flex items-center gap-3 border-b border-border px-4">
              <MagnifyingGlass className="size-5 shrink-0 text-text-faint" />
              <input
                ref={input}
                value={q}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder={t('search.inputLabel')}
                aria-label={t('search.inputLabel')}
                className="h-14 min-w-0 flex-1 bg-transparent text-md text-text outline-none placeholder:text-text-faint"
              />
              <kbd className="hidden rounded-[6px] bg-surface-sunken px-1.5 py-0.5 font-sans text-xs text-text-muted sm:block">Esc</kbd>
            </label>
            <div className="thin-scroll max-h-[min(60vh,440px)] overflow-y-auto p-2">
              {items.all.length === 0 && <p className="px-3 py-10 text-center text-base text-text-muted">{t('search.empty')}</p>}
              {items.found.length > 0 && (
                <>
                  <p className="px-3 pb-1 pt-2 text-xs font-medium text-text-faint">{t('search.pages')}</p>
                  <ul className="flex flex-col gap-0.5">{items.found.map((it, i) => row(it, i))}</ul>
                </>
              )}
              {items.actions.length > 0 && (
                <>
                  <p className="px-3 pb-1 pt-3 text-xs font-medium text-text-faint">{t('search.actions')}</p>
                  <ul className="flex flex-col gap-0.5">{items.actions.map((it, i) => row(it, items.found.length + i))}</ul>
                </>
              )}
            </div>
            <p className="hidden border-t border-border px-4 py-2.5 text-xs text-text-faint sm:block">{t('search.hint')}</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
