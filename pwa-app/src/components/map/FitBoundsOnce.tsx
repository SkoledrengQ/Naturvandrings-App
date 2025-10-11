import { useEffect } from "react";

type Props = { bounds?: [[number, number], [number, number]]; fit?: (b: any) => void };

export default function FitBoundsOnce({ bounds, fit }: Props) {
  useEffect(() => { if (bounds && fit) fit(bounds); }, [bounds, fit]);
  return null;
}
