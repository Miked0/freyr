import { createContext, useContext, useState, type ReactNode } from 'react';

interface UIV2ContextType {
  enabled: boolean;
  toggle: () => void;
}

const UIV2Context = createContext<UIV2ContextType | undefined>(undefined);

export function UIV2Provider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ui_v2') === 'true';
    }
    return false;
  });

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('ui_v2', String(next));
  };

  return (
    <UIV2Context.Provider value={{ enabled, toggle }}>
      {children}
    </UIV2Context.Provider>
  );
}

export function useUIV2() {
  const ctx = useContext(UIV2Context);
  if (!ctx) throw new Error('useUIV2 must be used within UIV2Provider');
  return ctx;
}