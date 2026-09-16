import { useRef, useState } from 'react';
import type { FC } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadImage } from './api';
import { normalizeImage, type NormalizeOptions } from './lib/image-normalize';
import { moveItem } from './lib/reorder';

const ImageUploader: FC<{
  label: string;
  images: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  reorderable?: boolean;
  normalize?: NormalizeOptions;
  accept?: string;
}> = ({ label, images, onChange, multiple = false, reorderable = false, normalize, accept = 'image/png,image/jpeg,image/webp' }) => {
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  // handleFiles boshlanganda olingan `images` yopilmasidan (stale closure) —
  // parallel ikkinchi yuklash birinchisining natijasini yo'q qilmasin.
  const imagesRef = useRef(images);
  imagesRef.current = images;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    let files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    if (!multiple) files = files.slice(0, 1);
    setError('');
    setUploading((n) => n + files.length);
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const { imageUrl } = await uploadImage(await normalizeImage(file, normalize));
          return imageUrl;
        } catch {
          setError('Rasm yuklanmadi');
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
              className={`group relative size-16 overflow-hidden rounded-xs bg-fill-2 ${reorderable ? 'cursor-move' : ''}`}
            >
              <img src={img} alt="" className="size-full object-contain" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                aria-label="Rasmni o'chirish"
                className="press absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-danger text-bg opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className="size-16 animate-pulse rounded-xs bg-fill-2" />
          ))}
        </div>
      )}

      <label
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onZoneDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xs border-2 border-dashed px-4 py-5 ${dragOver ? 'border-cta bg-cta/5 text-cta' : 'border-line text-muted'}`}
      >
        <Upload size={20} />
        <span className="text-label">Rasm tashlang yoki tanlang</span>
        <input
          type="file"
          accept={accept}
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
