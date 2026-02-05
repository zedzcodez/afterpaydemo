"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type DocTab = "readme" | "how-to-use";

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<DocTab>("readme");
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [howToUseContent, setHowToUseContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDocs() {
      try {
        const [readmeRes, howToUseRes] = await Promise.all([
          fetch("/api/docs/readme"),
          fetch("/api/docs/how-to-use"),
        ]);

        if (readmeRes.ok) {
          const data = await readmeRes.json();
          setReadmeContent(data.content);
        }
        if (howToUseRes.ok) {
          const data = await howToUseRes.json();
          setHowToUseContent(data.content);
        }
      } catch (error) {
        console.error("Failed to load docs:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDocs();
  }, []);

  const tabs: { id: DocTab; label: string; description: string }[] = [
    { id: "readme", label: "README", description: "Project overview and setup" },
    { id: "how-to-use", label: "How to Use", description: "Detailed testing guide" },
  ];

  const content = activeTab === "readme" ? readmeContent : howToUseContent;

  return (
    <div className="min-h-screen bg-white dark:bg-afterpay-gray-900">
      {/* Header */}
      <div className="border-b border-afterpay-gray-200 dark:border-afterpay-gray-800 bg-gradient-to-r from-afterpay-gray-50 to-white dark:from-afterpay-gray-900 dark:to-afterpay-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-afterpay-mint to-emerald-400 flex items-center justify-center shadow-lg shadow-afterpay-mint/20">
              <svg className="w-6 h-6 text-afterpay-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-afterpay-black dark:text-white">
                Documentation
              </h1>
              <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 text-sm sm:text-base">
                Complete guides for testing and integrating the demo
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-16 z-40 bg-white/95 dark:bg-afterpay-gray-900/95 backdrop-blur-sm border-b border-afterpay-gray-200 dark:border-afterpay-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? "text-afterpay-black dark:text-white"
                    : "text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-800"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute inset-0 bg-afterpay-mint/20 dark:bg-afterpay-mint/10 rounded-lg -z-10" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-3 border-afterpay-mint border-t-transparent rounded-full" />
          </div>
        ) : (
          <article className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-display prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:border-afterpay-gray-200 prose-h2:dark:border-afterpay-gray-700 prose-h2:pb-2 prose-h2:mb-4 prose-h3:text-xl prose-a:text-afterpay-mint prose-a:no-underline hover:prose-a:underline prose-code:bg-afterpay-gray-100 prose-code:dark:bg-afterpay-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-afterpay-gray-900 prose-pre:dark:bg-afterpay-gray-950 prose-pre:border prose-pre:border-afterpay-gray-800 prose-table:text-sm prose-th:bg-afterpay-gray-50 prose-th:dark:bg-afterpay-gray-800 prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2 prose-td:border-afterpay-gray-200 prose-td:dark:border-afterpay-gray-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || "No content available."}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
