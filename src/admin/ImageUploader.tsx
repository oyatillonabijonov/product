import { useRef, useState } from 'react';
import type { FC } from 'react';
import { UploadSimple, X } from '@phosphor-icons/react';
import { uploadImage } from './api';
import { normalizeImage } from './lib/image-normalize';
import { moveItem } from './lib/reorder';

const ImageUploader: FC<{
  label: string;
  images: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  reorderable?: boolean;
}> = ({ label, images, onChange, multiple = false, reorderable = false }) => {
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
          const { imageUrl } = await uploadImage(await normalizeImage(file));
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
      <div className="text-[13px] text-muted mb-2">{label}</div>

      {(images.length > 0 || uploading > 0) && (
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {images.map((img, i) => (
            <div
              key={img + i}
              draggable={reorderable}
              onDragStart={(e: React.DragEvent) => e.dataTransfer.setData('text/plain', String(i))}
              onDragOver={(e: React.DragEvent) => { if (reorderable) e.preventDefault(); }}
              onDrop={(e: React.DragEvent) => { if (reorderable) onTileDrop(e, i); }}
              className={`relative w-16 h-16 rounded-xl overflow-hidden bg-bg group ${reorderable ? 'cursor-move' : ''}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                aria-label="Rasmni o'chirish"
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} weight="bold" />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className="w-16 h-16 rounded-xl bg-bg animate-pulse" />
          ))}
        </div>
      )}

      <label
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onZoneDrop}
        className={`flex flex-col items-center justify-center gap-1 py-5 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${dragOver ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'}`}
      >
        <UploadSimple size={20} />
        <span className="text-[13px]">Rasm tashlang yoki tanlang</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple={multiple}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { handleFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
      </label>

      {error ? <div className="text-[12px] text-danger mt-1">{error}</div> : null}
    </div>
  );
};

export default ImageUploader;
