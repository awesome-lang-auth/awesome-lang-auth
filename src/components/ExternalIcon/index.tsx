import type { ReactNode } from 'react';

/** "Opens elsewhere" arrow, as inline SVG (the U+2197 glyph renders as an emoji on Windows). */
export default function ExternalIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg className={className} width="0.85em" height="0.85em" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
