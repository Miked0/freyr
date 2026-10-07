import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GoogleAccount } from './GoogleAccount';

describe('GoogleAccount', () => {
  it('offers to connect Google when the account is not linked yet', () => {
    render(<GoogleAccount linked={false} available />);

    expect(screen.getByRole('link', { name: 'Conectar conta Google' })).toHaveAttribute('href', '/api/auth/google');
  });

  it('says the account is connected once linked', () => {
    render(<GoogleAccount linked available />);

    expect(screen.getByText(/conectada/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('explains when the Google account already belongs to another login', () => {
    render(<GoogleAccount linked={false} available conflict />);

    expect(screen.getByRole('alert')).toHaveTextContent('já está ligada a outra conta');
  });

  it('shows nothing when Google login is not set up and the account is not linked', () => {
    const { container } = render(<GoogleAccount linked={false} available={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
