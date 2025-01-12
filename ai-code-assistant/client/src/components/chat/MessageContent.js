import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MessageContent = ({ content }) => {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'javascript';
            
            if (!inline) {
              return (
                <div className="my-4 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center bg-gray-800 px-4 py-2">
                    <span className="text-xs text-gray-400 font-mono">{language}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(String(children))}
                      className="text-xs text-gray-400 hover:text-white focus:outline-none transition-colors duration-200"
                    >
                      コピー
                    </button>
                  </div>
                  <div className="relative">
                    <SyntaxHighlighter
                      language={language}
                      style={tomorrow}
                      customStyle={{
                        margin: 0,
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        fontSize: '0.875rem',
                      }}
                      wrapLongLines={true}
                    >
                      {String(children)}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-sm">
                {children}
              </code>
            );
          },
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>,
          p: ({ children }) => <p className="my-2 text-sm">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside my-2">{children}</ol>,
          li: ({ children }) => <li className="my-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;
