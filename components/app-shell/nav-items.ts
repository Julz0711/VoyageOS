import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  Compass,
  FileText,
  LayoutDashboard,
  Luggage,
  Map,
  MessageCircle,
  Wallet,
  ListChecks,
  Route,
} from 'lucide-react';
import { strings } from '@/lib/strings';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Full navigation order — used by the desktop sidebar. */
export const navItems: NavItem[] = [
  { href: '/dashboard', label: strings.nav.dashboard, icon: LayoutDashboard },
  { href: '/chat', label: strings.nav.chat, icon: MessageCircle },
  { href: '/explore', label: strings.nav.explore, icon: Compass },
  { href: '/roadtrips', label: strings.nav.roadtrips, icon: Route },
  { href: '/map', label: strings.nav.map, icon: Map },
  { href: '/plan', label: strings.nav.plan, icon: CalendarDays },
  { href: '/pack', label: strings.nav.pack, icon: Luggage },
  { href: '/budget', label: strings.nav.budget, icon: Wallet },
  { href: '/checklist', label: strings.nav.checklist, icon: ListChecks },
  { href: '/docs', label: strings.nav.docs, icon: FileText },
];

const find = (href: string): NavItem => navItems.find((i) => i.href === href)!;

// Mobile bottom bar: two tabs, the "More" (hamburger) menu in the middle, two tabs.
export const mobileLeftNav: NavItem[] = [find('/dashboard'), find('/chat')];
export const mobileRightNav: NavItem[] = [find('/plan'), find('/pack')];

const mobilePrimary = new Set([...mobileLeftNav, ...mobileRightNav].map((i) => i.href));

/** Everything not pinned to the bottom bar folds into the "More" sheet. */
export const mobileOverflowNav: NavItem[] = navItems.filter((i) => !mobilePrimary.has(i.href));
