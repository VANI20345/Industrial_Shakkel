import LOGO1 from "@/assets/LOGO1.png";

interface Props {
  size?: "sm" | "md" | "lg";
  /** kept for API compatibility — text is no longer rendered */
  showText?: boolean;
  variant?: "light" | "dark";
}

const sizes = {
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
};

/** Renders LOGO1 only. No brand text. */
export const BrandLogo = ({ size = "md" }: Props) => {
  return (
    <img
      src={LOGO1}
      alt="Shakkel"
      className={`${sizes[size]} w-auto object-contain`}
      loading="eager"
    />
  );
};
