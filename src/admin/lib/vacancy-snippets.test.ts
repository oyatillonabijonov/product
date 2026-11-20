import { describe, expect, it } from 'vitest';
import { hasBullet, toggleBullet } from './vacancy-snippets';

describe('toggleBullet', () => {
  it("bo'limni yaratadi, mavjudiga qo'shadi, olib tashlaydi", () => {
    let md = toggleBullet('Kirish matni', 'Talablar', 'Rus tili');
    expect(md).toBe('Kirish matni\n\n## Talablar\n\n- Rus tili');
    md = toggleBullet(md, 'Vazifalar', 'Savdo');
    md = toggleBullet(md, 'Talablar', 'Tajriba');
    expect(md).toBe('Kirish matni\n\n## Talablar\n\n- Rus tili\n- Tajriba\n\n## Vazifalar\n\n- Savdo');
    expect(hasBullet(md, 'Tajriba')).toBe(true);
    md = toggleBullet(md, 'Talablar', 'Rus tili');
    md = toggleBullet(md, 'Talablar', 'Tajriba');
    expect(md).toBe('Kirish matni\n\n## Vazifalar\n\n- Savdo');
    expect(toggleBullet('', 'Vazifalar', 'Savdo')).toBe('## Vazifalar\n\n- Savdo');
  });

  it("sarlavha ostida matn bo'lsa, ro'yxat undan keyin", () => {
    expect(toggleBullet('## Talablar\n\nOddiy matn', 'Talablar', 'A')).toBe('## Talablar\n\nOddiy matn\n\n- A');
  });
});
