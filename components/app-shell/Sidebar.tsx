'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Settings2 } from 'lucide-react';
import { navItems } from './nav-items';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop left rail navigation (hidden on mobile — see BottomNav). */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col px-5 py-7 md:flex">
      <Link href="/dashboard" className="mb-7 flex items-center gap-2.5 px-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Compass className="size-[18px]" aria-hidden />
        </span>
        <span className="font-display text-xl font-semibold leading-none text-ink">
          Voyage<span className="text-muted">OS</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active ? 'bg-ink/[0.05] font-medium text-ink' : 'text-muted hover:bg-ink/[0.03] hover:text-ink',
              )}
            >
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-pill bg-accent transition-opacity',
                  active ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden
              />
              <Icon className="size-[18px]" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-border pt-4">
        <Link
          href="/settings"
          aria-current={isActive(pathname, '/settings') ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
            isActive(pathname, '/settings')
              ? 'bg-ink/[0.05] font-medium text-ink'
              : 'text-muted hover:bg-ink/[0.03] hover:text-ink',
          )}
        >
          <Settings2 className="size-[18px]" aria-hidden />
          Settings
        </Link>
      </div>
    </aside>
  );
}
