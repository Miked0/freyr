/**
 * The mountain at the foot of the sign-in sky: straight strokes like carved runes, with Fehu (ᚠ) cut into the
 * main peak. Two opaque layers hide the sky's ridge lines behind them; the summit edge catches the aurora.
 * Decoration only, so it stays out of the accessibility tree.
 */
export function SkyPeak({ rune = true }: { rune?: boolean }) {
  return (
    <svg className="fr-peak" viewBox="0 0 900 260" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
      <path className="fr-peak-far" d="M0 260L110 236L250 196L380 112L470 148L560 92L640 124L760 54L860 110L900 96L900 260Z" />
      <path className="fr-peak-near" d="M120 260L260 222L330 168L420 192L520 116L600 152L680 30L740 90L790 70L900 150L900 260Z" />
      <path className="fr-peak-edge" d="M520 116L600 152L680 30L740 90L790 70L900 150" />
      {rune ? <path className="fr-peak-rune" d="M665 260V96M665 132l46-27M665 180l46-27" /> : null}
    </svg>
  );
}
