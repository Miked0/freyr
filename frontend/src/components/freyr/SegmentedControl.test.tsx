import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  it('renders a labelled radiogroup with the current option checked', () => {
    render(
      <SegmentedControl label="Visão do fluxo" value="monthly"
        options={[{ value: 'monthly', label: 'Mensal' }, { value: 'yearly', label: 'Anual' }]} />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Visão do fluxo' })).toHaveClass('fr-seg');
    const on = screen.getByRole('radio', { name: 'Mensal' });
    expect(on).toHaveAttribute('aria-checked', 'true');
    expect(on).toHaveClass('fr-seg-opt', 'is-on');
    expect(screen.getByRole('radio', { name: 'Anual' })).toHaveAttribute('aria-checked', 'false');
  });

  it('accepts plain string options, defaults the label and reports changes', () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={['7d', '30d']} value="7d" onChange={onChange} />);
    expect(screen.getByRole('radiogroup', { name: 'Período' })).toBeInTheDocument();
    const btn = screen.getByRole('radio', { name: '30d' });
    expect(btn).toHaveAttribute('type', 'button');
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith('30d');
  });
});
