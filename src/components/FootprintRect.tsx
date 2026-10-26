import type { SVGProps } from 'react';

type Bounds = { x: number; y: number; w: number; h: number };
/** Map grid geometry to real SVG dimensions; SVG does not support w/h attributes. */
export default function FootprintRect({
  bounds,
  ...props
}: {
  bounds: Bounds;
} & Omit<SVGProps<SVGRectElement>, 'x' | 'y' | 'width' | 'height'>) {
  return <rect {...props} x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} />;
}
