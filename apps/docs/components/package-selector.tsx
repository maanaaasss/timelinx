'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from 'fumadocs-ui/components/ui/popover';
import {
  Building2,
  Layout,
  Box,
  Pencil,
  Terminal,
  ChevronDown,
  Check,
} from 'lucide-react';

const PACKAGES = [
  {
    id: 'library',
    name: 'Library',
    subtitle: 'The docs framework',
    icon: Building2,
    color: '#facc15',
  },
  {
    id: 'ui',
    name: 'Timelinx UI',
    subtitle: 'The default theme',
    icon: Layout,
    color: '#60a5fa',
  },
  {
    id: 'core',
    name: 'Timelinx Core',
    subtitle: 'The headless library',
    icon: Box,
    color: '#c084fc',
  },
  {
    id: 'react',
    name: 'Timelinx React',
    subtitle: 'React bindings & hooks',
    icon: Pencil,
    color: '#f472b6',
  },
  {
    id: 'cli',
    name: 'Fumadocs CLI',
    subtitle: 'CLI tools for docs & automation',
    icon: Terminal,
    color: '#e2e8f0',
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
          className="flex items-center gap-2.5 w-full rounded-lg border border-fd-border bg-fd-card px-3 py-2.5 text-sm font-medium text-fd-card-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground cursor-pointer"
        >
          <Terminal size={16} className="text-fd-muted-foreground" />
          <span className="truncate">{current.name}</span>
          <ChevronDown
            size={14}
            className="ms-auto text-fd-muted-foreground transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
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
                'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-start transition-colors cursor-pointer',
                isActive
                  ? 'bg-fd-primary/10'
                  : 'hover:bg-fd-accent',
              ].join(' ')}
            >
              <span
                className="flex items-center justify-center size-8 rounded-md border border-fd-border bg-fd-background"
              >
                <Icon size={16} style={{ color: pkg.color }} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-fd-foreground truncate">
                  {pkg.name}
                </div>
                <div className="text-xs text-fd-muted-foreground truncate">
                  {pkg.subtitle}
                </div>
              </div>
              {isActive && (
                <Check size={14} className="text-fd-foreground shrink-0" />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
