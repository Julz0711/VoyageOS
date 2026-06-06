/**
 * Faint topographic contour texture, fixed behind all content. Pure decoration — purely
 * presentational and aria-hidden. Uses the ink color at very low opacity so it reads as a
 * subtle field-guide / map atmosphere without competing with content.
 */
export function AtlasTexture() {
  // Concentric "elevation" rings, two clusters.
  const rings = [22, 40, 58, 76, 94, 112, 130, 148];
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden text-ink"
      style={{ opacity: 0.025 }}
    >
      <svg className="absolute -right-24 -top-24 h-[520px] w-[520px]" viewBox="-160 -160 320 320">
        {rings.map((r, i) => (
          <ellipse
            key={`a-${r}`}
            cx={0}
            cy={0}
            rx={r}
            ry={r * 0.78}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            transform={`rotate(${-18 + i * 1.5})`}
          />
        ))}
      </svg>
      <svg
        className="absolute -bottom-32 -left-28 h-[480px] w-[480px]"
        viewBox="-160 -160 320 320"
      >
        {rings.map((r, i) => (
          <ellipse
            key={`b-${r}`}
            cx={0}
            cy={0}
            rx={r * 0.92}
            ry={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            transform={`rotate(${24 - i * 1.2})`}
          />
        ))}
      </svg>
    </div>
  );
}
