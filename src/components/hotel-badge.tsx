interface HotelBadgeProps {
  name: string;
  logoUrl?: string | null;
}

export function HotelBadge({ name, logoUrl }: HotelBadgeProps) {
  if (!name && !logoUrl) return null;
  return (
    <div className="flex justify-center">
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="h-10 w-auto object-contain" />
      ) : (
        <span className="text-sm font-medium text-muted-foreground">🏨 {name}</span>
      )}
    </div>
  );
}
