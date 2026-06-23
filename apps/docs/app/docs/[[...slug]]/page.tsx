import { source } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { getMDXComponents } from '@/components/mdx';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const Mdx = (page as any).data.body;

  return (
    <DocsPage full={(page as any).data.full}>
      <DocsTitle>{(page as any).data.title}</DocsTitle>
      <DocsDescription>{(page as any).data.description}</DocsDescription>
      <DocsBody>
        {Mdx && (
          <Mdx
            components={getMDXComponents({
              a: createRelativeLink(source, page),
            })}
          />
        )}
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: (page as any).data.title,
    description: (page as any).data.description,
  };
}
