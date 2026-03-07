import parivahanLogo from "@/assets/Parivahan.svg";

interface ParivahanIconProps {
  className?: string;
  /** Height in pixels; width scales to logo aspect ratio. */
  size?: number;
}

/** Parivahan Sewa / MoRTH logo (Ministry of Road Transport & Highways). Official logo from Wikimedia Commons. */
export function ParivahanIcon({ className = "", size = 20 }: ParivahanIconProps) {
  const width = Math.round((size * 1576) / 718);
  return (
    <img
      src={parivahanLogo}
      alt="Parivahan Sewa"
      width={width}
      height={size}
      className={className}
      loading="lazy"
      aria-hidden
      style={{ imageRendering: "auto" }}
    />
  );
}
