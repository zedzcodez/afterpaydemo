"use client";

import { useState } from "react";

interface CodeViewerProps {
  title: string;
  code: string;
  language?: string;
}

export function CodeViewer({ title, code, language = "typescript" }: CodeViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-afterpay-gray-200 dark:border-afterpay-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-afterpay-gray-50 dark:bg-afterpay-gray-800 text-left flex items-center justify-between hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-700 transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="bg-afterpay-gray-900 p-4 overflow-x-auto">
          <pre className="text-sm text-green-400">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
