'use client';

import { Document, Page, Text, View, Image, Font, pdf } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { theme } from '@/config/theme';
import { getCategory } from '@/config/categories';
import {
  formatMoney,
  getExpenseCategory,
  expensePhases,
  expensePhaseIds,
} from '@/config/expenses';
import { wmoColor } from '@/lib/weather/wmo';
import type { RecapSectionKey } from '@/config/recap';
import type { TripRecap } from '@/lib/trips/recap';
import { PdfIcon, categoryNode, expenseNode, wmoNode } from './pdf-icons';

const C = theme.colors;

export interface RecapMeta {
  name: string;
  destination: string;
  dateRange: string;
  dayCount: number;
  currency: string;
}

export interface RecapPhotoImage {
  dataUrl: string;
  label: string;
  /** Category id of the linked place — renders its icon before the caption. */
  category?: string;
}

// --- Brand fonts (loaded at render time; we fall back to Helvetica if they fail) ---
const FS = 'https://cdn.jsdelivr.net/npm/@fontsource';
let fontsRegistered = false;
function registerBrandFonts(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;
  Font.register({ family: 'Syne', src: `${FS}/syne/files/syne-latin-700-normal.woff` });
  Font.register({ family: 'DMSans', src: `${FS}/dm-sans/files/dm-sans-latin-400-normal.woff` });
  Font.register({ family: 'DMSansMed', src: `${FS}/dm-sans/files/dm-sans-latin-600-normal.woff` });
  Font.register({
    family: 'SpaceGrotesk',
    src: `${FS}/space-grotesk/files/space-grotesk-latin-500-normal.woff`,
  });
}

interface FontSet {
  title: string;
  head: string;
  body: string;
  num: string;
}
const BRAND: FontSet = { title: 'Syne', head: 'DMSansMed', body: 'DMSans', num: 'SpaceGrotesk' };
const FALLBACK: FontSet = {
  title: 'Helvetica-Bold',
  head: 'Helvetica-Bold',
  body: 'Helvetica',
  num: 'Helvetica-Bold',
};

// --- Colour helpers (PDF needs literal hex, not CSS vars) ---
const GROUP_HEX: Record<string, string> = {
  swim: C.mapSwim,
  hike: C.mapHike,
  culture: C.mapCulture,
  food: C.mapFood,
};
function categoryHex(id?: string): string {
  return GROUP_HEX[getCategory(id ?? 'practical').mapGroup] ?? C.muted;
}
const EXPENSE_HEX: Record<string, string> = {
  transport: C.mapFood,
  lodging: C.mapCulture,
  food: C.primary,
  activities: C.mapHike,
  shopping: C.mapSwim,
  fees: C.accent2,
  other: C.muted,
};
function expenseHex(id: string): string {
  return EXPENSE_HEX[id] ?? C.muted;
}
function phaseHex(id: 'pre' | 'during' | 'post'): string {
  return id === 'pre' ? C.mapCulture : id === 'during' ? C.mapSwim : C.mapFood;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function tint(hex: string, weight = 0.16): string {
  const c = hexToRgb(hex);
  const m = (vv: number) => Math.round(vv * weight + 255 * (1 - weight));
  const h = (vv: number) => m(vv).toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

function makeStyles(F: FontSet) {
  return {
    page: { paddingVertical: 36, paddingHorizontal: 40, fontSize: 10, color: C.ink, fontFamily: F.body },
    header: { backgroundColor: C.ink, borderRadius: 12, padding: 26, marginBottom: 26 },
    accentBar: { height: 5, width: 48, backgroundColor: C.accent, borderRadius: 3, marginBottom: 12 },
    title: { fontSize: 25, fontFamily: F.title, color: '#ffffff' },
    subtitle: { fontSize: 10, color: '#c9ccc9', marginTop: 6, fontFamily: F.body },

    section: { marginBottom: 22 },
    eyebrow: { fontSize: 8, letterSpacing: 1.5, color: C.muted, textTransform: 'uppercase' as const, fontFamily: F.head, marginBottom: 10 },
    muted: { color: C.muted },
    emptyNote: { fontSize: 9, color: C.muted },

    chip: { width: 22, height: 22, borderRadius: 11, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 9 },
    chipSm: { width: 18, height: 18, borderRadius: 9, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 8 },

    // Day cards
    dayBlock: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 10 },
    dayHead: { fontSize: 13, fontFamily: F.head },
    daySub: { fontSize: 9, color: C.muted, marginBottom: 9, fontFamily: F.body },
    entryRow: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 6 },
    entryTitle: { fontSize: 10.5, fontFamily: F.body, flex: 1 },

    // Two-column item grid (places)
    grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    itemCell: { width: '48%', flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 8 },
    itemTitle: { fontSize: 10, fontFamily: F.body, flex: 1 },

    // Roadtrips
    rtBlock: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginBottom: 8 },
    rtName: { fontSize: 11, fontFamily: F.head, marginBottom: 6 },
    rtStop: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 3 },

    // Map
    mapImg: { width: '100%', height: 230, objectFit: 'cover' as const, borderRadius: 8, borderWidth: 1, borderColor: C.border },

    // Forecast
    fcGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
    fcCell: { width: 60, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 8, alignItems: 'center' as const },
    fcDate: { fontSize: 8, color: C.muted, fontFamily: F.body },
    fcIcon: { marginVertical: 5 },
    fcTemp: { fontSize: 9, fontFamily: F.num },

    // Photos — polaroid frames
    photoGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10 },
    photoCell: { width: '30.8%' },
    polaroid: { borderWidth: 1, borderColor: C.border, borderRadius: 4, backgroundColor: '#ffffff', padding: 5, paddingBottom: 7 },
    photoImg: { width: '100%', height: 86, objectFit: 'cover' as const, borderRadius: 2 },
    photoCaption: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 5, gap: 3 },
    photoLabel: { fontSize: 7.5, color: C.ink, textAlign: 'center' as const, fontFamily: F.body },

    // Spendings
    panel: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 16 },
    spendTotal: { fontSize: 24, fontFamily: F.num, marginBottom: 16 },
    catRow: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 4 },
    catLabel: { fontSize: 10, fontFamily: F.body, flex: 1 },
    catAmount: { fontSize: 10, fontFamily: F.num },
    barTrack: { height: 5, borderRadius: 3, backgroundColor: '#eceeec', marginBottom: 10, marginLeft: 26 },
    barFill: { height: 5, borderRadius: 3 },
    phaseLine: { flexDirection: 'row' as const, gap: 16, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
    phaseItem: { flexDirection: 'row' as const, alignItems: 'center' as const },
    phaseDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },

    footer: { position: 'absolute' as const, bottom: 22, left: 40, right: 40, fontSize: 8, color: C.muted, textAlign: 'center' as const, fontFamily: F.body },
  };
}

type Styles = ReturnType<typeof makeStyles>;

function Eyebrow({ s, children }: { s: Styles; children: string }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

function RecapDocument({
  recap,
  meta,
  photos,
  mapImage,
  sections,
  fonts,
}: {
  recap: TripRecap;
  meta: RecapMeta;
  photos: RecapPhotoImage[];
  mapImage: string | null;
  sections: RecapSectionKey[];
  fonts: FontSet;
}) {
  const s = makeStyles(fonts);
  const { stats, budgetByPhase, budgetByCategory, days, items, roadtrips, map, forecast } = recap;
  const plannedDays = days.filter((d) => d.entries.length > 0);

  function renderSection(key: RecapSectionKey) {
    switch (key) {
      case 'items':
        return items.length === 0 ? null : (
          <View style={s.section}>
            <Eyebrow s={s}>Places</Eyebrow>
            <View style={s.grid}>
              {items.map((it) => {
                const hex = categoryHex(it.category);
                return (
                  <View key={it.id} style={s.itemCell}>
                    <View style={[s.chipSm, { backgroundColor: tint(hex) }]}>
                      <PdfIcon node={categoryNode(it.category)} size={10} color={hex} strokeWidth={2.2} />
                    </View>
                    <Text style={s.itemTitle}>
                      {it.title}
                      {it.areaLabel ? <Text style={s.muted}>  ·  {it.areaLabel}</Text> : null}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );

      case 'plan':
        return (
          <View style={s.section}>
            <Eyebrow s={s}>Day by day</Eyebrow>
            {plannedDays.length === 0 ? (
              <Text style={s.emptyNote}>No days were planned.</Text>
            ) : (
              plannedDays.map((d) => {
                const i = days.findIndex((x) => x.date === d.date);
                return (
                  <View key={d.date} style={s.dayBlock} wrap={false}>
                    <Text style={s.dayHead}>Day {i + 1}</Text>
                    <Text style={s.daySub}>{format(parseISO(d.date), 'EEEE d MMMM')}</Text>
                    {d.entries.map((e, j) => {
                      const hex = categoryHex(e.category);
                      return (
                        <View key={j} style={s.entryRow}>
                          <View style={[s.chip, { backgroundColor: tint(hex) }]}>
                            <PdfIcon node={categoryNode(e.category)} size={12} color={hex} strokeWidth={2.2} />
                          </View>
                          <Text style={s.entryTitle}>
                            {e.title}
                            {e.areaLabel ? <Text style={s.muted}>  ·  {e.areaLabel}</Text> : null}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })
            )}
          </View>
        );

      case 'roadtrips':
        return roadtrips.length === 0 ? null : (
          <View style={s.section}>
            <Eyebrow s={s}>Roadtrips</Eyebrow>
            {roadtrips.map((r) => (
              <View key={r.id} style={s.rtBlock} wrap={false}>
                <Text style={s.rtName}>{r.name}</Text>
                {r.stops.map((st, j) => {
                  const hex = categoryHex(st.category);
                  return (
                    <View key={j} style={s.rtStop}>
                      <View style={[s.chipSm, { backgroundColor: tint(hex) }]}>
                        <PdfIcon node={categoryNode(st.category)} size={9} color={hex} strokeWidth={2.2} />
                      </View>
                      <Text style={{ fontSize: 10 }}>{st.title}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        );

      case 'map':
        return map.points.length === 0 ? null : (
          <View style={s.section} wrap={false}>
            <Eyebrow s={s}>Map</Eyebrow>
            {mapImage ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={mapImage} style={s.mapImg} />
            ) : (
              <Text style={s.emptyNote}>{map.points.length} located places.</Text>
            )}
          </View>
        );

      case 'budget':
        return stats.budgetTotal === 0 ? null : (
          <View style={s.section} wrap={false}>
            <Eyebrow s={s}>Spendings</Eyebrow>
            <View style={s.panel}>
              <Text style={s.spendTotal}>{formatMoney(stats.budgetTotal, meta.currency)}</Text>
              {budgetByCategory.map((c) => {
                const hex = expenseHex(c.category);
                const pct = stats.budgetTotal > 0 ? (c.amount / stats.budgetTotal) * 100 : 0;
                return (
                  <View key={c.category}>
                    <View style={s.catRow}>
                      <View style={[s.chipSm, { backgroundColor: tint(hex) }]}>
                        <PdfIcon node={expenseNode(c.category)} size={10} color={hex} strokeWidth={2.2} />
                      </View>
                      <Text style={s.catLabel}>{getExpenseCategory(c.category).label}</Text>
                      <Text style={s.catAmount}>{formatMoney(c.amount, meta.currency)}</Text>
                    </View>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: hex }]} />
                    </View>
                  </View>
                );
              })}
              <View style={s.phaseLine}>
                {expensePhaseIds.map((id) => (
                  <View key={id} style={s.phaseItem}>
                    <View style={[s.phaseDot, { backgroundColor: phaseHex(id) }]} />
                    <Text style={{ fontSize: 9 }}>
                      {expensePhases[id].short} {formatMoney(budgetByPhase[id], meta.currency)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        );

      case 'forecast':
        return forecast.length === 0 ? null : (
          <View style={s.section}>
            <Eyebrow s={s}>Weather</Eyebrow>
            <View style={s.fcGrid}>
              {forecast.map((f) => (
                <View key={f.date} style={s.fcCell} wrap={false}>
                  <Text style={s.fcDate}>{format(parseISO(f.date), 'd MMM')}</Text>
                  <View style={s.fcIcon}>
                    <PdfIcon node={wmoNode(f.code)} size={15} color={wmoColor(f.code)} strokeWidth={2} />
                  </View>
                  <Text style={s.fcTemp}>
                    {f.tMax}° <Text style={s.muted}>{f.tMin}°</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'photos':
        return photos.length === 0 ? null : (
          <View style={s.section}>
            <Eyebrow s={s}>Photos</Eyebrow>
            <View style={s.photoGrid}>
              {photos.map((p, i) => (
                <View key={i} style={s.photoCell} wrap={false}>
                  <View style={s.polaroid}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image src={p.dataUrl} style={s.photoImg} />
                    <View style={s.photoCaption}>
                      {p.category ? (
                        <PdfIcon node={categoryNode(p.category)} size={8} color={categoryHex(p.category)} strokeWidth={2.2} />
                      ) : null}
                      <Text style={s.photoLabel}>{p.label || ' '}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
    }
  }

  return (
    <Document title={`${meta.name} — Recap`} author="VoyageOS">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.accentBar} />
          <Text style={s.title}>{meta.name}</Text>
          <Text style={s.subtitle}>
            {meta.destination}   ·   {meta.dateRange}   ·   {meta.dayCount} days
          </Text>
        </View>

        {sections.map((k) => (
          <View key={k}>{renderSection(k)}</View>
        ))}

        <Text style={s.footer} fixed>
          Generated by VoyageOS
        </Text>
      </Page>
    </Document>
  );
}

/** Builds the recap PDF (brand fonts, embedded photos + map) and downloads it. */
export async function downloadRecapPdf(
  recap: TripRecap,
  meta: RecapMeta,
  opts: { photos?: RecapPhotoImage[]; mapImage?: string | null; sections: RecapSectionKey[] },
): Promise<void> {
  registerBrandFonts();
  const photos = opts.photos ?? [];
  const mapImage = opts.mapImage ?? null;
  const sections = opts.sections;

  const props = { recap, meta, photos, mapImage, sections };
  let blob: Blob;
  try {
    blob = await pdf(<RecapDocument {...props} fonts={BRAND} />).toBlob();
  } catch {
    blob = await pdf(<RecapDocument {...props} fonts={FALLBACK} />).toBlob();
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meta.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'trip'}-recap.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
