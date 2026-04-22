import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #F97316, #B45309)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pen */}
          <path
            d="M4 16L6 10L14 2L18 6L10 14L4 16Z"
            fill="white"
            opacity="0.95"
          />
          <path
            d="M6 10L10 14"
            stroke="#B45309"
            strokeWidth="0.8"
            opacity="0.4"
          />
          {/* Sparkle */}
          <path
            d="M16 10L17 13L20 14L17 15L16 18L15 15L12 14L15 13Z"
            fill="white"
            opacity="0.85"
            transform="scale(0.7) translate(6, -2)"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
