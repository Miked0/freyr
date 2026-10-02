import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeltaChip } from './DeltaChip';

function chip(ui: React.ReactElement) {
  return render(ui).container.firstChild as HTMLElement;
}

describe('DeltaChip', () => {
  it('shows a rise as good with an up arrow', () => {
    const el = chip(<DeltaChip value={8.24} />);
    expect(el.tagName).toBe('SPAN');
    expect(el).toHaveClass('fr-chip', 'is-good');
    expect(el).toHaveTextContent('↑ +8,2%');
  });

  it('shows a fall as bad with a minus sign', () => {
    const el = chip(<DeltaChip value={-2.4} />);
    expect(el).toHaveClass('is-bad');
    expect(el).toHaveTextContent('↓ −2,4%');
  });

  it('inverts the meaning for spending and marks the hero variant', () => {
    expect(chip(<DeltaChip value={2.4} invert />)).toHaveClass('is-bad');
    expect(chip(<DeltaChip value={-2.4} invert onHero />)).toHaveClass('is-good', 'is-hero');
  });
});
