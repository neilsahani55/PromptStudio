"use client";

import { useId } from "react";

type Props = {
  size?: number;
  className?: string;
  ariaLabel?: string;
};

/**
 * Theme-aware app logo. Background gradient uses --primary, interior marks use
 * --primary-foreground so the logo re-colours automatically for every theme.
 */
export function Logo({ size = 42, className, ariaLabel = "PromptStudio" }: Props) {
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9]/g, "");
  const bgId = `logo-bg-${uid}`;
  const penId = `logo-pen-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      role="img"
      aria-label={ariaLabel}
      className={className}
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" style={{ stopColor: "hsl(var(--primary))" }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--primary) / 0.7)" }} />
        </linearGradient>
        <linearGradient id={penId} x1="140" y1="120" x2="300" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" style={{ stopColor: "hsl(var(--primary-foreground))" }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--primary-foreground) / 0.85)" }} />
        </linearGradient>
      </defs>

      <rect x="16" y="16" width="480" height="480" rx="96" fill={`url(#${bgId})`} />

      {/* Subtle top-left highlight */}
      <ellipse cx="180" cy="180" rx="200" ry="200" fill="white" opacity="0.06" />

      {/* Pen body */}
      <g transform="translate(256,260) rotate(-45)">
        <rect x="-20" y="-160" width="40" height="200" rx="6" fill={`url(#${penId})`} opacity="0.95" />
        <polygon points="-20,40 20,40 0,80" fill={`url(#${penId})`} opacity="0.95" />
        {/* Grip lines — primary at low opacity tints against the pen body */}
        <rect x="-20" y="-20" width="40" height="4" rx="2" style={{ fill: "hsl(var(--primary))" }} opacity="0.4" />
        <rect x="-20" y="-8" width="40" height="4" rx="2" style={{ fill: "hsl(var(--primary))" }} opacity="0.4" />
        <rect x="-20" y="4" width="40" height="4" rx="2" style={{ fill: "hsl(var(--primary))" }} opacity="0.4" />
      </g>

      {/* Sparkles */}
      <path
        d="M380 120 L392 164 L436 176 L392 188 L380 232 L368 188 L324 176 L368 164 Z"
        style={{ fill: "hsl(var(--primary-foreground))" }}
        opacity="0.95"
      />
      <path
        d="M160 380 L168 404 L192 412 L168 420 L160 444 L152 420 L128 412 L152 404 Z"
        style={{ fill: "hsl(var(--primary-foreground))" }}
        opacity="0.7"
      />
      <path
        d="M380 320 L384 336 L400 340 L384 344 L380 360 L376 344 L360 340 L376 336 Z"
        style={{ fill: "hsl(var(--primary-foreground))" }}
        opacity="0.55"
      />
      <circle cx="320" cy="108" r="5" style={{ fill: "hsl(var(--primary-foreground))" }} opacity="0.4" />
      <circle cx="432" cy="260" r="4" style={{ fill: "hsl(var(--primary-foreground))" }} opacity="0.35" />
      <circle cx="120" cy="340" r="4" style={{ fill: "hsl(var(--primary-foreground))" }} opacity="0.3" />
    </svg>
  );
}
