import { describe, expect, it } from 'vitest';
import { ASSET_FIELDS, TEXT_FIELDS } from '../../lib/site-content';
import { acceptLabel, acceptsType, changedAssets, changedTexts, contentSections, initialTexts, uploadOptions, withoutId, type TextFieldDef } from './content-form';

const fields: TextFieldDef[] = TEXT_FIELDS.map((f) => ({ ...f, defaults: { uz: `${f.key}-uz`, ru: `${f.key}-ru` } }));

describe('contentSections', () => {
  it("landing: yo'nalish kartalari matni va rasmlari bilan, keyin xizmatlar, konsultatsiya, sarlavhalar", () => {
    const s = contentSections('home', fields, ASSET_FIELDS);
    expect(s.map((x) => x.title)).toEqual(['Apple kartasi', 'PC kartasi', 'Audio kartasi', 'Video kartasi', "Xizmat va'dalari", 'Konsultatsiya', 'Sarlavhalar']);
    expect(s[1].texts.map((f) => f.key)).toEqual(['heroPc']);
    expect(s[1].assets.map((f) => f.key)).toEqual(['hero.pc.image', 'hero.pc.poster', 'hero.pc.video1', 'hero.pc.video2']);
    expect(s[5].assets.map((f) => f.key)).toEqual(['consult.image']);
  });
  it("faqat rasmli bo'lim oxirida; kalit filtri", () => {
    const about = contentSections('about', fields, ASSET_FIELDS);
    expect(about[about.length - 1].title).toBe('Rasmlar');
    expect(contentSections('legal', fields, ASSET_FIELDS, ['legalLedeOferta'])).toEqual([
      { title: 'Sarlavha ostidagi izoh', texts: [fields.find((f) => f.key === 'legalLedeOferta')], assets: [] },
    ]);
    expect(contentSections('legal', fields, ASSET_FIELDS, [])).toEqual([]);
  });
});

describe('initialTexts / changedTexts', () => {
  it("bo'sh qiymat o'rnida standart; faqat o'zgargan kalit yuboriladi", () => {
    const base = initialTexts(fields, { proTitle: { uz: 'Shior', ru: '' } });
    expect(base.proTitle).toEqual({ uz: 'Shior', ru: 'proTitle-ru' });
    expect(base.newsTitle).toEqual({ uz: 'newsTitle-uz', ru: 'newsTitle-ru' });
    const draft = { ...base, newsTitle: { uz: '', ru: 'newsTitle-ru' } };
    expect(changedTexts(base, draft)).toEqual({ newsTitle: { uz: '', ru: 'newsTitle-ru' } });
    expect(changedTexts(base, base)).toEqual({});
  });
});

describe('changedAssets', () => {
  it("yangi, almashgan va olib tashlangan kalitlar; o'zgarmagani yuborilmaydi", () => {
    expect(changedAssets(
      { logo: '/images/products/a.webp', favicon: '/images/products/f.png' },
      { logo: '/images/products/b.webp', favicon: '/images/products/f.png', 'hero.pc.video1': '/images/products/v.mp4' },
    )).toEqual({ logo: '/images/products/b.webp', 'hero.pc.video1': '/images/products/v.mp4' });
    expect(changedAssets({ logo: '/images/products/a.webp' }, { logo: '' })).toEqual({ logo: '' });
    expect(changedAssets({}, { logo: '' })).toEqual({});
  });
});

describe('uploadOptions', () => {
  it("favicon o'zgarishsiz, logo kesiladi, foto kesilmaydi", () => {
    expect(uploadOptions('favicon')).toBe(false);
    expect(uploadOptions('logoDark')).toEqual({});
    expect(uploadOptions('hero.apple.image')).toEqual({ maxSize: 2400, maxTrimRatio: 0 });
  });
});

describe('withoutId', () => {
  it("id tanadan chiqadi", () => {
    expect(withoutId({ id: 'a', title: 'b', isActive: true })).toEqual({ title: 'b', isActive: true });
  });
});

describe('acceptsType / acceptLabel', () => {
  it("aniq ro'yxat, joker va bo'sh accept", () => {
    expect(acceptsType('image/png,image/jpeg', 'image/png')).toBe(true);
    expect(acceptsType('image/png', 'image/jpeg')).toBe(false);
    expect(acceptsType('image/*', 'image/webp')).toBe(true);
    expect(acceptsType(undefined, 'video/mp4')).toBe(true);
  });
  it('xato xabari uchun yorliq', () => {
    expect(acceptLabel('image/png,image/jpeg')).toBe('PNG, JPEG');
  });
});
