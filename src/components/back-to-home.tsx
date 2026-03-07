import { useNavigate, useLocation } from "react-router-dom";

export function BackToHome() {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === "/" || location.pathname === "/home") return null;
  return (
    <button
      type="button"
      onClick={() => navigate("/")}
      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-2 -mt-1"
    >
      ← Back to home
    </button>
  );
}
