import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { routeFromHash, routeHref, useRoute } from './useRoute';

function setHash(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

describe('routeFromHash', () => {
  it.each([
    ['', 'overview'],
    ['#', 'overview'],
    ['#/', 'overview'],
    ['#/transacoes', 'transactions'],
    ['#/categorias', 'categories'],
    ['#/perfil', 'profile'],
    ['#/perfil/configuracoes', 'settings'],
    ['#/metas', 'goals'],
    ['#/nao-existe', 'overview'],
    ['#/transacoes/123', 'overview'],
  ])('maps %j to %s', (hash, route) => {
    expect(routeFromHash(hash)).toBe(route);
  });

  it('accepts the legacy anchors without the slash', () => {
    expect(routeFromHash('#transacoes')).toBe('transactions');
    expect(routeFromHash('#categorias')).toBe('categories');
  });
});

describe('routeHref', () => {
  it('builds the hash link of each route', () => {
    expect(routeHref('overview')).toBe('#/');
    expect(routeHref('transactions')).toBe('#/transacoes');
    expect(routeHref('categories')).toBe('#/categorias');
    expect(routeHref('profile')).toBe('#/perfil');
    expect(routeHref('settings')).toBe('#/perfil/configuracoes');
  });
});

describe('useRoute', () => {
  afterEach(() => setHash(''));

  it('starts on the route in the current hash', () => {
    window.location.hash = '#/categorias';
    const { result } = renderHook(() => useRoute());
    expect(result.current.route).toBe('categories');
  });

  it('follows hashchange events', () => {
    const { result } = renderHook(() => useRoute());
    act(() => setHash('#/transacoes'));
    expect(result.current.route).toBe('transactions');
    act(() => setHash('#/qualquer'));
    expect(result.current.route).toBe('overview');
  });

  it('rewrites legacy and unknown hashes to the canonical link', () => {
    window.location.hash = '#transacoes';
    const { result } = renderHook(() => useRoute());
    expect(result.current.route).toBe('transactions');
    expect(window.location.hash).toBe('#/transacoes');
    act(() => setHash('#/nao-existe'));
    expect(window.location.hash).toBe('#/');
  });

  it('navigates by writing the hash', () => {
    const { result } = renderHook(() => useRoute());
    act(() => result.current.navigate('profile'));
    expect(window.location.hash).toBe('#/perfil');
    expect(result.current.route).toBe('profile');
  });
});
