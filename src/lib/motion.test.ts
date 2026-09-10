import { describe, it, expect } from 'vitest';
import { SPRING_UI, SPRING_SHEET, SPRING_MOMENTUM, SPRING_SNAPPY, project, rubberband } from './motion';

describe('spring presets', () => {
  it('sukut bo\'yicha prujina otib o\'tmaydi (damping 1.0 → bounce 0)', () => {
    expect(SPRING_UI.bounce).toBe(0);
    expect(SPRING_SNAPPY.bounce).toBe(0);
    expect(SPRING_UI.visualDuration).toBe(0.4);
  });

  it('impuls olib keladigan harakatlarda ozgina sakrash bor (damping 0.8)', () => {
    expect(SPRING_SHEET.bounce).toBeCloseTo(0.2, 10);
    expect(SPRING_MOMENTUM.bounce).toBeCloseTo(0.2, 10);
    expect(SPRING_SHEET.visualDuration).toBe(0.3);
  });
});

describe('project', () => {
  it('tezlik yo\'nalishini saqlaydi', () => {
    expect(project(1000)).toBeGreaterThan(0);
    expect(project(-1000)).toBeLessThan(0);
    expect(project(0)).toBe(0);
  });

  it('tezroq jest uzoqroqqa proyeksiya qilinadi', () => {
    expect(project(2000)).toBeGreaterThan(project(1000));
  });

  it('Apple eksponensial so\'nish formulasi bo\'yicha hisoblaydi', () => {
    // (1000/1000) * 0.998 / (1 - 0.998) = 499
    expect(project(1000)).toBeCloseTo(499, 6);
  });

  it('pastroq decelerationRate tezroq to\'xtatadi', () => {
    expect(project(1000, 0.99)).toBeLessThan(project(1000, 0.998));
  });
});

describe('rubberband', () => {
  it('chegaradan o\'tilmaganda siljish yo\'q', () => {
    expect(rubberband(0, 800)).toBe(0);
  });

  it('siljish har doim o\'tilgan masofadan kichik — qarshilik bor', () => {
    expect(rubberband(100, 800)).toBeLessThan(100);
    expect(rubberband(400, 800)).toBeLessThan(400);
  });

  it('uzoqroq tortilgan sari qarshilik ortadi (chiziqli emas)', () => {
    const near = rubberband(50, 800) / 50;
    const far = rubberband(500, 800) / 500;
    expect(far).toBeLessThan(near);
  });

  it('ikkala yo\'nalishda simmetrik', () => {
    expect(rubberband(-120, 800)).toBeCloseTo(-rubberband(120, 800), 10);
  });

  it('o\'lcham nol bo\'lsa bo\'linish xatosi bermaydi', () => {
    expect(rubberband(100, 0)).toBe(0);
  });
});
