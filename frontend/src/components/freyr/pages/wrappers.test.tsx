import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfilePage } from './ProfilePage';
import { GoalsPage } from './GoalsPage';

vi.mock('../ProfilePage', () => ({ ProfilePage: () => <p>conteúdo do perfil</p> }));
vi.mock('../GoalsPage', () => ({ GoalsPage: () => <p>conteúdo das metas</p> }));

describe('page wrappers', () => {
  it('puts the profile under its own header', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Perfil e preferências' })).toBeInTheDocument();
    expect(screen.getByText('conteúdo do perfil')).toBeInTheDocument();
  });

  it('puts the goals under their own header', () => {
    render(<GoalsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Aonde você quer chegar' })).toBeInTheDocument();
    expect(screen.getByText('conteúdo das metas')).toBeInTheDocument();
  });
});
