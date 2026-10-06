import iverifiLogo from "../assets/new_no_bg.png";

interface IverifiLogoProps {
  className?: string;
  containerClassName?: string;
  showText?: boolean;
}

export function IverifiLogo({ 
  className = "h-8 sm:h-9 w-auto object-contain shrink-0",
  containerClassName = "inline-flex items-center gap-2.5",
  showText = true,
}: IverifiLogoProps) {
  return (
    <div className={containerClassName}>
      <img
        src={iverifiLogo}
        alt="iVerifi Logo"
        className={className}
      />
      {showText && (
        <span className="text-lg font-black tracking-tight text-foreground flex items-center">
          iVerifi
          <span className="ml-1.5 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25">
            ID
          </span>
        </span>
      )}
    </div>
  );
}
