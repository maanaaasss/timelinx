import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { PackageSelector } from '@/components/package-selector';
import { ThemeBarGithub } from '@/components/theme-bar-github';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={source.pageTree} nav={{ title: 'Timelinx' }} sidebar={{ banner: <PackageSelector /> }} tabs={false}>
      <ThemeBarGithub />
      {children}
    </DocsLayout>
  );
}
