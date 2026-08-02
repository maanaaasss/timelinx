'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from 'fumadocs-ui/components/ui/popover';
import {
  Building,
  Layout,
  Box,
  Pencil,
  Terminal,
  ChevronsUpDown,
  Check,
} from 'lucide-react';

const PACKAGES = [
  {
    id: 'library',
    name: 'Library',
    subtitle: 'The docs framework',
    icon: Building,
    color: 'var(--framework-color, var(--color-fd-foreground))',
    href: '/docs/library',
  },
  {
    id: 'ui',
    name: 'Timelinx UI',
    subtitle: 'The default theme',
    icon: Layout,
    color: 'var(--ui-color, #60a5fa)',
    href: '/docs/ui',
  },
  {
    id: 'core',
    name: 'Timelinx Core',
    subtitle: 'The headless library',
    icon: Box,
    color: 'var(--core-color, #c084fc)',
    href: '/docs/core',
  },
  {
    id: 'react',
    name: 'Timelinx React',
    subtitle: 'React bindings & hooks',
    icon: Pencil,
    color: 'var(--react-color, #f472b6)',
    href: '/docs/react',
  },
  {
    id: 'cli',
    name: 'CLI',
    subtitle: 'Command-line tools for Timelinx',
    icon: Terminal,
    color: 'var(--cli-color, var(--color-fd-foreground))',
    href: '/docs/cli',
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
    setSelected(getPackageFromPathname(pathname));
  }, [pathname]);

  const current = PACKAGES.find((p) => p.id === selected)!;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-popup-open={open || undefined}
          className="flex items-center gap-2 rounded-lg p-2 border bg-fd-secondary/50 text-start text-fd-secondary-foreground transition-colors hover:bg-fd-accent data-[popup-open]:bg-fd-accent data-[popup-open]:text-fd-accent-foreground cursor-pointer"
        >
          <div className="size-9 shrink-0 empty:hidden md:size-5">
            <div
              className="[&_svg]:size-full rounded size-full max-md:bg-[currentColor]/10 max-md:border max-md:p-1.5"
              style={{ color: current.color }}
            >
              <current.icon />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">{current.name}</p>
            <p className="text-sm text-fd-muted-foreground empty:hidden md:hidden">
              {current.subtitle}
            </p>
          </div>
          <ChevronsUpDown className="shrink-0 ms-auto size-4 text-fd-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] p-1.5 rounded-md border border-fd-border bg-fd-card shadow-xl"
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
              className={[
                'flex items-center gap-2 rounded p-2 w-full text-start transition-colors cursor-pointer',
                isActive
                  ? 'bg-fd-primary/10'
                  : 'hover:bg-fd-accent',
              ].join(' ')}
            >
              <div className="size-9 shrink-0 empty:hidden md:size-5">
                <div
                  className="[&_svg]:size-full rounded size-full max-md:bg-[currentColor]/10 max-md:border max-md:p-1.5"
                  style={{ color: pkg.color }}
                >
                  <Icon />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pkg.name}</p>
                <p className="text-sm text-fd-muted-foreground empty:hidden md:hidden truncate">
                  {pkg.subtitle}
                </p>
              </div>
              {isActive && (
                <Check className="shrink-0 ms-auto size-4 text-fd-muted-foreground" />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
