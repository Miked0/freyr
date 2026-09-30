import React from 'react';
import { ArrowRight } from 'lucide-react';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'light' | 'dark';
  icon?: React.ReactNode;
}

const TONES = {
  // Disabled on a dark surface: an outlined ghost instead of a washed-out grey block.
  light: 'bg-surface text-text border border-transparent hover:bg-white disabled:bg-transparent disabled:text-on-text-muted disabled:border-on-text-line disabled:opacity-100',
  dark: 'bg-text text-surface hover:bg-text/85',
};

const PillButton: React.FC<PillButtonProps> = ({ tone = 'dark', icon, className = '', children, ...props }) => (
  <button
    type="button"
    className={`group inline-flex items-center gap-4 rounded-full pl-6 pr-1.5 py-1.5 text-[15px] font-medium transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${TONES[tone]} ${className}`}
    {...props}
  >
    <span className="whitespace-nowrap">{children}</span>
    <span className="w-10 h-10 rounded-full bg-brand-primary text-surface flex items-center justify-center transition-transform group-hover:translate-x-0.5">
      {icon ?? <ArrowRight className="h-4 w-4" />}
    </span>
  </button>
);

export default PillButton;