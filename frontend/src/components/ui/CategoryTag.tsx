import React from 'react';

interface CategoryTagProps {
  category: string;
}

const CategoryTag: React.FC<CategoryTagProps> = ({ category }) => (
  <span
    className={`
      inline-flex items-center
      text-[11px] font-semibold tracking-[0.06em]
      text-ink-muted
      px-2 py-0.5
      border border-line rounded-[4px]
    `}
    aria-label={`Categoria: ${category}`}
  >
    [ {category.toUpperCase()} ]
  </span>
);

export default CategoryTag;