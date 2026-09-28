import React from 'react';
import { ArrowRight } from 'lucide-react';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'light' | 'dark';
  icon?: React.ReactNode;
}

const TONES = {
  light: 'bg-bg text-ink hover:bg-white',
  dark: 'bg-ink text-bg hover:bg-ink/85',
};

const PillButton: React.FC<PillButtonProps> = ({ tone = 'dark', icon, className = '', children, ...props }) => (
  <button
    type="button"
    className={`group inline-flex items-center gap-4 rounded-full pl-6 pr-1.5 py-1.5 text-[15px] font-medium transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${TONES[tone]} ${className}`}
    {...props}
  >
    <span className="whitespace-nowrap">{children}</span>
    <span className="w-10 h-10 rounded-full bg-accent text-bg flex items-center justify-center transition-transform group-hover:translate-x-0.5">
      {icon ?? <ArrowRight className="h-4 w-4" />}
    </span>
  </button>
);

export default PillButton;
