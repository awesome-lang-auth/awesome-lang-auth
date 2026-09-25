import React, { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import type { Language } from 'prism-react-renderer';
import styles from './styles.module.css';

// ── Code block with language header + copy button ─────────────────────────────

function CodeBlock({ language, code }: { language: string; code: string }): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* clipboard access denied — silently ignore */ });
  };

  const displayLang = language || 'text';

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLang}>{displayLang}</span>
        <button className={styles.copyButton} onClick={handleCopy} aria-label="Copy code to clipboard">
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <Highlight code={code.trimEnd()} language={displayLang as Language} theme={themes.vsDark}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${className} ${styles.codeContent}`} style={{ ...style, margin: 0 }}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

// ── Inline markdown (bold, italic, inline-code, links) ────────────────────────
const INLINE_RE = /(\*\*[\s\S]+?\*\*|__[\s\S]+?__|`[^`]+`|\*[\s\S]+?\*|_[\s\S]+?_|\[[\s\S]+?\]\([^)]+\))/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let ki = 0;

  for (const match of text.matchAll(INLINE_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));
    const raw = match[0];
    const k = `${keyPrefix}-i${ki++}`;

    if (raw.startsWith('**') || raw.startsWith('__')) {
      nodes.push(<strong key={k}>{raw.slice(2, -2)}</strong>);
    } else if (raw.startsWith('`')) {
      nodes.push(<code key={k} className={styles.inlineCode}>{raw.slice(1, -1)}</code>);
    } else if (raw.startsWith('[')) {
      const lm = raw.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (lm) nodes.push(<a key={k} href={lm[2]} target="_blank" rel="noopener noreferrer">{lm[1]}</a>);
      else nodes.push(raw);
    } else {
      nodes.push(<em key={k}>{raw.slice(1, -1)}</em>);
    }
    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length > 0 ? nodes : [text];
}

// ── Table helpers ─────────────────────────────────────────────────────────────

/** Split a GFM table row into trimmed cells, stripping leading/trailing pipes. */
function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(c => c.trim());
}

/** True if the line is a GFM separator row (e.g. |---|:---:|---:|) */
function isSeparatorRow(line: string): boolean {
  return /^\|?[\s|:\-]+\|?$/.test(line) &&
    line.includes('-') &&
    splitTableRow(line).every(c => /^:?-+:?$/.test(c));
}

// ── Block-level types ─────────────────────────────────────────────────────────

type BlockNode =
  | { tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'; text: string }
  | { tag: 'ul' | 'ol'; items: string[] }
  | { tag: 'hr' }
  | { tag: 'blockquote'; text: string }
  | { tag: 'table'; headers: string[]; rows: string[][] }
  | { tag: 'p'; text: string };

function parseBlocks(content: string): BlockNode[] {
  const blocks: BlockNode[] = [];
  const lines = content.split('\n');
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  let paraLines: string[] = [];

  // Table accumulator
  let tableHeaders: string[] | null = null;
  let tableRows: string[][] = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    blocks.push({ tag: listType, items: [...listItems] });
    listType = null; listItems = [];
  };

  const flushPara = () => {
    const text = paraLines.join('\n').trim();
    if (text) blocks.push({ tag: 'p', text });
    paraLines = [];
  };

  const flushTable = () => {
    if (!tableHeaders) return;
    blocks.push({ tag: 'table', headers: tableHeaders, rows: [...tableRows] });
    tableHeaders = null; tableRows = [];
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // ── Detect start of a GFM table: current line has pipes, next is separator
    const nextLine = lines[idx + 1] ?? '';
    if (!tableHeaders && line.includes('|') && isSeparatorRow(nextLine)) {
      flushList(); flushPara();
      tableHeaders = splitTableRow(line);
      idx++; // skip separator
      continue;
    }

    // ── Accumulate table body rows
    if (tableHeaders !== null) {
      if (line.includes('|')) {
        tableRows.push(splitTableRow(line));
        continue;
      }
      // Non-pipe line ends the table
      flushTable();
      // Fall through to normal parsing for this line
    }

    // Headings
    const hm = line.match(/^(#{1,6})\s+(.+)/);
    if (hm) {
      flushList(); flushPara();
      blocks.push({ tag: `h${hm[1].length}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', text: hm[2] });
      continue;
    }

    // Unordered list
    const ul = line.match(/^[-*+]\s+(.*)/);
    if (ul) {
      flushPara();
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(ul[1]);
      continue;
    }

    // Ordered list
    const ol = line.match(/^\d+\.\s+(.*)/);
    if (ol) {
      flushPara();
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(ol[1]);
      continue;
    }

    // Horizontal rule
    if (/^([-]{3,}|[*]{3,}|[_]{3,})\s*$/.test(line)) {
      flushList(); flushPara();
      blocks.push({ tag: 'hr' });
      continue;
    }

    // Blockquote
    const bq = line.match(/^>\s*(.*)/);
    if (bq) {
      flushList(); flushPara();
      blocks.push({ tag: 'blockquote', text: bq[1] });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList(); flushPara();
      continue;
    }

    // Regular text
    flushList();
    paraLines.push(line);
  }

  flushTable(); flushList(); flushPara();
  return blocks;
}

// ── TextBlock ─────────────────────────────────────────────────────────────────

function TextBlock({ content, blockIndex }: { content: string; blockIndex: number }): React.ReactElement {
  const blocks = parseBlocks(content);
  return (
    <>
      {blocks.map((b, i) => {
        const kp = `seg${blockIndex}-b${i}`;

        if (b.tag === 'hr') return <hr key={kp} className={styles.mdHr} />;

        if (b.tag === 'ul' || b.tag === 'ol') {
          const Tag = b.tag;
          return (
            <Tag key={kp} className={styles.mdList}>
              {b.items.map((item, j) => <li key={j}>{renderInline(item, `${kp}-li${j}`)}</li>)}
            </Tag>
          );
        }

        if (b.tag === 'blockquote') {
          return (
            <blockquote key={kp} className={styles.mdBlockquote}>
              {renderInline(b.text, kp)}
            </blockquote>
          );
        }

        if (b.tag === 'table') {
          return (
            <div key={kp} className={styles.mdTableWrapper}>
              <table className={styles.mdTable}>
                <thead>
                  <tr>
                    {b.headers.map((h, j) => (
                      <th key={j} className={styles.mdTh}>{renderInline(h, `${kp}-th${j}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, ri) => (
                    <tr key={ri} className={styles.mdTr}>
                      {row.map((cell, ci) => (
                        <td key={ci} className={styles.mdTd}>{renderInline(cell, `${kp}-td${ri}-${ci}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (b.tag.match(/^h[1-6]$/)) {
          const Tag = b.tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          return <Tag key={kp} className={styles.mdHeading}>{renderInline(b.text, kp)}</Tag>;
        }

        if (b.tag === 'p') {
          return <p key={kp} className={styles.mdPara}>{renderInline(b.text, kp)}</p>;
        }

        return null;
      })}
    </>
  );
}

// ── Think block ───────────────────────────────────────────────────────────────

type ContentSegment =
  | { type: 'think'; content: string }
  | { type: 'normal'; content: string };

function splitThinkBlocks(raw: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const re = /<think>([\s\S]*?)<\/think>/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) segments.push({ type: 'normal', content: raw.slice(last, m.index) });
    segments.push({ type: 'think', content: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < raw.length) {
    const tail = raw.slice(last);
    // Unclosed <think> tag: treat everything from its opening to the end as a think block.
    // Non-greedy first group ensures we split at the FIRST <think> in the tail.
    const unclosed = tail.match(/^([\s\S]*?)<think>([\s\S]*)$/);
    if (unclosed) {
      if (unclosed[1]) segments.push({ type: 'normal', content: unclosed[1] });
      segments.push({ type: 'think', content: unclosed[2].trim() });
    } else {
      segments.push({ type: 'normal', content: tail });
    }
  }
  return segments;
}

function ThinkBlock({ content }: { content: string }): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <details className={styles.thinkBlock} open={open}>
      <summary className={styles.thinkSummary} onClick={e => { e.preventDefault(); setOpen(o => !o); }}>
        <svg
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Internal reasoning
      </summary>
      {open && (
        <div className={styles.thinkContent}>
          <TextBlock content={content} blockIndex={-1} />
        </div>
      )}
    </details>
  );
}

// ── Fenced code-block splitter ────────────────────────────────────────────────

type Segment =
  | { type: 'code'; language: string; code: string }
  | { type: 'text'; content: string };

function parseCodeFences(content: string): Segment[] {
  const segments: Segment[] = [];
  const re = /```([^\n\s`]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    segments.push({ type: 'code', language: match[1] || '', code: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) segments.push({ type: 'text', content: content.slice(lastIndex) });
  return segments;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function MarkdownRenderer({ content }: { content: string }): React.ReactElement {
  const thinkSegments = splitThinkBlocks(content);
  return (
    <div className={styles.markdownContent}>
      {thinkSegments.map((seg, i) => {
        if (seg.type === 'think') return <ThinkBlock key={i} content={seg.content} />;
        return parseCodeFences(seg.content).map((s, j) =>
          s.type === 'code' ? (
            <CodeBlock key={`${i}-${j}`} language={s.language} code={s.code} />
          ) : (
            <TextBlock key={`${i}-${j}`} content={s.content} blockIndex={i * 100 + j} />
          ),
        );
      })}
    </div>
  );
}