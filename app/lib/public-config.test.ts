import { describe, expect, it } from 'vitest';
import { publicSiteConfig } from './loaders';
import type { ApiSiteConfig } from '../../shared/types';

describe('publicSiteConfig', () => {
  it("brauzerga faqat ochiq maydonlar ketadi — sir va ichki maydon nomi ham yo'q", () => {
    const full: ApiSiteConfig = {
      name: 'ProDuct', phone: '+998901234567', phoneDisplay: '+998 90 123-45-67', telegram: 'https://t.me/x',
      instagram: 'https://instagram.com/x', whatsapp: '', mapLl: '69.2,41.3', seoTitleSuffix: 'ProDuct', seoDescription: 'd',
      ogImage: '/og.png', paymentMode: 'cash', telegramBotToken: 'SIR-bot', telegramOrderChatId: 'SIR-chat',
      googleClientId: 'gid', googleClientSecret: 'SIR-google', telegramLoginBot: 'bot', customerSessionSecret: 'SIR-session',
      yandexMetricaId: '1', billzSecretToken: 'SIR-billz', billzShopId: 'SIR-shop', billzLastSync: 'SIR-sync',
    };
    // Kelajakda qo'shiladigan maydon ham o'zidan chiqib ketmasligi kerak (oq ro'yxat).
    const out = publicSiteConfig({ ...full, yangiSir: 'SIR-yangi' } as ApiSiteConfig);
    expect(Object.keys(out).sort()).toEqual([
      'googleClientId', 'instagram', 'mapLl', 'name', 'ogImage', 'paymentMode', 'phone', 'phoneDisplay',
      'seoDescription', 'seoTitleSuffix', 'telegram', 'telegramLoginBot', 'whatsapp', 'yandexMetricaId',
    ]);
    expect(JSON.stringify(out)).not.toContain('SIR');
  });
});
