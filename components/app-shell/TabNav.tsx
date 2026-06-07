'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Settings2, X } from 'lucide-react';
import { mobileLeftNav, mobileRightNav, mobileOverflowNav, type NavItem } from './nav-items';
import { strings } from '@/lib/strings';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Mobile: fixed bottom navigation (pinned tabs + a centered "More" sheet). Desktop uses the Sidebar. */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = mobileOverflowNav.some((i) => isActive(pathname, i.href));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-between border-t border-border bg-surface/95 px-2 pt-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Primary"
      >
        {mobileLeftNav.map((item) => (
          <Tab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          aria-label={strings.nav.more}
          className={cn(
            'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
            moreActive ? 'text-ink' : 'text-muted',
          )}
        >
          <span
            className={cn(
              'flex size-9 items-center justify-center rounded-lg transition-colors',
              moreActive && 'bg-accent text-accent-foreground',
            )}
          >
            <Menu className="size-5" aria-hidden />
          </span>
          {strings.nav.more}
        </button>

        {mobileRightNav.map((item) => (
          <Tab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-ink/30 backdrop-blur-sm md:hidden"
          onClick={() => setMoreOpen(false)}
          role="presentation"
        >
          <div
            className="w-full rounded-t-2xl border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={strings.nav.more}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="eyebrow text-muted">{strings.nav.more}</span>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close" className="p-1 text-muted hover:text-ink">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {mobileOverflowNav.map((item) => (
                <SheetLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(pathname, item.href)}
                  onClick={() => setMoreOpen(false)}
                />
              ))}
              <SheetLink
                href="/settings"
                label={strings.nav.settings}
                icon={Settings2}
                active={isActive(pathname, '/settings')}
                onClick={() => setMoreOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
        active ? 'text-ink' : 'text-muted',
      )}
    >
      <span
        className={cn(
          'flex size-7 items-center justify-center rounded-md transition-colors',
          active && 'bg-accent text-accent-foreground',
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      {item.label}
    </Link>
  );
}

function SheetLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: NavItem['icon'];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-ink hover:border-ink/30',
      )}
    >
      <Icon className="size-5" aria-hidden />
      {label}
    </Link>
  );
}
