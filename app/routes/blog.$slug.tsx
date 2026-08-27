import { useLoaderData } from 'react-router';
import type { Route } from './+types/blog.$slug';
import { resolveLocale, localeField } from '../lib/i18n';
import { pageTitle, storeConfigFrom, ogMeta } from '../lib/seo';
import { loadPost } from '../lib/loaders';
import { firstParagraph } from '../../src/lib/markdown';
import Markdown from '../../src/store/Markdown';
import LocaleLink from '../../src/store/LocaleLink';
import { postDate } from '../../src/store/BlogSection';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const post = await loadPost(context.env, String(params.slug));
  if (!post) throw new Response('Not Found', { status: 404 });
  return { post, locale, origin: new URL(request.url).origin };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const { post, locale, origin } = data;
  const title = pageTitle(localeField(post.title, post.titleRu, locale), sfx);
  const desc = localeField(post.excerpt, post.excerptRu, locale)
    || firstParagraph(localeField(post.content, post.contentRu, locale));
  const image = post.coverUrl
    ? (post.coverUrl.startsWith('http') ? post.coverUrl : origin + post.coverUrl)
    : undefined;
  return [
    { title },
    { tagName: 'link', rel: 'canonical', href: `${origin}${locale === 'uz' ? '' : `/${locale}`}/blog/${post.slug}` },
    ...(desc ? [{ name: 'description', content: desc }] : []),
    ...ogMeta({ title, description: desc, image, url: `${origin}/blog/${post.slug}` }),
  ];
}

export default function BlogPostRoute() {
  const { post, locale } = useLoaderData<typeof loader>();
  const date = postDate(post.publishedAt, locale);
  return (
    <article className="mx-auto max-w-[760px] px-4 py-10 md:py-14">
      <LocaleLink to="/blog" className="mb-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-muted transition-colors hover:text-primary">
        <span aria-hidden>‹</span> Blog
      </LocaleLink>
      {date && <div className="text-[14px] text-muted-2">{date}</div>}
      <h1 className="mt-2 mb-6 text-[32px] font-semibold tracking-[-0.03em] text-primary md:text-[40px]">
        {localeField(post.title, post.titleRu, locale)}
      </h1>
      {post.coverUrl && (
        <img src={post.coverUrl} alt="" className="mb-8 w-full rounded-[20px] object-cover" />
      )}
      <Markdown source={localeField(post.content, post.contentRu, locale)} />
    </article>
  );
}
