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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-popup-open={open || undefined}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 border border-fd-border/50 bg-fd-card/50 text-start transition-colors hover:bg-fd-accent/50 data-[popup-open]:bg-fd-accent/50 data-[popup-open]:border-fd-border cursor-pointer"
        >
          <div
            className="size-5 shrink-0 [&_svg]:size-full"
            style={{ color: current.color }}
          >
            <current.icon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight truncate">{current.name}</p>
            <p className="text-[11px] leading-tight text-fd-muted-foreground truncate mt-0.5">{current.subtitle}</p>
          </div>
          <ChevronsUpDown className="shrink-0 size-3.5 text-fd-muted-foreground" />
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
  );
}
