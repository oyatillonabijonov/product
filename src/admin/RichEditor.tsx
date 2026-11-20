import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { Check, ImageSquare, LinkSimple, ListBullets, ListNumbers, TextB, TextHThree, TextHTwo, X } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { uploadImage } from './api';
import { errText } from './errText';
import { PHOTO_UPLOAD } from './lib/content-form';
import { normalizeImage } from './lib/image-normalize';
import { mdToHtml, richToMd, type RichNode } from './lib/rich-md';
import { useToast } from './ui/toast';

type Active = { bold: boolean; block: string; ul: boolean; ol: boolean; link: boolean };
const NONE: Active = { bold: false, block: 'p', ul: false, ol: false, link: false };

/** Havola manzili: sxemasi yo'q bo'lsa `https://` qo'shiladi (sayt faqat xavfsiz sxemalarni chizadi). */
const normalizeUrl = (raw: string) => {
  const u = raw.trim();
  if (!u) return '';
  return /^(https?:|mailto:|tel:|\/(?!\/))/i.test(u) ? u : `https://${u}`;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Vizual maqola muharriri (Medium uslubi): yozilgan narsa shu zahoti sarlavha, qalin, havola, ro'yxat va rasm bo'lib
 * ko'rinadi; saqlanadigani — markdown (`lib/rich-md.ts`). `resetKey` almashganda (til, yuklash) matn qaytadan o'rnatiladi —
 * har yozuvda emas, aks holda kursor sakraydi. Paste — faqat matn (begona uslub kirmaydi) yoki rasm fayli.
 */
const RichEditor: FC<{ value: string; onChange: (md: string) => void; resetKey: string; placeholder: string; stickyTop?: string }> = ({
  value, onChange, resetKey, placeholder, stickyTop = 'top-0',
}) => {
  const { t } = useTranslation('content');
  const toast = useToast();
  const ref = useRef(null as HTMLDivElement | null);
  const saved = useRef(null as Range | null);
  const [rawActive, setActive] = useState(NONE);
  const active = rawActive as Active;
  const [empty, setEmpty] = useState(!value.trim());
  const [linkOpen, setLinkOpen] = useState(false);
  const [rawUrl, setUrl] = useState('');
  const url = rawUrl as string;
  const [uploading, setUploading] = useState(0);
  const urlInput = useRef(null as HTMLInputElement | null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = mdToHtml(value);
    setEmpty(!value.trim());
  }, [resetKey]);

  // Kursor turgan joyning uslubi — tugmalar faol holatda ko'rinadi.
  useEffect(() => {
    const onSel = () => {
      const el = ref.current;
      const sel = document.getSelection();
      if (!el || !sel || !sel.anchorNode || !el.contains(sel.anchorNode)) return;
      let node: Node | null = sel.anchorNode;
      let inLink = false;
      while (node && node !== el) { if (node.nodeName === 'A') inLink = true; node = node.parentNode; }
      setActive({
        bold: document.queryCommandState('bold'),
        block: String(document.queryCommandValue('formatBlock') || 'p').toLowerCase().replace(/[<>]/g, ''),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        link: inLink,
      });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  function emit() {
    const el = ref.current;
    if (!el) return;
    const md = richToMd(el as unknown as RichNode);
    setEmpty(md === '' && !el.querySelector('img'));
    onChange(md);
  }

  function saveRange() {
    const sel = document.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) saved.current = sel.getRangeAt(0).cloneRange();
  }

  function restoreRange() {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = document.getSelection();
    if (saved.current && sel) { sel.removeAllRanges(); sel.addRange(saved.current); }
  }

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  }

  function block(tag: 'h2' | 'h3') {
    // Ro'yxat bandi sarlavha bo'lsa brauzer butun ro'yxatni <h2> ichiga o'raydi — avval ro'yxatdan chiqariladi.
    if (active.ul) exec('insertUnorderedList');
    if (active.ol) exec('insertOrderedList');
    exec('formatBlock', active.block === tag ? '<p>' : `<${tag}>`);
  }

  function openLink() {
    saveRange();
    setUrl('');
    setLinkOpen(true);
    requestAnimationFrame(() => urlInput.current?.focus());
  }

  function applyLink() {
    const href = normalizeUrl(url);
    setLinkOpen(false);
    restoreRange();
    if (!href) return;
    const sel = document.getSelection();
    if (sel && sel.isCollapsed) exec('insertHTML', `<a href="${esc(href)}">${esc(url.trim())}</a>`);
    else exec('createLink', href);
  }

  async function insertImages(files: File[]) {
    for (const file of files.filter((f) => f.type.startsWith('image/'))) {
      setUploading((n: number) => n + 1);
      try {
        const { imageUrl } = await uploadImage(await normalizeImage(file, PHOTO_UPLOAD));
        restoreRange();
        exec('insertHTML', `<p><img src="${esc(imageUrl)}" alt=""></p><p><br></p>`);
        saveRange();
      } catch (e) {
        toast(errText(e), 'error');
      } finally {
        setUploading((n: number) => n - 1);
      }
    }
  }

  function pickImage() {
    saveRange();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.multiple = true;
    input.onchange = () => insertImages(Array.from(input.files ?? []) as File[]);
    input.click();
  }

  function onPaste(e: { clipboardData: DataTransfer; preventDefault: () => void }) {
    e.preventDefault();
    const files = Array.from(e.clipboardData.files) as File[];
    if (files.length) { saveRange(); insertImages(files); return; }
    const text = e.clipboardData.getData('text/plain');
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) exec('insertText', text);
    else exec('insertHTML', lines.map((l) => `<p>${esc(l)}</p>`).join(''));
  }

  function onDrop(e: { dataTransfer: DataTransfer; clientX: number; clientY: number; preventDefault: () => void }) {
    const files = Array.from(e.dataTransfer.files) as File[];
    if (!files.length) return;
    e.preventDefault();
    const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
    const r = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (r) saved.current = r;
    insertImages(files);
  }

  function onKeyDown(e: { key: string; metaKey: boolean; ctrlKey: boolean; preventDefault: () => void }) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openLink(); }
  }

  const tools: { icon: PhIcon; label: string; on: boolean; run: () => void; text?: boolean }[] = [
    { icon: TextHTwo, label: t('postEdit.tools.h2'), on: active.block === 'h2', run: () => block('h2'), text: true },
    { icon: TextHThree, label: t('postEdit.tools.h3'), on: active.block === 'h3', run: () => block('h3') },
    { icon: TextB, label: t('postEdit.tools.bold'), on: active.bold, run: () => exec('bold') },
    { icon: LinkSimple, label: t('postEdit.tools.link'), on: active.link, run: openLink },
    { icon: ListBullets, label: t('postEdit.tools.ul'), on: active.ul, run: () => exec('insertUnorderedList') },
    { icon: ListNumbers, label: t('postEdit.tools.ol'), on: active.ol, run: () => exec('insertOrderedList') },
  ];
  const btn = 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors duration-150';
  const keep = (e: { preventDefault: () => void }) => e.preventDefault(); // tugma bosilganda tanlov yo'qolmasin

  return (
    <div className="flex flex-col">
      <div role="toolbar" aria-label={t('postEdit.tools.label')} className={`sticky ${stickyTop} z-10 flex min-h-10 items-center gap-0.5 rounded-full bg-bg-subtle p-1`}>
        {linkOpen ? (
          <form className="flex min-w-0 flex-1 items-center gap-1" onSubmit={(e: { preventDefault: () => void }) => { e.preventDefault(); applyLink(); }}>
            <LinkSimple weight="bold" className="ml-2.5 size-4 shrink-0 text-text-muted" />
            <input
              ref={urlInput}
              value={url}
              onChange={(e: { target: HTMLInputElement }) => setUrl(e.target.value)}
              onKeyDown={(e: { key: string }) => { if (e.key === 'Escape') { setLinkOpen(false); restoreRange(); } }}
              placeholder={t('postEdit.tools.linkPlaceholder')}
              className="h-8 min-w-0 flex-1 bg-transparent px-2 text-base text-text outline-none placeholder:text-text-faint"
            />
            <button type="submit" className={`${btn} bg-primary text-text-on-primary`}><Check weight="bold" className="size-4" />{t('postEdit.tools.linkApply')}</button>
            <button type="button" aria-label={t('postEdit.tools.linkCancel')} onClick={() => { setLinkOpen(false); restoreRange(); }} className={`${btn} text-text-muted hover:bg-surface`}><X weight="bold" className="size-4" /></button>
          </form>
        ) : (
          <>
            {tools.map((tool) => (
              <button
                key={tool.label}
                type="button"
                title={tool.label}
                aria-label={tool.label}
                aria-pressed={tool.on}
                onMouseDown={keep}
                onClick={tool.run}
                className={`${btn} ${tool.on ? 'bg-surface text-text' : 'text-text-muted hover:bg-surface hover:text-text'}`}
              >
                <tool.icon weight="bold" className="size-4" />
                {tool.text && <span className="max-sm:hidden">{tool.label}</span>}
              </button>
            ))}
            <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border-strong" />
            <button type="button" onMouseDown={keep} onClick={pickImage} className={`${btn} text-text-muted hover:bg-surface hover:text-text`}>
              <ImageSquare weight="bold" className="size-4" /><span className="max-sm:hidden">{t('postEdit.tools.image')}</span>
            </button>
            {uploading > 0 && <span className="ml-auto truncate pr-3 text-sm text-text-muted">{t('postEdit.tools.uploading')}</span>}
          </>
        )}
      </div>

      <div className="relative mt-6">
        {empty && <p aria-hidden className="pointer-events-none absolute inset-x-0 top-0 text-[17px] leading-[1.75] text-text-faint">{placeholder}</p>}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          onInput={emit}
          onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
          onBlur={saveRange}
          onPaste={onPaste}
          onDrop={onDrop}
          onKeyDown={onKeyDown}
          className="min-h-[50vh] text-[17px] leading-[1.75] text-text outline-none
            [&_a]:text-accent-text [&_a]:underline [&_a]:decoration-accent/40 [&_a]:underline-offset-2
            [&_h2]:mb-2 [&_h2]:mt-9 [&_h2]:text-[26px] [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:tracking-tight [&>*:first-child]:mt-0
            [&_h3]:mb-1 [&_h3]:mt-7 [&_h3]:text-[20px] [&_h3]:font-semibold [&_h3]:leading-snug
            [&_img]:my-2 [&_img]:w-full [&_img]:rounded-2xl
            [&_li]:my-1.5 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6
            [&_p]:my-4 [&_strong]:font-semibold"
        />
      </div>
    </div>
  );
};

export default RichEditor;
