import React from 'react';

interface BentoCardProps {
  children: React.ReactNode;
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  className?: string;
}

const BentoCard: React.FC<BentoCardProps> = ({ children, span = 12, className = '' }) => (
  <article
    className={`
      grid-col-span-${span}
      bg-surface border border-line rounded-[8px] p-6
      transition-colors duration-160 ease-out
      hover:border-text/20
      ${className}
    `}
  >
    {children}
  </article>
);

export default BentoCard;