'use client';

import { useState } from 'react';
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
  },
  {
    id: 'ui',
    name: 'Timelinx UI',
    subtitle: 'The default theme',
    icon: Layout,
    color: 'var(--ui-color, #60a5fa)',
  },
  {
    id: 'core',
    name: 'Timelinx Core',
    subtitle: 'The headless library',
    icon: Box,
    color: 'var(--core-color, #c084fc)',
  },
  {
    id: 'react',
    name: 'Timelinx React',
    subtitle: 'React bindings & hooks',
    icon: Pencil,
    color: 'var(--react-color, #f472b6)',
  },
  {
    id: 'cli',
    name: 'Fumadocs CLI',
    subtitle: 'CLI tools for docs & automation',
    icon: Terminal,
    color: 'var(--cli-color, var(--color-fd-foreground))',
  },
] as const;

type PackageId = (typeof PACKAGES)[number]['id'];

export function PackageSelector() {
  const [selected, setSelected] = useState<PackageId>('cli');
  const current = PACKAGES.find((p) => p.id === selected)!;
  const [open, setOpen] = useState(false);

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
              className="[&_svg]:size-full rounded-lg size-full max-md:bg-[currentColor]/10 max-md:border max-md:p-1.5"
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
        className="w-[var(--radix-popover-trigger-width)] p-1.5 rounded-xl border border-fd-border bg-fd-card shadow-xl"
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
              }}
              className={[
                'flex items-center gap-2 rounded-lg p-2 w-full text-start transition-colors cursor-pointer',
                isActive
                  ? 'bg-fd-primary/10'
                  : 'hover:bg-fd-accent',
              ].join(' ')}
            >
              <div className="size-9 shrink-0 empty:hidden md:size-5">
                <div
                  className="[&_svg]:size-full rounded-lg size-full max-md:bg-[currentColor]/10 max-md:border max-md:p-1.5"
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
