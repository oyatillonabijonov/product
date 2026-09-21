// `createLimiter`ning o'zi `shared/rate-limit.ts`ga ko'chdi — Docker image `functions/`ni
// tashimaydi, remote MCP (`server/mcp.ts`) ham shu funksiyani ishlatadi. Shu yerda faqat
// qayta eksport qilinadi, chunki bu faylning nomi (`allowLead` bilan) route'larda o'zgarishsiz qoladi.
import { createLimiter } from '../../shared/rate-limit';

export { createLimiter };

/** Ommaviy lead endpoint'lari (/api/order, /api/consult): bitta IP'dan 10 daqiqada 10 ta. */
export const allowLead = createLimiter(10, 10 * 60 * 1000);
