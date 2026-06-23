import { docs } from '../.source';
import { loader } from 'fumadocs-core/source';

// fumadocs-mdx returns files as a function, but fumadocs-core expects an array
const mdxSource = docs.toFumadocsSource() as any;
const files = typeof mdxSource.files === 'function' ? mdxSource.files() : mdxSource.files;

export const source = loader({
  source: { files },
  baseUrl: '/docs',
});
