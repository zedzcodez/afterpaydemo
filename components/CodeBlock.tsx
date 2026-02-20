"use client";

import { useState } from "react";
import { COPY_FEEDBACK_MS } from "@/lib/constants";

// Shared CopyButton used by info sections and code blocks
export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-all duration-200 bg-afterpay-gray-700 hover:bg-afterpay-mint hover:text-afterpay-black text-afterpay-gray-300"
      title={`Copy ${label || "code"}`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

// Simple syntax highlighting for static developer code snippets.
// Supports HTML and JavaScript. Safe: all code strings are developer-controlled
// static template literals, never user input. Same pattern used across all info sections.
function highlightCode(code: string, language: string): string {
  if (language === "html") {
    return code
      .replace(/(&lt;\/?)(\w+)/g, '$1<span class="text-rose-400">$2</span>')
      .replace(/(<\/?)(\w+)/g, '$1<span class="text-rose-400">$2</span>')
      .replace(/(data-[\w-]+|src|class|id)(=)/g, '<span class="text-amber-300">$1</span>$2')
      .replace(/"([^"]*)"/g, '"<span class="text-emerald-400">$1</span>"')
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-afterpay-gray-500">$1</span>');
  }
  if (language === "javascript" || language === "js") {
    return code
      .replace(/(\/\/[^\n]*)/g, '<span class="text-afterpay-gray-500">$1</span>')
      .replace(/\b(const|let|var|new|function|async|await|return|if|else|try|catch)\b/g, '<span class="text-purple-400">$1</span>')
      .replace(/"([^"]*)"/g, '"<span class="text-emerald-400">$1</span>"')
      .replace(/\.(\w+)\s*\(/g, '.<span class="text-sky-400">$1</span>(')
      .replace(/(\w+):/g, '<span class="text-amber-300">$1</span>:')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>');
  }
  return code;
}

// CodeBlock renders syntax-highlighted code with a hover-to-copy button.
// All content passed to dangerouslySetInnerHTML comes from highlightCode() above,
// which only processes developer-controlled static template literals — never user input.
export function CodeBlock({ code, language = "html" }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
      <pre className="bg-afterpay-gray-900 text-afterpay-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }} />
      </pre>
    </div>
  );
}

export function QuickLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-mint transition-colors"
    >
      {children}
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
