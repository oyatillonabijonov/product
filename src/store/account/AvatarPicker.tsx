import { useState } from 'react';
import type { FC } from 'react';
import { BotAvatar } from 'bot-avatars';
import { X } from 'lucide-react';
import Modal from '../Modal';
import { BTN_MD } from '../ui';
import type { Translation } from '../../locales';
import { AVATAR_TYPES } from '../../../shared/avatar';
import type { Avatar, AvatarFace } from '../../../shared/avatar';

/**
 * Avatar tanlash oynasi — 18 ta shakl va yuz almashtirgichi.
 *
 * Qoralama holat shu yerda: `onPick` faqat "Tanlash" bosilganda chaqiriladi,
 * X/Escape esa o'zgarishsiz yopadi — modal uchun odatiy shartnoma. Yozish
 * profil formasining o'z "Saqlash" tugmasi orqali, ya'ni saqlash yo'li bitta.
 *
 * `seed` har katakka boshqa qiymat beradi, aks holda 18 ta bot bir vaqtda
 * ko'z qisib, qator "chaqnab" turardi (kutubxona hujjatidagi maslahat).
 */
const AvatarPicker: FC<{
  t: Translation;
  open: boolean;
  value: Avatar;
  onPick: (a: Avatar) => void;
  onClose: () => void;
}> = ({ t, open, value, onPick, onClose }) => {
  const [rawDraft, setDraft] = useState(value);
  const draft = rawDraft as Avatar;

  // Oyna har ochilganda joriy qiymatdan boshlansin (yopilganda holat tashlanmaydi).
  const [rawWasOpen, setWasOpen] = useState(false);
  const wasOpen = rawWasOpen as boolean;
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }

  const faces: { key: AvatarFace; label: string }[] = [
    { key: 'eyes', label: t.profileAvatarEyes },
    { key: 'mouth', label: t.profileAvatarMouth },
  ];

  return (
    <Modal open={open} label={t.profileAvatarTitle} onClose={onClose} panelClass="max-w-lg">
      <div className="p-6">
        <button type="button" onClick={onClose} aria-label={t.orderClose} className="press absolute top-4 right-4 text-muted-2 hover:text-primary">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lede font-semibold text-primary">{t.profileAvatarTitle}</h2>

        {/* Yuz almashtirgichi — segment; chegara doim `border`, tanlanganda rangi o'zgaradi (layout siljimaydi). */}
        <div role="radiogroup" aria-label={t.profileAvatar} className="mt-4 inline-flex rounded-full bg-segment p-1">
          {faces.map((f) => (
            <button
              key={f.key}
              type="button"
              role="radio"
              aria-checked={draft.face === f.key}
              onClick={() => setDraft({ ...draft, face: f.key })}
              className={`press h-9 rounded-full px-4 text-label font-medium ${
                draft.face === f.key ? 'bg-surface text-primary' : 'text-muted hover:text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <ul className="mt-5 grid grid-cols-4 sm:grid-cols-6 gap-2">
          {AVATAR_TYPES.map((type, i) => {
            const selected = draft.type === type;
            return (
              <li key={type}>
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={type}
                  onClick={() => setDraft({ ...draft, type })}
                  className={`press-surface flex aspect-square w-full items-center justify-center rounded-sm border-2 ${
                    selected ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-fill-2'
                  }`}
                >
                  <BotAvatar type={type} face={draft.face} size={52} seed={i / AVATAR_TYPES.length} />
                </button>
              </li>
            );
          })}
        </ul>

        <button type="button" onClick={() => onPick(draft)} className={`${BTN_MD} mt-6 w-full bg-accent text-bg hover:bg-accent-hover`}>
          {t.profileAvatarApply}
        </button>
      </div>
    </Modal>
  );
};

export default AvatarPicker;
