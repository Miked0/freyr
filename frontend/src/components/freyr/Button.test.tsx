import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('is a primary type=button by default', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Importar extrato</Button>);
    const btn = screen.getByRole('button', { name: 'Importar extrato' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveClass('fr-btn', 'fr-btn-primary');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies the variant and extra classes', () => {
    render(<Button variant="outline" className="extra">Exportar</Button>);
    expect(screen.getByRole('button')).toHaveClass('fr-btn', 'fr-btn-outline', 'extra');
  });
});
