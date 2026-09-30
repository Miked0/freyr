import React from 'react';

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZES = {
  sm: { rune: 'text-[20px]', text: 'text-[14px]' },
  md: { rune: 'text-[28px]', text: 'text-[18px]' },
  lg: { rune: 'text-[40px]', text: 'text-[24px]' },
  xl: { rune: 'text-[56px]', text: 'text-[32px]' },
};

const Wordmark: React.FC<WordmarkProps> = ({ size = 'md' }) => {
  const s = SIZES[size];

  return (
    <span
      className="inline-flex items-baseline gap-1 select-none"
      aria-label="freyr"
    >
      <span className={`${s.rune} text-brand-primary font-medium`} aria-hidden="true">
        ᚠ
      </span>
      <span className={`${s.text} font-sans font-medium tracking-[-0.02em]`}>
        fr
        <em className="font-serif italic not-italic font-normal">e</em>
        yr
      </span>
    </span>
  );
};

export default Wordmark;