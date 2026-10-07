import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GoalsPage } from './GoalsPage';

vi.mock('../GoalsPage', () => ({ GoalsPage: () => <p>conteúdo das metas</p> }));

describe('page wrappers', () => {
  it('puts the goals under their own header', () => {
    render(<GoalsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Aonde você quer chegar' })).toBeInTheDocument();
    expect(screen.getByText('conteúdo das metas')).toBeInTheDocument();
  });
});
