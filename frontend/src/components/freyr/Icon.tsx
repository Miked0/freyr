import { cx } from './format';

const ICONS = {
  overview: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  import: 'M12 3v12M7 10l5 5 5-5M4 15v5h16v-5',
  export: 'M12 15V3M7 8l5-5 5 5M4 15v5h16v-5',
  transactions: 'M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4',
  categories: 'M3 3h9l9 9-9 9-9-9zM7 7h2v2H7z',
  budget: 'M5 20V11M11 20V5M17 20v-6M3 20h18',
  goals: 'M5 21V3M5 4h13l-3 4.5 3 4.5H5',
  reports: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7',
  settings: 'M4 6h16M4 12h16M4 18h16M14 4v4M8 10v4M16 16v4',
  search: 'M4 4h11v11H4zM15 15l5 5',
  income: 'M7 17L17 7M9 7h8v8',
  expense: 'M17 7L7 17M7 9v8h8',
  balance: 'M3 7h18v13H3zM15 12h6v4h-6zM3 7l13-4v4',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  calendar: 'M4 5h16v15H4zM4 10h16M8 3v4M16 3v4',
  accounts: 'M3 9l9-6 9 6M5 9v9M10 9v9M14 9v9M19 9v9M3 21h18',
} as const;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
}

export function Icon({ name, size = 20, stroke = 1.6, className }: IconProps) {
  return (
    <svg className={cx('fr-icon', className)} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d={ICONS[name] ?? ICONS.overview} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}
