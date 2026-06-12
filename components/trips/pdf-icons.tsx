'use client';

import { Svg, Path, Circle, Line, Rect, Polyline, Polygon, Ellipse } from '@react-pdf/renderer';
import {
  Sunrise,
  Car,
  UtensilsCrossed,
  Landmark,
  Waves,
  Mountain,
  Telescope,
  Sailboat,
  Zap,
  Bike,
  Castle,
  BedDouble,
  ShoppingBag,
  Wine,
  Trees,
  Info,
  StickyNote,
  Plane,
  Ticket,
  Receipt,
  MoreHorizontal,
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  type IconNode,
} from 'lucide';

const CATEGORY_NODES: Record<string, IconNode> = {
  'day-trip': Sunrise,
  'road-trip': Car,
  restaurant: UtensilsCrossed,
  culture: Landmark,
  swim: Waves,
  hike: Mountain,
  viewpoint: Telescope,
  'on-the-water': Sailboat,
  activity: Zap,
  bike: Bike,
  history: Castle,
  accommodation: BedDouble,
  shopping: ShoppingBag,
  nightlife: Wine,
  nature: Trees,
  practical: Info,
};

const EXPENSE_NODES: Record<string, IconNode> = {
  transport: Plane,
  lodging: BedDouble,
  food: UtensilsCrossed,
  activities: Ticket,
  shopping: ShoppingBag,
  fees: Receipt,
  other: MoreHorizontal,
};

export function categoryNode(id?: string): IconNode {
  return (id && CATEGORY_NODES[id]) || StickyNote;
}

export function expenseNode(id?: string): IconNode {
  return (id && EXPENSE_NODES[id]) || MoreHorizontal;
}

/** WMO weather code → lucide icon node (mirrors lib/weather/wmo wmoInfo). */
export function wmoNode(code: number): IconNode {
  if (code === 0) return Sun;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  return Cloud;
}

/** Renders a lucide icon node as a react-pdf SVG (stroke-based, 24×24 viewBox like lucide). */
export function PdfIcon({
  node,
  size = 12,
  color = '#000000',
  strokeWidth = 2,
}: {
  node: IconNode;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const common = {
    stroke: color,
    strokeWidth,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  // Coerce lucide's possibly-undefined SVG attrs to strings the react-pdf primitives accept.
  const v = (x: string | number | undefined, fallback = '0'): string => (x == null ? fallback : String(x));

  return (
    <Svg viewBox="0 0 24 24" style={{ width: size, height: size }}>
      {node.map(([tag, a], i) => {
        switch (tag) {
          case 'path':
            return <Path key={i} d={v(a.d, '')} {...common} />;
          case 'circle':
            return <Circle key={i} cx={v(a.cx)} cy={v(a.cy)} r={v(a.r)} {...common} />;
          case 'line':
            return <Line key={i} x1={v(a.x1)} y1={v(a.y1)} x2={v(a.x2)} y2={v(a.y2)} {...common} />;
          case 'rect':
            return (
              <Rect key={i} x={v(a.x)} y={v(a.y)} width={v(a.width)} height={v(a.height)} rx={v(a.rx)} {...common} />
            );
          case 'polyline':
            return <Polyline key={i} points={v(a.points, '')} {...common} />;
          case 'polygon':
            return <Polygon key={i} points={v(a.points, '')} {...common} />;
          case 'ellipse':
            return <Ellipse key={i} cx={v(a.cx)} cy={v(a.cy)} rx={v(a.rx)} ry={v(a.ry)} {...common} />;
          default:
            return null;
        }
      })}
    </Svg>
  );
}
