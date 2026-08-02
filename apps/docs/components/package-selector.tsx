'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from 'fumadocs-ui/components/ui/popover';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { BookOpen, Layers, Cpu, Atom, ChevronDown, Check } from 'lucide-react';

const PACKAGES = [
  { id: 'library', name: 'Library', icon: BookOpen, color: '#818cf8' },
  { id: 'ui', name: 'Timelinx UI', icon: Layers, color: '#c084fc' },
  { id: 'core', name: 'Timelinx Core', icon: Cpu, color: '#fb923c' },
  { id: 'react', name: 'Timelinx React', icon: Atom, color: '#22d3ee' },
] as const;

type PackageId = (typeof PACKAGES)[number]['id'];

export function PackageSelector() {
  const [selected, setSelected] = useState<PackageId>('library');
  const current = PACKAGES.find((p) => p.id === selected)!;

  return (
    <Popover>
      <PopoverTrigger
        className={buttonVariants({
          color: 'secondary',
          className:
            'gap-2 justify-start text-fd-muted-foreground bg-fd-secondary/50 w-full',
        })}
      >
        <current.icon
          size={16}
          style={{ color: current.color, flexShrink: 0 }}
        />
        <span className="truncate">{current.name}</span>
        <ChevronDown className="ms-auto size-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="flex flex-col gap-0.5 p-1 w-[var(--radix-popover-trigger-width)]"
      >
        {PACKAGES.map((pkg) => {
          const Icon = pkg.icon;
          const isActive = pkg.id === selected;
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => setSelected(pkg.id)}
              className={[
                'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-sm transition-colors',
                isActive
                  ? 'bg-fd-primary/10 text-fd-primary'
                  : 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
              ].join(' ')}
            >
              <Icon
                size={16}
                style={{ color: pkg.color, flexShrink: 0 }}
              />
              <span className="truncate">{pkg.name}</span>
              {isActive && (
                <Check className="ms-auto size-3.5 opacity-70" />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
