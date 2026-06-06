import type { LucideIcon } from 'lucide-react';
import {
  Ticket,
  BedDouble,
  CalendarCheck,
  ShieldCheck,
  IdCard,
  Map as MapIcon,
  File,
} from 'lucide-react';
import type { DocumentKind } from '@/models/Document';

/**
 * Document config is DATA (mirrors config/categories.ts). Kinds, their labels/icons, and the
 * upload constraints live here so the UI and validation share one source of truth.
 */
export interface DocumentKindDef {
  id: DocumentKind;
  label: string;
  icon: LucideIcon;
}

export const documentKinds: Record<DocumentKind, DocumentKindDef> = {
  ticket: { id: 'ticket', label: 'Ticket', icon: Ticket },
  booking: { id: 'booking', label: 'Booking', icon: BedDouble },
  reservation: { id: 'reservation', label: 'Reservation', icon: CalendarCheck },
  insurance: { id: 'insurance', label: 'Insurance', icon: ShieldCheck },
  id: { id: 'id', label: 'ID / passport', icon: IdCard },
  map: { id: 'map', label: 'Map', icon: MapIcon },
  other: { id: 'other', label: 'Other', icon: File },
};

export const documentKindIds = Object.keys(documentKinds) as DocumentKind[];

export function getDocumentKind(id: string): DocumentKindDef {
  return documentKinds[id as DocumentKind] ?? documentKinds.other;
}

/** Max upload size. Keep in sync with the server-action body limit in next.config.ts. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

/** Allowed mime types — PDFs and common images only (PRD §5.9). */
export const ALLOWED_DOCUMENT_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/gif',
] as const;

export function isAllowedDocumentMime(mime: string): boolean {
  return (ALLOWED_DOCUMENT_MIME as readonly string[]).includes(mime);
}

/** `accept` attribute for the file input. */
export const DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_MIME.join(',');

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
