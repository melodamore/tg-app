import { Pencil, PaintBucket, Pipette, Eraser, Ruler, FlipHorizontal, MousePointer2, Square, Circle, Triangle, Diamond, Pentagon, Hexagon, Octagon, Star, ArrowRight, RectangleHorizontal, Type } from 'lucide-react';
import { hslToHex } from '../utils/colors';

export const SIZES = [8, 16, 32, 64, 128, 256, 512, 1024, 2048];

export const TOOLS = [
  { id: 'pencil', icon: Pencil, label: 'Draw' },
  { id: 'bucket', icon: PaintBucket, label: 'Fill' },
  { id: 'eyedropper', icon: Pipette, label: 'Pick' },
  { id: 'eraser', icon: Eraser, label: 'Erase' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'line', icon: Ruler, label: 'Line' },
  { id: 'rect', icon: Square, label: 'Rect' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'triangle', icon: Triangle, label: 'Triangle' },
  { id: 'diamond', icon: Diamond, label: 'Diamond' },
  { id: 'pentagon', icon: Pentagon, label: 'Pentagon' },
  { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
  { id: 'octagon', icon: Octagon, label: 'Octagon' },
  { id: 'star', icon: Star, label: 'Star' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'parallelogram', icon: RectangleHorizontal, label: 'Parallelogram' },
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'symmetry', icon: FlipHorizontal, label: 'Mirror' }
];

export const SHAPE_TOOLS = ['rect', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star', 'arrow', 'parallelogram'];

export const PALETTES = Array.from({length: 52}, (_, i) => {
    const h = (i * 137.5) % 360;
    return {
        name: `Theme ${i+1}`,
        colors: [
            hslToHex(h, 80, 15), hslToHex(h, 80, 40), hslToHex(h, 80, 65), hslToHex(h, 80, 90),
            hslToHex((h+45)%360, 70, 50), hslToHex((h+180)%360, 70, 50), '#000000', '#ffffff'
        ]
    }
});
