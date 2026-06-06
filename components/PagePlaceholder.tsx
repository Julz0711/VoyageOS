export function PagePlaceholder({
  title,
  description,
  eyebrow = 'Coming soon',
}: {
  title: string;
  description: string;
  eyebrow?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1 text-muted">{eyebrow}</p>
        <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
        <p className="mx-auto max-w-md leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}
