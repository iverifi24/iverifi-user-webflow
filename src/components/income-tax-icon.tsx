import incomeTaxLogo from "@/assets/IncomeTax.png";

interface IncomeTaxIconProps {
  className?: string;
  /** Height in pixels; width scales to logo aspect ratio. */
  size?: number;
}

/** Income Tax Department official logo (from Wikimedia Commons). */
export function IncomeTaxIcon({ className = "", size = 20 }: IncomeTaxIconProps) {
  const width = Math.round((size * 344) / 235);
  return (
    <img
      src={incomeTaxLogo}
      alt="Income Tax Department"
      width={width}
      height={size}
      className={className}
      loading="lazy"
      aria-hidden
      style={{ imageRendering: "auto" }}
    />
  );
}
