import React from 'react';

interface SparkGenLogoProps {
  className?: string;
  variant?: 'full' | 'icon-only';
  height?: number | string;
  width?: number | string;
  alt?: string;
  id?: string;
}

export const SparkGenLogo: React.FC<SparkGenLogoProps> = ({
  className = 'h-8 w-auto',
  variant = 'full',
  height,
  width,
  alt = 'Spark Gen Technology Logo',
  id,
}) => {
  if (variant === 'icon-only') {
    return (
      <svg
        id={id}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ height: height, width: width, flexShrink: 0 }}
        aria-label={alt}
        role="img"
      >
        {/* Outer Orange Crescent */}
        <path
          d="M 68 18 C 30 32 8 68 10 110 C 12 144 38 170 74 176 C 45 168 22 140 20 106 C 18 70 38 38 68 18 Z"
          fill="#F15A24"
        />
        {/* Middle Bold Royal Blue Crescent */}
        <path
          d="M 92 10 C 44 18 14 60 16 110 C 18 154 52 186 94 190 C 58 182 30 146 30 108 C 30 64 60 26 92 10 Z"
          fill="#0052CC"
        />
        {/* Inner Orange Accents */}
        <path
          d="M 68 24 C 88 28 104 39 114 55 C 103 43 87 32 68 24 Z"
          fill="#F15A24"
        />
        <path
          d="M 110 146 C 98 162 80 174 60 180 C 78 174 94 162 105 146 Z"
          fill="#F15A24"
        />
      </svg>
    );
  }

  return (
    <svg
      id={id}
      viewBox="0 0 520 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ height: height, width: width, flexShrink: 0 }}
      aria-label={alt}
      role="img"
    >
      {/* Icon portion */}
      <g transform="translate(10, 5)">
        {/* Outer Orange Crescent Arc */}
        <path
          d="M 72 20 C 32 36 10 72 12 114 C 14 148 40 174 76 180 C 48 172 24 144 22 110 C 20 74 40 42 72 20 Z"
          fill="#F15A24"
        />
        {/* Middle Bold Royal Blue Crescent Arc */}
        <path
          d="M 96 12 C 48 20 18 62 20 112 C 22 156 56 188 98 192 C 62 184 34 148 34 110 C 34 66 64 28 96 12 Z"
          fill="#0052CC"
        />
        {/* Inner Orange Accents */}
        <path
          d="M 72 26 C 92 30 108 41 118 57 C 107 45 91 34 72 26 Z"
          fill="#F15A24"
        />
        <path
          d="M 114 148 C 102 164 84 176 64 182 C 82 176 98 164 109 148 Z"
          fill="#F15A24"
        />
      </g>

      {/* SPARK GEN in Royal Cobalt Blue */}
      <text
        x="180"
        y="98"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fontSize="54"
        fontWeight="900"
        letterSpacing="2"
        fill="#0052CC"
      >
        SPARK GEN
      </text>

      {/* TECHNOLOGY in Vibrant Orange */}
      <text
        x="184"
        y="136"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fontSize="21"
        fontWeight="800"
        letterSpacing="11"
        fill="#F15A24"
      >
        TECHNOLOGY
      </text>
    </svg>
  );
};
