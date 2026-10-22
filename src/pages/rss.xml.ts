import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const allPosts = await getCollection('blog');
  const posts = allPosts
    .filter(e => e.id.startsWith('en/'))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: 'KILC Blog — Legal Insights',
    description: 'Legal insights, company news, and updates from KILC.',
    site: context.site!,
    items: posts.map(post => {
      const slug = post.data.slug ?? post.id.replace('en/', '').replace('.md', '');
      return {
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.excerpt,
        link: `/blogs/${slug}`,
        ...(post.data.author ? { author: post.data.author } : {}),
        ...(post.data.tags?.length ? { categories: post.data.tags } : {}),
      };
    }),
    customData: '<language>en-gb</language>',
  });
}
