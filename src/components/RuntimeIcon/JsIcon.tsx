import type { ReactNode, SVGProps } from 'react';

/**
 * The JavaScript mark for the auth.js entry: a square in the runtime color
 * with the letters JS cut in dark. Drawn inline (not a file under
 * static/img/icons) and with the same props as the SVGR icons; `title` is
 * accepted and dropped, as RuntimeIcon passes title="".
 */
export default function JsIcon({ title: _title, ...props }: SVGProps<SVGSVGElement> & { title?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="1" y="1" width="22" height="22" rx="3" />
      <g fill="none" stroke="#1b1b1b" strokeWidth="2.1">
        <path d="M11.4 10.6v6.6c0 1.9-.9 2.7-2.3 2.7-1 0-1.7-.5-2.2-1.4" />
        <path d="M20.2 12.4c-.5-1.1-1.4-1.7-2.6-1.7-1.4 0-2.4.8-2.4 2 0 2.9 5.4 1.9 5.4 5 0 1.4-1.2 2.4-2.8 2.4-1.5 0-2.6-.7-3.2-2" />
      </g>
    </svg>
  );
}
