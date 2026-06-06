'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Triggers the browser print dialog (→ Save as PDF). Hidden in the printout itself. */
export function PrintButton() {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" aria-hidden /> Print
    </Button>
  );
}
