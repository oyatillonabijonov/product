import { useRef, useState } from 'react';
import type { FC } from 'react';
import { DotsSixVertical, Trash, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { uploadImage } from './api';
import { acceptLabel, acceptsType } from './lib/content-form';
import { normalizeImage, type NormalizeOptions } from './lib/image-normalize';
import { moveItem } from './lib/reorder';
import { Badge, IconTile } from './ui';

/** Server chegaralari (`api.admin.upload`) — katta faylni yuklashdan oldin aytamiz. */
const VIDEO_MAX = 40 * 1024 * 1024;
const IMAGE_MAX_MB = 5;
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';

/**
 * Rasm/video yuklagich. Rasm client'da `normalizeImage` bilan WebP'ga keltiriladi (`normalize={false}` —
 * o'zgarishsiz, favicon uchun); `kind="video"` — MP4 o'zgarishsiz, oldindan ko'rish `<video>` bilan.
 * `fallback` — hech narsa yuklanmaganda turadigan standart fayl (sayt kodidagi). `firstLabel` — birinchi
 * kartochkadagi belgi (mahsulotda «Asosiy»: tartib sudrab o'zgartiriladi, birinchisi asosiy rasm bo'ladi).
 * Ko'rinishi: kartochkalar to'ri — har biri kulrang karta ichida oq orolcha (hover'da o'chirish va sudrash
 * tutqichi), ostida drop-zona (hoshiyasiz, to'qroq fon) — bo'sh holatda katta, fayl bor bo'lsa ixcham qator.
 */
const ImageUploader: FC<{
  label: string;
  images: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  reorderable?: boolean;
  normalize?: NormalizeOptions | false;
  accept?: string;
  kind?: 'image' | 'video';
  fallback?: string;
  firstLabel?: string;
}> = ({ label, images, onChange, multiple = false, reorderable = false, normalize, accept, kind = 'image', fallback, firstLabel }) => {
  const { t } = useTranslation(['common', 'products']);
  const video = kind === 'video';
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [rawDragFrom, setDragFrom] = useState(null as number | null);
  const dragFrom = rawDragFrom as number | null;
  const [error, setError] = useState('');
  // handleFiles boshlanganda olingan `images` yopilmasidan (stale closure) —
  // parallel ikkinchi yuklash birinchisining natijasini yo'q qilmasin.
  const imagesRef = useRef(images);
  imagesRef.current = images;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    // `accept` berilgan bo'lsa (favicon — faqat PNG) sudrab tashlangan boshqa tur ham o'tmasin.
    let files = Array.from(fileList).filter((f) => f.type.startsWith(video ? 'video/' : 'image/') && acceptsType(accept, f.type));
    if (!files.length) {
      // Jim qolmaydi: tanlangan fayl bor, lekin turi to'g'ri kelmadi.
      if (fileList.length > 0) {
        setError(video ? t('upload.onlyVideo') : accept ? t('upload.onlyType', { types: acceptLabel(accept) }) : t('upload.onlyImage'));
      }
      return;
    }
    if (!multiple) files = files.slice(0, 1);
    if (video && files.some((f) => f.size > VIDEO_MAX)) {
      setError(t('upload.videoTooLarge', { size: VIDEO_MAX / (1024 * 1024) }));
      return;
    }
    setError('');
    setUploading((n) => n + files.length);
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const body = video || normalize === false ? file : await normalizeImage(file, normalize);
          const { imageUrl } = await uploadImage(body);
          return imageUrl;
        } catch {
          setError(video ? t('upload.videoFailed') : t('upload.imageFailed'));
          return null;
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
    const urls = results.filter((u): u is string => u !== null);
    if (urls.length) onChange(multiple ? [...imagesRef.current, ...urls] : [urls[0]]);
  }

  function onZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function onTileDrop(e: React.DragEvent, to: number) {
    const raw = e.dataTransfer.getData('text/plain');
    setDragFrom(null);
    if (raw === '') return; // OS-fayl drop'i, tartiblash emas — e'tiborsiz
    e.preventDefault();
    onChange(moveItem(images, Number(raw), to));
  }

  const tile = video ? 'aspect-video' : 'aspect-square';
  const preview = (src: string) => (video
    ? <video src={src} muted playsInline controls preload="metadata" className="size-full object-cover" />
    : <img src={src} alt="" className="size-full object-contain p-1.5" />);
  const hasContent = images.length > 0 || uploading > 0;
  const req = video
    ? t('products:uploader.req', { types: 'MP4', size: VIDEO_MAX / (1024 * 1024) })
    : t('products:uploader.req', { types: acceptLabel(accept ?? IMAGE_ACCEPT), size: IMAGE_MAX_MB });
  // Tutqich va o'chirish tugmasi — rasm ustida to'q doira (soyasiz, oq rasm ustida ham ko'rinadi);
  // sichqonchada hover'da, sensorli ekranda doim ko'rinadi.
  const floatBtn = 'grid size-7 place-items-center rounded-full bg-inverted/75 text-text-on-inverted backdrop-blur-sm transition-[opacity,color,background-color] duration-150';
  const reveal = 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100';

  return (
    <div>
      {label && <div className="mb-2 text-sm font-semibold text-text">{label}</div>}

      {hasContent && (
        <div className={`mb-3 grid gap-3 ${video ? 'grid-cols-[repeat(auto-fill,minmax(160px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(112px,1fr))]'}`}>
          {images.map((img, i) => (
            <div
              key={img + i}
              draggable={reorderable}
              onDragStart={(e: React.DragEvent) => { e.dataTransfer.setData('text/plain', String(i)); setDragFrom(i); }}
              onDragEnd={() => setDragFrom(null)}
              onDragOver={(e: React.DragEvent) => { if (reorderable) e.preventDefault(); }}
              onDrop={(e: React.DragEvent) => { if (reorderable) onTileDrop(e, i); }}
              className={`group relative ${tile} animate-fade-in overflow-hidden rounded-control-lg bg-surface-sunken transition-opacity duration-200 ${
                reorderable ? 'cursor-grab active:cursor-grabbing' : ''
              } ${dragFrom === i ? 'opacity-40' : ''}`}
            >
              {preview(img)}
              {reorderable && images.length > 1 && (
                <span aria-hidden title={t('products:uploader.reorder')} className={`absolute left-1.5 top-1.5 ${floatBtn} ${reveal}`}>
                  <DotsSixVertical weight="bold" className="size-4" />
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                aria-label={video ? t('upload.removeVideo') : t('upload.removeImage')}
                title={video ? t('upload.removeVideo') : t('upload.removeImage')}
                className={`absolute right-1.5 top-1.5 hover:bg-danger hover:text-white ${floatBtn} ${reveal}`}
              >
                <Trash className="size-4" />
              </button>
              {i === 0 && firstLabel && <Badge tone="accent" className="absolute bottom-1.5 left-1.5 h-5 px-2 text-xs">{firstLabel}</Badge>}
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} aria-busy="true" aria-label={t('loading')} className={`${tile} skeleton grid place-items-center rounded-control-lg`}>
              <span className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
            </div>
          ))}
        </div>
      )}

      {!hasContent && fallback && (
        <div className="mb-3 flex items-center gap-3">
          <div className={`${video ? 'w-40' : 'w-28'} ${tile} overflow-hidden rounded-control-lg bg-surface-sunken`}>{preview(fallback)}</div>
          <Badge>{t('default')}</Badge>
        </div>
      )}

      <label
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onZoneDrop}
        className={`group/zone flex cursor-pointer rounded-control-lg transition-colors duration-150 ${
          hasContent ? 'items-center gap-3 px-3 py-2.5' : 'flex-col items-center justify-center gap-2 px-4 py-8 text-center'
        } ${dragOver ? 'bg-accent-soft text-accent-text' : 'bg-surface-sunken hover:bg-surface-sunken-hover'}`}
      >
        <IconTile icon={UploadSimple} hue="violet" soft size={hasContent ? 'md' : 'lg'} className="transition-transform duration-200 group-hover/zone:-translate-y-0.5" />
        <span className={`flex min-w-0 flex-col ${hasContent ? '' : 'items-center gap-0.5'}`}>
          <span className={`text-base font-semibold ${dragOver ? 'text-accent-text' : 'text-text'}`}>{video ? t('upload.dropVideo') : t('upload.dropImage')}</span>
          <span className="text-sm text-text-muted">{req}</span>
        </span>
        <input
          type="file"
          accept={accept ?? (video ? 'video/mp4' : IMAGE_ACCEPT)}
          multiple={multiple}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { handleFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
      </label>

      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-danger-text">
          <WarningCircle weight="fill" className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

export default ImageUploader;
