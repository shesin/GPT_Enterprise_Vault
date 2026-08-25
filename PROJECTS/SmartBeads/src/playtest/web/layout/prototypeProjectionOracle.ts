/**
 * Authoritative screen mapping copied from prototype/board4 SHOLO_GUTI_*_WITH_FEATURE.html.
 * Production projection must match these formulas on the prototype canvas sizes.
 */

export interface ProtoPoint {
  x: number;
  y: number;
}

export function protoSholo16(x: number, y: number, w: number, h: number): ProtoPoint {
  return {
    x: 44 + (y / 8) * (w - 88),
    y: 44 + ((10 - x) / 12) * (h - 88),
  };
}

export function protoSquare5(x: number, y: number, w: number, h: number): ProtoPoint {
  const pad = 44;
  return {
    x: pad + (y / 8) * (w - pad * 2),
    y: pad + ((8 - x) / 8) * (h - pad * 2),
  };
}

export function protoGridStretch(
  x: number,
  y: number,
  w: number,
  h: number,
  cols: number,
  rows: number,
): ProtoPoint {
  const pad = 44;
  const maxX = 2 * (cols - 1);
  const maxY = 2 * (rows - 1);
  return {
    x: pad + (y / maxY) * (w - pad * 2),
    y: pad + ((maxX - x) / maxX) * (h - pad * 2),
  };
}

export function protoPortrait45(x: number, y: number, w: number, h: number): ProtoPoint {
  const pad = 44;
  return {
    x: pad + (y / 8) * (w - pad * 2),
    y: pad + ((6 - x) / 6) * (h - pad * 2),
  };
}

/** 6×4 and 6×3×5 prototypes: square cells, x→canvasX, y→canvasY. */
export function protoSquareFit(
  x: number,
  y: number,
  w: number,
  h: number,
  cols: number,
  rows: number,
): ProtoPoint {
  const pad = 44;
  const maxX = 2 * (cols - 1);
  const maxY = 2 * (rows - 1);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const pitch = Math.min(innerW / maxX, innerH / maxY);
  const gridW = maxX * pitch;
  const gridH = maxY * pitch;
  const ox = pad + (innerW - gridW) / 2;
  const oy = pad + (innerH - gridH) / 2;
  return {
    x: ox + (x / maxX) * gridW,
    y: oy + (y / maxY) * gridH,
  };
}
