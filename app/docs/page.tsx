"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Link from "next/link";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

// Extract headings from markdown for table of contents
function extractHeadings(markdown: string): TocItem[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const headings: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    headings.push({ id, text, level });
  }

  return headings;
}

// Custom components for markdown rendering
const MarkdownComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = String(children)
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    return (
      <h1 id={id} className="scroll-mt-24 text-3xl sm:text-4xl font-display font-bold text-afterpay-black dark:text-white mt-12 mb-6 first:mt-0" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = String(children)
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    return (
      <h2 id={id} className="scroll-mt-24 text-2xl font-display font-bold text-afterpay-black dark:text-white mt-12 mb-4 pb-3 border-b border-afterpay-gray-200 dark:border-afterpay-gray-700" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = String(children)
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    return (
      <h3 id={id} className="scroll-mt-24 text-xl font-display font-semibold text-afterpay-black dark:text-white mt-8 mb-3" {...props}>
        {children}
      </h3>
    );
  },
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-afterpay-gray-700 dark:text-afterpay-gray-300 leading-relaxed mb-4" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-afterpay-gray-700 dark:text-afterpay-gray-300" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-afterpay-gray-700 dark:text-afterpay-gray-300" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      className="text-teal-600 dark:text-afterpay-mint hover:text-teal-700 dark:hover:text-afterpay-mint-dark underline underline-offset-2 decoration-teal-400/50 dark:decoration-afterpay-mint/50 hover:decoration-teal-600 dark:hover:decoration-afterpay-mint transition-colors"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 bg-afterpay-gray-100 dark:bg-afterpay-gray-800 text-afterpay-gray-800 dark:text-afterpay-gray-200 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }
    // Block code - ensure light text for dark pre background
    return (
      <code className="text-slate-200 font-mono" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement> & { children?: React.ReactNode }) => {
    const getCodeText = (): string => {
      if (React.isValidElement(children)) {
        const childElement = children as React.ReactElement<{ children?: React.ReactNode }>;
        if (childElement.props?.children) {
          return String(childElement.props.children);
        }
      }
      return String(children || "");
    };
    return (
      <pre className="relative group mb-6 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 overflow-hidden" {...props}>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              const code = getCodeText();
              if (code) navigator.clipboard.writeText(code);
            }}
            className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            Copy
          </button>
        </div>
        <div className="p-4 overflow-x-auto text-sm text-slate-200">
          {children}
        </div>
      </pre>
    );
  },
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="mb-6 overflow-x-auto rounded-lg border border-afterpay-gray-200 dark:border-afterpay-gray-700">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 border-b border-afterpay-gray-200 dark:border-afterpay-gray-700" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-4 py-3 text-left font-semibold text-afterpay-black dark:text-white" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-3 text-afterpay-gray-700 dark:text-afterpay-gray-300 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700" {...props}>
      {children}
    </td>
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-4 border-afterpay-mint pl-4 py-1 my-4 text-afterpay-gray-600 dark:text-afterpay-gray-400 italic" {...props}>
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-afterpay-gray-200 dark:border-afterpay-gray-700" />,
  details: ({ children, ...props }: React.HTMLAttributes<HTMLDetailsElement>) => (
    <details className="my-4 rounded-lg border border-afterpay-gray-200 dark:border-afterpay-gray-700 bg-afterpay-gray-50/50 dark:bg-afterpay-gray-800/50" {...props}>
      {children}
    </details>
  ),
  summary: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <summary className="px-4 py-3 cursor-pointer font-medium text-afterpay-black dark:text-white hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-700/50 rounded-lg transition-colors select-none" {...props}>
      {children}
    </summary>
  ),
};

export default function DocsPage() {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("");
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadDocs() {
      try {
        const res = await fetch("/api/docs/how-to-use");
        if (res.ok) {
          const data = await res.json();
          setContent(data.content);
        }
      } catch (error) {
        console.error("Failed to load docs:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDocs();
  }, []);

  // Extract TOC when content changes
  useEffect(() => {
    if (content) {
      setTocItems(extractHeadings(content));
    }
  }, [content]);

  // Track scroll position to highlight active section
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;

    const headings = contentRef.current.querySelectorAll("h1, h2, h3");
    let current = "";

    headings.forEach((heading) => {
      const rect = heading.getBoundingClientRect();
      if (rect.top <= 120) {
        current = heading.id;
      }
    });

    setActiveSection(current);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-afterpay-gray-900">
      {/* Animated Header */}
      <div className="relative overflow-hidden border-b border-afterpay-gray-200 dark:border-afterpay-gray-800">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-afterpay-mint/10 via-white to-emerald-50/50 dark:from-afterpay-mint/5 dark:via-afterpay-gray-900 dark:to-emerald-900/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-afterpay-mint/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-afterpay-mint/10" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex items-start gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-afterpay-mint to-emerald-400 items-center justify-center shadow-lg shadow-afterpay-mint/25 shrink-0">
              <svg className="w-7 h-7 text-afterpay-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 text-xs font-semibold bg-afterpay-mint/20 text-afterpay-black dark:text-afterpay-mint rounded-full">
                  v1.0
                </span>
                <span className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400">
                  Last updated: Feb 2026
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-afterpay-black dark:text-white mb-2">
                User Guide
              </h1>
              <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 text-lg max-w-2xl">
                Learn how to test all features of the Afterpay demo application.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Navigation Bar */}
      <div className="sticky top-16 z-40 bg-white/95 dark:bg-afterpay-gray-900/95 backdrop-blur-md border-b border-afterpay-gray-200 dark:border-afterpay-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="font-medium text-afterpay-black dark:text-white">How to Use This Demo</span>
            </div>

            {/* Mobile TOC Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm font-medium text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white rounded-lg hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              On this page
            </button>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-12">
          {/* Content Area */}
          <div ref={contentRef} className="min-w-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-10 h-10 border-3 border-afterpay-mint border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-afterpay-gray-500 dark:text-afterpay-gray-400">Loading documentation...</p>
              </div>
            ) : (
              <article className="prose-article">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={MarkdownComponents}
                >
                  {content || "No content available."}
                </ReactMarkdown>
              </article>
            )}
          </div>

          {/* Sidebar - Table of Contents */}
          <aside className={`
            fixed inset-y-0 right-0 z-50 w-72 bg-white dark:bg-afterpay-gray-900 shadow-2xl transform transition-transform duration-300 lg:transform-none lg:static lg:shadow-none lg:w-auto lg:bg-transparent
            ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          `}>
            {/* Mobile Sidebar Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-afterpay-gray-200 dark:border-afterpay-gray-700 lg:hidden">
              <span className="font-semibold text-afterpay-black dark:text-white">On this page</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-afterpay-gray-500 hover:text-afterpay-black dark:hover:text-white rounded-lg hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-800"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* TOC Content */}
            <div className="sticky top-32 p-4 lg:p-0 max-h-[calc(100vh-10rem)] overflow-y-auto">
              <div className="hidden lg:block mb-4">
                <h4 className="text-xs font-semibold text-afterpay-gray-400 dark:text-afterpay-gray-500 uppercase tracking-wider">
                  On this page
                </h4>
              </div>
              <nav className="space-y-1">
                {tocItems.map((item, index) => (
                  <button
                    key={`${item.id}-${index}`}
                    onClick={() => scrollToSection(item.id)}
                    className={`
                      block w-full text-left text-sm py-1.5 transition-all duration-200 rounded
                      ${item.level === 1 ? "font-medium" : ""}
                      ${item.level === 2 ? "pl-0" : ""}
                      ${item.level === 3 ? "pl-4" : ""}
                      ${activeSection === item.id
                        ? "text-teal-600 dark:text-afterpay-mint font-medium"
                        : "text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white"
                      }
                    `}
                  >
                    <span className={`
                      inline-block transition-all duration-200
                      ${activeSection === item.id ? "translate-x-1" : ""}
                    `}>
                      {item.text}
                    </span>
                  </button>
                ))}
              </nav>

              {/* Quick Links */}
              <div className="mt-8 pt-6 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700">
                <h4 className="text-xs font-semibold text-afterpay-gray-400 dark:text-afterpay-gray-500 uppercase tracking-wider mb-3">
                  Quick Links
                </h4>
                <div className="space-y-2">
                  <Link
                    href="/checkout"
                    className="flex items-center gap-2 text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-mint transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Try Checkout Demo
                  </Link>
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-mint transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Admin Panel
                  </Link>
                  <a
                    href="https://developers.cash.app/cash-app-afterpay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-mint transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Afterpay API Docs
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
