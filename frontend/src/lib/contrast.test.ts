import { describe, it, expect } from 'vitest';
import { contrastRatio } from './contrast';

describe('contrastRatio', () => {
  it('is 21:1 between black and white, in either order', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
  });

  it('matches the WCAG reference for the brand primary on the light surface', () => {
    expect(contrastRatio('#5B5A96', '#F7F6F3')).toBeCloseTo(5.8, 1);
  });

  it('blends a translucent foreground over the background before measuring', () => {
    // 45% ink over paper reads as a mid grey, not as solid ink.
    expect(contrastRatio('rgba(30, 28, 26, 0.45)', '#F7F6F3')).toBeCloseTo(2.81, 1);
    expect(contrastRatio('rgb(30 28 26 / 0.5)', '#F7F6F3')).toBeCloseTo(3.23, 1);
  });

  it('accepts short hex', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
  });
});
