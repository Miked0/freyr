import type { ReactNode } from 'react';

interface BentoCardProps {
  id: string;
  number: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function BentoCard({ id, number, title, description, children, className = '' }: BentoCardProps) {
  return (
    <section id={id} className={`scroll-mt-6 border-t border-line pt-8 sm:pt-10 pb-16 sm:pb-20 ${className}`}>
      <div className="grid gap-6 lg:grid-cols-[120px_1fr] mb-8 sm:mb-10">
        <p className="text-lg font-medium num text-ink-muted">{number}</p>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="max-w-[640px]">
            <h2 className="display text-[40px] sm:text-[52px]">{title}</h2>
            {description && <p className="mt-4 text-lg text-ink-muted leading-snug">{description}</p>}
          </div>
        </div>
      </div>
      <div className="lg:pl-[144px]">{children}</div>
    </section>
  );
}