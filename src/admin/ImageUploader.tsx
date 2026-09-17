import { useRef, useState } from 'react';
import type { FC } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadImage } from './api';
import { normalizeImage, type NormalizeOptions } from './lib/image-normalize';
import { moveItem } from './lib/reorder';

/** Server chegarasi (`api.admin.upload`) — katta videoni yuklashdan oldin aytamiz. */
const VIDEO_MAX = 40 * 1024 * 1024;

/**
 * Rasm/video yuklagich. Rasm client'da `normalizeImage` bilan WebP'ga keltiriladi (`normalize={false}` —
 * o'zgarishsiz, favicon uchun); `kind="video"` — MP4 o'zgarishsiz, oldindan ko'rish `<video>` bilan.
 * `fallback` — hech narsa yuklanmaganda turadigan standart fayl (sayt kodidagi).
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
}> = ({ label, images, onChange, multiple = false, reorderable = false, normalize, accept, kind = 'image', fallback }) => {
  const video = kind === 'video';
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  // handleFiles boshlanganda olingan `images` yopilmasidan (stale closure) —
  // parallel ikkinchi yuklash birinchisining natijasini yo'q qilmasin.
  const imagesRef = useRef(images);
  imagesRef.current = images;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    let files = Array.from(fileList).filter((f) => f.type.startsWith(video ? 'video/' : 'image/'));
    if (!files.length) return;
    if (!multiple) files = files.slice(0, 1);
    if (video && files.some((f) => f.size > VIDEO_MAX)) {
      setError('Video 40 MB dan katta — kichikroq fayl tanlang');
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
          setError(video ? 'Video yuklanmadi' : 'Rasm yuklanmadi');
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
    if (raw === '') return; // OS-fayl drop'i, tartiblash emas — e'tiborsiz
    e.preventDefault();
    onChange(moveItem(images, Number(raw), to));
  }

  const tile = video ? 'h-24 w-40' : 'size-16';
  const preview = (src: string) => (video
    ? <video src={src} muted playsInline controls preload="metadata" className="size-full object-cover" />
    : <img src={src} alt="" className="size-full object-contain" />);

  return (
    <div>
      <div className="mb-2 text-label font-medium text-muted">{label}</div>

      {(images.length > 0 || uploading > 0) && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {images.map((img, i) => (
            <div
              key={img + i}
              draggable={reorderable}
              onDragStart={(e: React.DragEvent) => e.dataTransfer.setData('text/plain', String(i))}
              onDragOver={(e: React.DragEvent) => { if (reorderable) e.preventDefault(); }}
              onDrop={(e: React.DragEvent) => { if (reorderable) onTileDrop(e, i); }}
              className={`group relative ${tile} overflow-hidden rounded-xs bg-fill-2 ${reorderable ? 'cursor-move' : ''}`}
            >
              {preview(img)}
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                aria-label={video ? "Videoni o'chirish" : "Rasmni o'chirish"}
                className="press absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-danger text-bg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className={`${tile} animate-pulse rounded-xs bg-fill-2`} />
          ))}
        </div>
      )}

      {images.length === 0 && uploading === 0 && fallback && (
        <div className="mb-2 flex items-center gap-3">
          <div className={`${tile} overflow-hidden rounded-xs bg-fill-2`}>{preview(fallback)}</div>
          <span className="text-label text-muted-2">Standart</span>
        </div>
      )}

      <label
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onZoneDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xs border-2 border-dashed px-4 py-5 ${dragOver ? 'border-cta bg-cta/5 text-cta' : 'border-line text-muted'}`}
      >
        <Upload size={20} />
        <span className="text-label">{video ? 'Video (MP4) tashlang yoki tanlang' : 'Rasm tashlang yoki tanlang'}</span>
        <input
          type="file"
          accept={accept ?? (video ? 'video/mp4' : 'image/png,image/jpeg,image/webp')}
          multiple={multiple}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { handleFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
      </label>

      {error ? <p className="mt-1 text-label text-danger">{error}</p> : null}
    </div>
  );
};

export default ImageUploader;
