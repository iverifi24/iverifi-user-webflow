import iverifiLogo from "../assets/iverifi_logo.svg";

interface IverifiLogoProps {
  className?: string;
  containerClassName?: string;
}

export function IverifiLogo({ 
  className = "w-[200%] scale-[1] max-w-none h-auto object-contain transform",
  containerClassName = "relative flex items-center justify-center w-full h-24 overflow-hidden",
}: IverifiLogoProps) {
  return (
    <div className={containerClassName}>
      <img
        src={iverifiLogo}
        alt="iVerifi Logo"
        className={className}
      />
    </div>
  );
}



