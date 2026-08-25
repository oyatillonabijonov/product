import { useLoaderData } from 'react-router';
import type { Route } from './+types/blog';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, storeConfigFrom, ogMeta } from '../lib/seo';
import { loadPosts } from '../lib/loaders';
import { PostCard } from '../../src/store/BlogSection';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const posts = await loadPosts(context.cloudflare.env, 60);
  return { posts, locale, origin: new URL(request.url).origin };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const cfg = storeConfigFrom(matches);
  const title = pageTitle('Blog', cfg?.seoTitleSuffix);
  const desc = data?.locale === 'ru'
    ? 'Практические статьи инженеров: подбор техники, настройка и обслуживание.'
    : "Muhandislardan amaliy maqolalar: texnika tanlash, sozlash va xizmat ko'rsatish.";
  return [
    { title },
    { name: 'description', content: desc },
    ...ogMeta({ title, description: desc, url: data ? `${data.origin}/blog` : undefined }),
  ];
}

export default function BlogRoute() {
  const { posts, locale } = useLoaderData<typeof loader>();
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 md:py-14">
      <h1 className="mb-3 text-[32px] font-semibold tracking-[-0.03em] text-primary md:text-[40px]">Blog</h1>
      <p className="mb-9 max-w-[560px] text-[16px] leading-relaxed text-muted">
        {locale === 'ru'
          ? 'Практические статьи наших инженеров.'
          : "Muhandislarimizdan amaliy maqolalar."}
      </p>
      {posts.length === 0 ? (
        <p className="text-[15px] text-muted">{locale === 'ru' ? 'Пока нет статей.' : "Hozircha maqolalar yo'q."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => <PostCard key={p.id} post={p} locale={locale} className="min-h-[260px]" />)}
        </div>
      )}
    </div>
  );
}
