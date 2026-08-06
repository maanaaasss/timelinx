import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/docs/library/quick-start',
        permanent: false,
      },
      {
        source: '/docs/',
        destination: '/docs/library/quick-start',
        permanent: false,
      },
    ];
  },
};

export default withMDX(config);
