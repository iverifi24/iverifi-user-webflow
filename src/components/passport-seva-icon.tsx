import passportSevaLogo from "@/assets/PassportSeva.svg";

interface PassportSevaIconProps {
  className?: string;
  /** Height in pixels; width scales to logo aspect ratio. */
  size?: number;
}

/**
 * Ministry of External Affairs, Government of India (Passport Seva).
 * Official logo from Wikimedia Commons. viewBox ~258×127.
 */
export function PassportSevaIcon({ className = "", size = 20 }: PassportSevaIconProps) {
  const width = Math.round((size * 258.01) / 126.63);
  return (
    <img
      src={passportSevaLogo}
      alt="Passport Seva"
      width={width}
      height={size}
      className={`max-w-full max-h-full object-contain ${className}`}
      loading="lazy"
      aria-hidden
      style={{ imageRendering: "auto" }}
    />
  );
}
