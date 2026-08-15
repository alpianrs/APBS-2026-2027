import React from "react";

interface LazuardiLogoProps {
  className?: string;
  variant?: "full" | "shield" | "horizontal";
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  lightText?: boolean;
  subtitle?: string;
}

/**
 * Pixel-accurate vector replica of the official Lazuardi Logo (Tameng & Wordmark)
 */
export const LazuardiLogo: React.FC<LazuardiLogoProps> = ({
  className = "",
  variant = "horizontal",
  size = "md",
  lightText = true,
  subtitle = "Facility Management"
}) => {
  // SVG Vector of the exact Lazuardi Shield
  const ShieldSvg = (
    <svg
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-md transition-transform"
    >
      {/* 1. Shield Background (Lazuardi Royal Blue) */}
      <path
        d="M500 168 C645 220 830 252 998 260 C1002 520 985 710 500 1000 C15 710 -2 520 2 260 C170 252 355 220 500 168 Z"
        fill="#1855C6"
      />

      {/* 2. Left Rising Leaf / Open Page (White) */}
      <path
        d="M53 475 C185 365 300 300 345 282 C415 385 417 480 247 754 C215 780 178 798 168 804 C194 670 192 560 53 475 Z"
        fill="#FFFFFF"
      />

      {/* 3. 4-Pointed Sparkle Star (White) */}
      <path
        d="M690 282 C685 390 625 445 444 450 C625 455 685 510 690 618 C695 510 755 455 942 450 C755 445 695 390 690 282 Z"
        fill="#FFFFFF"
      />

      {/* 4. Bottom Sweeping Wave / Lower Page (White) */}
      <path
        d="M168 804 C340 760 620 635 944 690 C780 840 670 882 660 882 C550 820 380 780 168 804 Z"
        fill="#FFFFFF"
      />
    </svg>
  );

  // Full stacked logo variant (Text "Lazuardi" directly above shield, exactly like the image)
  if (variant === "full") {
    const fullSizeMap = {
      sm: "w-20",
      md: "w-32",
      lg: "w-44",
      xl: "w-60",
      hero: "w-72"
    };

    return (
      <div className={`flex flex-col items-center select-none ${fullSizeMap[size]} ${className}`}>
        <span
          className={`font-serif tracking-tight font-black leading-none mb-2 text-center ${
            lightText ? "text-white" : "text-[#222222]"
          } ${
            size === "sm"
              ? "text-xl"
              : size === "md"
              ? "text-3xl"
              : size === "lg"
              ? "text-4xl"
              : "text-5xl"
          }`}
          style={{ fontFamily: "'Georgia', 'Cambria', 'Times New Roman', serif" }}
        >
          Lazuardi
        </span>
        <div className="w-full aspect-[1/1]">{ShieldSvg}</div>
        {subtitle && (
          <span
            className={`text-[10px] font-sans font-black tracking-widest uppercase mt-2 text-center ${
              lightText ? "text-amber-300" : "text-[#1855C6]"
            }`}
          >
            {subtitle}
          </span>
        )}
      </div>
    );
  }

  // Shield only variant
  if (variant === "shield") {
    const shieldSizeMap = {
      sm: "w-8 h-8",
      md: "w-11 h-11",
      lg: "w-14 h-14",
      xl: "w-20 h-20",
      hero: "w-28 h-28"
    };

    return (
      <div className={`${shieldSizeMap[size]} shrink-0 ${className}`}>
        {ShieldSvg}
      </div>
    );
  }

  // Horizontal variant (Shield + Typography side-by-side)
  const horizSizeMap = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
    lg: "w-13 h-13",
    xl: "w-16 h-16",
    hero: "w-24 h-24"
  };

  return (
    <div className={`flex items-center space-x-3.5 select-none ${className}`}>
      <div className={`${horizSizeMap[size]} shrink-0`}>
        {ShieldSvg}
      </div>

      <div className="flex flex-col">
        <span
          className={`font-serif tracking-tight font-black leading-none ${
            lightText ? "text-white" : "text-[#1a202c]"
          } ${
            size === "sm"
              ? "text-lg"
              : size === "md"
              ? "text-2xl"
              : size === "lg"
              ? "text-3xl"
              : "text-4xl"
          }`}
          style={{ fontFamily: "'Georgia', 'Cambria', 'Times New Roman', serif" }}
        >
          Lazuardi
        </span>
        {subtitle && (
          <span
            className={`text-[10px] font-sans font-extrabold tracking-widest uppercase mt-0.5 ${
              lightText ? "text-amber-300" : "text-[#1855C6]"
            }`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
