export interface WordmarkProps {
  size?: number;
  showName?: boolean;
}

export function Wordmark({ size = 24, showName = true }: WordmarkProps) {
  return (
    <span className="fr-wordmark" style={{ fontSize: size + 'px' }}>
      <svg viewBox="0 0 16 24" width={size * 0.66} height={size} aria-hidden="true">
        <path d="M3 23V1M3 9l10-6M3 16l10-6" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="square" />
      </svg>
      {showName ? <span>FREYR</span> : null}
    </span>
  );
}
