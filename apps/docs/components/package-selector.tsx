'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from 'fumadocs-ui/components/ui/popover';
import {
  BookOpen,
  Layout,
  Box,
  Pencil,
  ChevronsUpDown,
  Check,
} from 'lucide-react';

const PACKAGES = [
  {
    id: 'library',
    name: 'Library',
    subtitle: 'The timelinx library',
    icon: BookOpen,
    color: '#fff383',
    href: '/docs/library',
  },
  {
    id: 'ui',
    name: 'UI Components',
    subtitle: 'The default theme',
    icon: Layout,
    color: '#60a5fa',
    href: '/docs/ui',
  },
  {
    id: 'core',
    name: 'Core',
    subtitle: 'The headless library',
    icon: Box,
    color: '#c084fc',
    href: '/docs/core',
  },
  {
    id: 'react',
    name: 'React',
    subtitle: 'The react bindings',
    icon: Pencil,
    color: '#aa99ff',
    href: '/docs/react',
  },
] as const;

type PackageId = (typeof PACKAGES)[number]['id'];

function getPackageFromPathname(pathname: string): PackageId {
  for (const pkg of PACKAGES) {
    if (pathname.startsWith(pkg.href)) return pkg.id;
  }
  return 'library';
}

export function PackageSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const [selected, setSelected] = useState<PackageId>('library');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const pkg = getPackageFromPathname(pathname);
    setSelected(pkg);
    const color = PACKAGES.find((p) => p.id === pkg)?.color ?? '#fff383';
    document.documentElement.style.setProperty('--color-fd-primary', color);
    document.documentElement.style.setProperty('--color-fd-primary-foreground', '#09090b');
  }, [pathname]);

  const current = PACKAGES.find((p) => p.id === selected)!;

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-popup-open={open || undefined}
            className="inline-flex items-center gap-2 w-full rounded-lg border bg-fd-secondary/50 p-1.5 ps-2 text-sm text-fd-muted-foreground text-start transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground data-[popup-open]:bg-fd-accent data-[popup-open]:text-fd-accent-foreground cursor-pointer"
          >
            <div
              className="size-4 shrink-0 [&_svg]:size-full"
              style={{ color: current.color }}
            >
              <current.icon />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium truncate">{current.name}</span>
            </div>
            <ChevronsUpDown className="shrink-0 size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[var(--radix-popover-trigger-width)] p-1 rounded-lg border border-fd-border/60 bg-fd-card shadow-2xl"
        >
          {PACKAGES.map((pkg) => {
            const Icon = pkg.icon;
            const isActive = pkg.id === selected;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => {
                  setSelected(pkg.id);
                  setOpen(false);
                  router.push(pkg.href);
                }}
                className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-start transition-colors cursor-pointer hover:bg-fd-accent/50"
                style={isActive ? { backgroundColor: `color-mix(in srgb, ${pkg.color} 8%, transparent)` } : undefined}
              >
                <div
                  className="size-4 shrink-0 [&_svg]:size-full"
                  style={{ color: pkg.color }}
                >
                  <Icon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{pkg.name}</p>
                  <p className="text-[11px] leading-tight text-fd-muted-foreground truncate mt-0.5">{pkg.subtitle}</p>
                </div>
                {isActive && (
                  <Check className="shrink-0 size-3.5" style={{ color: pkg.color }} />
                )}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
      <a
        href="https://github.com/maanaaasss/timelinx"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 w-full rounded-lg border bg-fd-secondary/50 p-1.5 ps-2 text-sm text-fd-muted-foreground text-start transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        <span>GitHub</span>
      </a>
    </div>
  );
}
