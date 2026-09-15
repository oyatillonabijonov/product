import { describe, it, expect } from 'vitest';
import { adminPath, parseAdminPath, type SectionId } from './admin-path';

const SEG: Record<SectionId, string[]> = {
  home: [],
  products: ['types', 'categories', 'brands', 'models'],
  orders: ['applications'],
  content: ['banners', 'news'],
  settings: ['store', 'account'],
};

describe('parseAdminPath', () => {
  it("/admin va noma'lum bo'lim → bosh sahifa", () => {
    expect(parseAdminPath('/admin', SEG)).toEqual({ section: 'home', tab: null, id: null });
    expect(parseAdminPath('/admin/', SEG)).toEqual({ section: 'home', tab: null, id: null });
    expect(parseAdminPath('/', SEG)).toEqual({ section: 'home', tab: null, id: null });
    expect(parseAdminPath('/admin/foo/bar', SEG)).toEqual({ section: 'home', tab: null, id: null });
    expect(parseAdminPath('/admin/constructor', SEG)).toEqual({ section: 'home', tab: null, id: null });
  });

  it("bo'limning asosiy tabi — segment yo'q, id bo'lishi mumkin", () => {
    expect(parseAdminPath('/admin/products', SEG)).toEqual({ section: 'products', tab: null, id: null });
    expect(parseAdminPath('/admin/products/123', SEG)).toEqual({ section: 'products', tab: null, id: '123' });
    expect(parseAdminPath('/admin/products/new', SEG)).toEqual({ section: 'products', tab: null, id: 'new' });
  });

  it('tab segmenti va undan keyingi id', () => {
    expect(parseAdminPath('/admin/products/categories', SEG)).toEqual({ section: 'products', tab: 'categories', id: null });
    expect(parseAdminPath('/admin/products/categories/apple', SEG)).toEqual({ section: 'products', tab: 'categories', id: 'apple' });
    expect(parseAdminPath('/admin/orders/applications/5', SEG)).toEqual({ section: 'orders', tab: 'applications', id: '5' });
    expect(parseAdminPath('/admin/settings/account', SEG)).toEqual({ section: 'settings', tab: 'account', id: null });
  });

  it("murakkab id (tur: yo'nalish/id) bo'laklari birlashtiriladi", () => {
    expect(parseAdminPath('/admin/products/types/pc/cpu', SEG)).toEqual({ section: 'products', tab: 'types', id: 'pc/cpu' });
  });
});

describe('adminPath', () => {
  it("bo'lim, segment va id dan yo'l yasaydi", () => {
    expect(adminPath('home')).toBe('/admin');
    expect(adminPath('products')).toBe('/admin/products');
    expect(adminPath('products', '', 'new')).toBe('/admin/products/new');
    expect(adminPath('products', 'categories')).toBe('/admin/products/categories');
    expect(adminPath('products', 'categories', 'apple')).toBe('/admin/products/categories/apple');
    expect(adminPath('orders', 'applications', '5')).toBe('/admin/orders/applications/5');
  });
});
