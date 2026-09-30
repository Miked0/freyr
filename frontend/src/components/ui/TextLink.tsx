import React from 'react';

interface TextLinkProps {
  href: string;
  children: React.ReactNode;
}

const TextLink: React.FC<TextLinkProps> = ({ href, children, ...props }) => (
  <a
    href={href}
    className={`
      relative inline-block font-medium text-brand-primary
      transition-colors duration-160 ease-out
      hover:opacity-70 focus-visible:outline-none
      focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2
      focus-visible:ring-offset-surface
    `}
    {...props}
  >
    {children}
    <span
      className={`
        absolute bottom-[-0.3em] left-0 right-0 h-[1px]
        bg-current scale-x-0 origin-left
        transition-transform duration-200 ease-out
        hover:scale-x-100 focus-visible:scale-x-100
      `}
      aria-hidden="true"
    />
  </a>
);

export default TextLink;