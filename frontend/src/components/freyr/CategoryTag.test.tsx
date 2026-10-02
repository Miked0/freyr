import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryTag } from './CategoryTag';

describe('CategoryTag', () => {
  it('wraps the label in brackets with the tone class', () => {
    const { container } = render(<CategoryTag tone="muted">Moradia</CategoryTag>);
    expect(container.firstChild).toHaveClass('fr-tag', 'fr-tag-muted');
    expect(container.firstChild).toHaveTextContent('[ Moradia ]');
  });

  it('has no tone class by default', () => {
    const { container } = render(<CategoryTag>Lazer</CategoryTag>);
    expect((container.firstChild as Element).className).toBe('fr-tag');
  });
});
