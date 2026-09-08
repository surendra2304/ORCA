import React from 'react';

interface OrcaLogoProps {
  className?: string;
  size?: number;
  textColor?: string;
  showText?: boolean;
  subtext?: string;
}

export const OrcaLogo: React.FC<OrcaLogoProps> = ({
  className = '',
  size = 36,
  textColor = '#0b2545',
  showText = true,
  subtext,
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          className="w-full h-full text-[#0b2545]"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Leaping Orca Body */}
          <path
            d="M52 34C48 24 38 18 26 20C18 21.3 12 26 8 32C7 33.5 8 35 10 35C13 35 16 33 18 31C24 25 34 25 40 30C43 32.5 45 36 44 40C43.5 42 41 43 39 43C34 43 30 40 28 37C27 35.5 25 36 24 37C22 39 22 42 24 44C28 48 35 49 42 47C49 45 54 39 52 34Z"
            fill={textColor}
          />
          {/* Dorsal Fin */}
          <path
            d="M33 24C34 20 37 17 40 15C39 19 38 22 36 24H33Z"
            fill={textColor}
          />
          {/* Fluke / Tail */}
          <path
            d="M48 26C51 22 55 19 58 18C57 22 56 26 54 29C52 28 50 27 48 26Z"
            fill={textColor}
          />
          {/* Ocean Wave Accent */}
          <path
            d="M12 46C18 44 24 45 30 47C36 49 42 49 48 46"
            stroke="#0d6efd"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Orca Eye Spot */}
          <circle cx="16" cy="30" r="1.5" fill="#ffffff" />
        </svg>
      </div>

      {showText && (
        <div className="leading-none flex flex-col justify-center select-none">
          <span
            className="text-[20px] font-black tracking-tight leading-none"
            style={{ color: textColor }}
          >
            ORCA
          </span>
          {subtext && (
            <span
              className="text-[9.5px] font-bold tracking-[0.16em] uppercase mt-0.5"
              style={{ color: textColor }}
            >
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
