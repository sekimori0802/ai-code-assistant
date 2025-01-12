import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MessageContent = ({ content }) => {
  // コードブロックを検出して分割
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // コードブロックの言語を抽出
          const firstLine = part.split('\n')[0];
          const language = firstLine.slice(3).trim() || 'javascript';
          const code = part
            .slice(firstLine.length + 1, -3)
            .trim();

          return (
            <div key={index} className="my-4 rounded-lg overflow-hidden">
              <div className="flex justify-between items-center bg-gray-800 px-4 py-2">
                <span className="text-xs text-gray-400 font-mono">{language}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
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
                  {code}
                </SyntaxHighlighter>
              </div>
            </div>
          );
        }

        // インラインコードを処理
        const inlineCodeParts = part.split(/(`[^`]+`)/g);
        return (
          <span key={index} className="text-sm">
            {inlineCodeParts.map((inlinePart, i) => {
              if (inlinePart.startsWith('`') && inlinePart.endsWith('`')) {
                const code = inlinePart.slice(1, -1);
                return (
                  <code
                    key={i}
                    className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-sm"
                  >
                    {code}
                  </code>
                );
              }
              return inlinePart;
            })}
          </span>
        );
      })}
    </div>
  );
};

export default MessageContent;
