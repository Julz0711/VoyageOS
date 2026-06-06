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
} from 'lucide-react';
import { strings } from '@/lib/strings';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: strings.nav.dashboard, icon: LayoutDashboard },
  { href: '/explore', label: strings.nav.explore, icon: Compass },
  { href: '/chat', label: strings.nav.chat, icon: MessageCircle },
  { href: '/plan', label: strings.nav.plan, icon: CalendarDays },
  { href: '/map', label: strings.nav.map, icon: Map },
  { href: '/pack', label: strings.nav.pack, icon: Luggage },
  { href: '/budget', label: strings.nav.budget, icon: Wallet },
  { href: '/checklist', label: strings.nav.checklist, icon: ListChecks },
  { href: '/docs', label: strings.nav.docs, icon: FileText },
];

/** Items shown as bottom-nav tabs on mobile; the rest fold into a "More" sheet. */
export const PRIMARY_NAV_COUNT = 5;
