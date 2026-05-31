import LOGO1 from "@/assets/LOGO1.png";
import LOGO2 from "@/assets/LOGO2.png";

interface Props {
  size?: "sm" | "md" | "lg";
  /** kept for API compatibility — text is no longer rendered */
  showText?: boolean;
  variant?: "light" | "dark";
}

const sizes = {
  sm: "h-7",
  md: "h-9",
  lg: "h-12",
};

/**
 * Renders LOGO1 + LOGO2 side-by-side. No brand text.
 * RTL: LOGO1 on the right (parent flex auto-reverses in RTL).
 * LTR: LOGO1 on the left.
 */
export const BrandLogo = ({ size = "md" }: Props) => {
  const cls = sizes[size];
  return (
    <div className="flex items-center gap-2">
      <img src={LOGO1} alt="Shakkel logo" className={`${cls} w-auto object-contain`} loading="eager" />
      <img src={LOGO2} alt="Shakkel mark" className={`${cls} w-auto object-contain`} loading="eager" />
    </div>
  );
};
