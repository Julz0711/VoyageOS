import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/brand/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <LogoMark className="mb-5 size-12" />
      <p className="eyebrow text-muted">Error 404</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Off the map</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        This page doesn’t exist. Let’s get you back on course.
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
