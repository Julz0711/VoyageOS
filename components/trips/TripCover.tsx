import { MapPin } from 'lucide-react';

function coordLabel(lat: number, lng: number): string {
  const ns = `${lat >= 0 ? 'N' : 'S'} ${Math.abs(lat).toFixed(2)}°`;
  const ew = `${lng >= 0 ? 'E' : 'W'} ${Math.abs(lng).toFixed(2)}°`;
  return `${ns} · ${ew}`;
}

/**
 * Decorative cover band for trip cards — a topographic gradient evoking a destination photo
 * without needing real imagery (keyless). Colors come from theme CSS vars.
 */
export function TripCover({
  destination,
  lat,
  lng,
  badge,
  coverImage,
  className = '',
}: {
  destination: string;
  lat: number;
  lng: number;
  badge?: string;
  coverImage?: string;
  className?: string;
}) {
  const style: React.CSSProperties = coverImage
    ? {
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, var(--vos-color-primary) 15%, transparent), color-mix(in srgb, var(--vos-color-primary) 70%, transparent)), url("${coverImage.replace(/"/g, '')}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background:
          'linear-gradient(135deg, var(--vos-color-primary) 0%, var(--vos-color-map-swim) 58%, var(--vos-color-accent) 130%)',
      };

  return (
    <div className={`relative overflow-hidden text-primary-foreground ${className}`} style={style}>
      {/* contour texture (gradient cover only) */}
      {!coverImage && (
        <svg
          aria-hidden
          className="absolute -right-10 -top-16 h-64 w-64 text-primary-foreground"
          viewBox="-160 -160 320 320"
          style={{ opacity: 0.16 }}
        >
          {[34, 58, 82, 106, 130, 154].map((r, i) => (
            <ellipse
              key={r}
              cx={0}
              cy={0}
              rx={r}
              ry={r * 0.8}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.25}
              transform={`rotate(${-16 + i * 2})`}
            />
          ))}
        </svg>
      )}

      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary-foreground/85">
            <MapPin className="size-3" aria-hidden />
            {coordLabel(lat, lng)}
          </span>
          {badge && (
            <span className="rounded-pill bg-primary-foreground/15 px-2 py-0.5 font-mono text-[10px] backdrop-blur-sm">
              {badge}
            </span>
          )}
        </div>
        <span className="font-display text-lg font-semibold leading-tight">{destination}</span>
      </div>
    </div>
  );
}
