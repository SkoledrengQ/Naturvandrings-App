import { useEffect } from "react";

type Props = { lat?: number; lng?: number; panTo?: (lat: number, lng: number) => void };

export default function FollowUserSmooth({ lat, lng, panTo }: Props) {
  useEffect(() => { if (lat != null && lng != null && panTo) panTo(lat, lng); }, [lat, lng, panTo]);
  return null;
}
