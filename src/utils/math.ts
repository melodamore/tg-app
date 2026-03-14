export const getBresenhamPoints = (x0: number, y0: number, x1: number, y1: number) => {
  const points = [];
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1, sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;
  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return points;
};

export const getPolygonPoints = (vertices: {x: number, y: number}[], filled: boolean) => {
  const points: {x: number, y: number}[] = [];
  for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];
      points.push(...getBresenhamPoints(p1.x, p1.y, p2.x, p2.y));
  }
  if (filled) {
      let minY = Math.min(...vertices.map(v => v.y));
      let maxY = Math.max(...vertices.map(v => v.y));
      for (let y = minY; y <= maxY; y++) {
          let nodes = [];
          let j = vertices.length - 1;
          for (let i = 0; i < vertices.length; i++) {
              let vi = vertices[i], vj = vertices[j];
              if ((vi.y < y && vj.y >= y) || (vj.y < y && vi.y >= y)) {
                  nodes.push(Math.floor(vi.x + (y - vi.y) / (vj.y - vi.y) * (vj.x - vi.x)));
              }
              j = i;
          }
          nodes.sort((a, b) => a - b);
          for (let i = 0; i < nodes.length; i += 2) {
              if (nodes[i+1] !== undefined) {
                  for (let x = nodes[i]; x <= nodes[i+1]; x++) points.push({x, y});
              }
          }
      }
  }
  return points;
};

export const getCirclePoints = (xc: number, yc: number, x1: number, y1: number, filled: boolean) => {
  const r = Math.floor(Math.hypot(x1 - xc, y1 - yc));
  const points = [];
  if (r === 0) return [{x: xc, y: yc}];
  if (filled) {
      for (let y = -r; y <= r; y++) {
          for (let x = -r; x <= r; x++) {
              if (x*x + y*y <= r*r) points.push({x: xc + x, y: yc + y});
          }
      }
  } else {
      let x = 0, y = r, d = r - 1;
      while (y >= x) {
          points.push(
              {x: xc+x, y: yc+y}, {x: xc-x, y: yc+y}, {x: xc+x, y: yc-y}, {x: xc-x, y: yc-y},
              {x: xc+y, y: yc+x}, {x: xc-y, y: yc+x}, {x: xc+y, y: yc-x}, {x: xc-y, y: yc-x}
          );
          if (d >= 2 * x) { d -= 2 * x + 1; x++; }
          else if (d < 2 * (r - y)) { d += 2 * y - 1; y--; }
          else { d += 2 * (y - x - 1); y--; x++; }
      }
  }
  return points;
};

export const getShapeVertices = (tool: string, x0: number, y0: number, x1: number, y1: number) => {
    const cx = Math.floor((x0 + x1) / 2);
    const cy = Math.floor((y0 + y1) / 2);
    const rx = Math.abs(x1 - x0) / 2;
    const ry = Math.abs(y1 - y0) / 2;

    const getRegularPolygon = (sides: number, rotation = -Math.PI/2) => {
        const v = [];
        for (let i = 0; i < sides; i++) {
            const angle = rotation + (i * 2 * Math.PI / sides);
            v.push({ x: Math.floor(cx + rx * Math.cos(angle)), y: Math.floor(cy + ry * Math.sin(angle)) });
        }
        return v;
    };

    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);

    switch (tool) {
        case 'rect': return [{x: minX, y: minY}, {x: maxX, y: minY}, {x: maxX, y: maxY}, {x: minX, y: maxY}];
        case 'triangle': return [{x: cx, y: minY}, {x: maxX, y: maxY}, {x: minX, y: maxY}];
        case 'diamond': return [{x: cx, y: minY}, {x: maxX, y: cy}, {x: cx, y: maxY}, {x: minX, y: cy}];
        case 'pentagon': return getRegularPolygon(5);
        case 'hexagon': return getRegularPolygon(6);
        case 'octagon': return getRegularPolygon(8, -Math.PI/2 + Math.PI/8);
        case 'parallelogram': {
            const offset = Math.floor(rx * 0.5);
            return [{x: minX + offset, y: minY}, {x: maxX, y: minY}, {x: maxX - offset, y: maxY}, {x: minX, y: maxY}];
        }
        case 'arrow': return [
            {x: minX, y: Math.floor(cy - ry/2)}, {x: cx, y: Math.floor(cy - ry/2)}, {x: cx, y: minY},
            {x: maxX, y: cy}, {x: cx, y: maxY}, {x: cx, y: Math.floor(cy + ry/2)}, {x: minX, y: Math.floor(cy + ry/2)}
        ];
        case 'star': {
            const v = [];
            for (let i = 0; i < 10; i++) {
                const angle = -Math.PI/2 + (i * Math.PI / 5);
                const rRatio = i % 2 === 0 ? 1 : 0.4;
                v.push({ x: Math.floor(cx + rx * rRatio * Math.cos(angle)), y: Math.floor(cy + ry * rRatio * Math.sin(angle)) });
            }
            return v;
        }
        default: return [];
    }
};