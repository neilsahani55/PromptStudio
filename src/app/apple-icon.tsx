import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 36,
          background: 'linear-gradient(135deg, #F97316, #B45309)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="110"
          height="110"
          viewBox="0 0 110 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pen body */}
          <g transform="translate(55,58) rotate(-45)">
            <rect x="-8" y="-50" width="16" height="65" rx="3" fill="white" opacity="0.95" />
            <polygon points="-8,15 8,15 0,30" fill="white" opacity="0.95" />
            <rect x="-8" y="-6" width="16" height="2" rx="1" fill="#B45309" opacity="0.3" />
            <rect x="-8" y="0" width="16" height="2" rx="1" fill="#B45309" opacity="0.3" />
            <rect x="-8" y="6" width="16" height="2" rx="1" fill="#B45309" opacity="0.3" />
          </g>
          {/* Main sparkle */}
          <path d="M82 22 L86 36 L100 40 L86 44 L82 58 L78 44 L64 40 L78 36 Z" fill="white" opacity="0.9" />
          {/* Small sparkle */}
          <path d="M28 82 L30 90 L38 92 L30 94 L28 102 L26 94 L18 92 L26 90 Z" fill="white" opacity="0.6" />
          {/* Dot */}
          <circle cx="68" cy="16" r="2.5" fill="white" opacity="0.4" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
