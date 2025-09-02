import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type HeaderVariant = "solid" | "overlay";

type HeaderState = {
  title: string | null;
  setTitle: (t: string | null) => void;
  rightNode: ReactNode | null;
  setRightNode: (n: ReactNode | null) => void;
  variant: HeaderVariant;
  setVariant: (v: HeaderVariant) => void;
};

const HeaderCtx = createContext<HeaderState | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const [rightNode, setRightNode] = useState<ReactNode | null>(null);
  const [variant, setVariant] = useState<HeaderVariant>("solid");

  const value = useMemo(
    () => ({ title, setTitle, rightNode, setRightNode, variant, setVariant }),
    [title, rightNode, variant]
  );

  return <HeaderCtx.Provider value={value}>{children}</HeaderCtx.Provider>;
}

export function useHeader() {
  const ctx = useContext(HeaderCtx);
  if (!ctx) throw new Error("useHeader must be used within HeaderProvider");
  return ctx;
}
