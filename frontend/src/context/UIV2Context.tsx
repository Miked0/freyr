import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type UIV2ContextValue = {
  isUIV2: boolean;
  toggleUIV2: () => void;
  setUIV2: (value: boolean) => void;
};

const UIV2Context = createContext<UIV2ContextValue | undefined>(undefined);

export function UIV2Provider({ children }: { children: ReactNode }) {
  const [isUIV2, setIsUIV2] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ui_v2');
      return stored === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('ui_v2', String(isUIV2));
  }, [isUIV2]);

  const toggleUIV2 = () => setIsUIV2(prev => !prev);
  const setUIV2 = (value: boolean) => setIsUIV2(value);

  return (
    <UIV2Context.Provider value={{ isUIV2, toggleUIV2, setUIV2 }}>
      {children}
    </UIV2Context.Provider>
  );
}

export function useUIV2(): UIV2ContextValue {
  const context = useContext(UIV2Context);
  if (!context) {
    throw new Error('useUIV2 must be used within a UIV2Provider');
  }
  return context;
}