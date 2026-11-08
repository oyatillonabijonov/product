import { BlockList, isIP } from 'node:net';

// https://www.cloudflare.com/ips/ (2026-11-08).
// ponytail: ro'yxat qo'lda. Cloudflare yangi tarmoq qo'shsa, undan kelgan mijozlar Cloudflare IP'si bilan sanaladi
// (soxtalashtirish xavfi yo'q, faqat limit umumiy bo'ladi) — shunda ro'yxatni yangilang.
const V4 = ['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22'];
const V6 = ['2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32'];

const cloudflare = new BlockList();
for (const cidr of V4) { const [net, bits] = cidr.split('/'); cloudflare.addSubnet(net, Number(bits), 'ipv4'); }
for (const cidr of V6) { const [net, bits] = cidr.split('/'); cloudflare.addSubnet(net, Number(bits), 'ipv6'); }

/**
 * Mijozning haqiqiy IP'si, agar so'rov rostdan Cloudflare'dan kelgan bo'lsa; aks holda `null`.
 * `CF-Connecting-IP`ni har kim yozishi mumkin, shuning uchun u faqat ulangan tomon Cloudflare tarmog'ida bo'lganda o'qiladi —
 * serverga to'g'ridan-to'g'ri kelgan so'rov soxta sarlavha bilan rate limit'dan qochib qutula olmaydi.
 */
export function cloudflareClientIp(peerIp: string | undefined, cfConnectingIp: string | undefined): string | null {
  const family = peerIp ? isIP(peerIp) : 0;
  if (!peerIp || !family || !cfConnectingIp || !isIP(cfConnectingIp)) return null;
  return cloudflare.check(peerIp, family === 4 ? 'ipv4' : 'ipv6') ? cfConnectingIp : null;
}
