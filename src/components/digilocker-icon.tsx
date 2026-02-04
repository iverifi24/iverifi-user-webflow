import digilockerLogo from "@/assets/DigiLocker.svg";

interface DigiLockerIconProps {
  className?: string;
  /** Height in pixels; width scales to logo aspect ratio. */
  size?: number;
}

/**
 * Official DigiLocker logo (MeitY, Government of India).
 * Uses local DigiLocker.svg (viewBox ~212×52).
 */
export function DigiLockerIcon({ className = "", size = 20 }: DigiLockerIconProps) {
  const width = Math.round((size * 211.96) / 51.84);
  return (
    <img
      src={digilockerLogo}
      alt="DigiLocker"
      width={width}
      height={size}
      className={className}
      loading="lazy"
      aria-hidden
      style={{ imageRendering: "auto" }}
    />
  );
}
