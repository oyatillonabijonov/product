import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AdminClient } from '../shared/mcp-client.ts';
import { registerTools } from './tools.ts';

/**
 * Lokal MCP server — odamning o'z kompyuterida ishlaydi, shuning uchun papkadagi
 * rasmlarni o'qiy oladi. Manzil va token sozlamadan keladi, ya'ni shu server
 * platformaning boshqa do'kon nusxasiga ham ulanadi.
 */
const base = process.env.PRODUCT_URL;
const token = process.env.PRODUCT_TOKEN;
if (!base || !token) {
  console.error('PRODUCT_URL va PRODUCT_TOKEN kerak. Namuna: PRODUCT_URL=https://sayt.uz PRODUCT_TOKEN=prod_…');
  process.exit(1);
}

const server = new McpServer({ name: 'product-admin', version: '1.0.0' });
registerTools(server, new AdminClient(base, token), { allowFiles: true, adminUrl: base.replace(/\/$/, '') });
await server.connect(new StdioServerTransport());
