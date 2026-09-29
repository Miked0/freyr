import { describe, it, expect } from 'vitest';
import { pieSlices } from './categoryColors';

const total = (category: string, value: number) => ({ category, total: value, count: 1, share: 0 });

describe('pieSlices', () => {
  it('folds categories without a colour of their own into a single Outros slice', () => {
    const slices = pieSlices([total('Moradia', 900), total('Salário', 300), total('Outros', 100), total('Educação', 200)]);

    expect(slices).toEqual([
      { category: 'Moradia', total: 900, share: 0.6, color: '#4F4CB0' },
      { category: 'Outros', total: 600, share: 0.4, color: '#9E5718' },
    ]);
  });
});
