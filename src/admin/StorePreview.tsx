import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import storeCss from '../../app/styles.css?url';

/**
 * Sayt komponentining jonli ko'rinishi (NewsEdit'dagi `NewsTile`). Admin o'z CSS build'ida (ERP tokenlari),
 * sayt tokenlari esa xuddi shu nomlarda boshqa qiymatda — shuning uchun komponent Shadow DOM ichida, saytning
 * o'z CSS'i bilan chiziladi: uslublar ikki tomonga ham oqmaydi (Tailwind tokenlari `:root, :host` da e'lon
 * qilinadi, `:host` shu yerda ishlaydi). Ko'rinish doim yorug' mavzuda.
 */
const StorePreview: FC<{ className?: string; children: ReactNode }> = ({ className = '', children }) => {
  const host = useRef(null) as { current: HTMLDivElement | null };
  const [root, setRoot] = useState(null as ShadowRoot | null);
  useEffect(() => {
    const el = host.current;
    if (el) setRoot(el.shadowRoot ?? el.attachShadow({ mode: 'open' }));
  }, []);
  const shadow = root as ShadowRoot | null;
  return (
    <div ref={host} className={className}>
      {shadow && createPortal(
        <>
          <link rel="stylesheet" href={storeCss} />
          <div style={{ letterSpacing: 'normal' }}>{children}</div>
        </>,
        shadow as unknown as Element,
      )}
    </div>
  );
};

export default StorePreview;
