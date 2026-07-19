import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { DroppedFile } from "../../types";

type ChatMessageProps = {
  sender: "user" | "assistant";
  message: string;
  files?: DroppedFile[];
  index: number;
  isLast?: boolean;
  onRegenerate?: (index: number) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, string> = {
    pdf: "📄", doc: "📝", docx: "📝", txt: "📝", md: "📝",
    js: "⚡", ts: "⚡", tsx: "⚡", jsx: "⚡",
    py: "🐍", java: "☕", c: "⚙", cpp: "⚙", h: "⚙",
    html: "🌐", css: "🎨", json: "📋", yaml: "📋", yml: "📋",
    png: "🖼", jpg: "🖼", jpeg: "🖼", gif: "🖼", webp: "🖼", svg: "🖼",
    zip: "📦", rar: "📦", tar: "📦", gz: "📦",
    sql: "🗃", csv: "📊", xlsx: "📊", xls: "📊",
  };
  return iconMap[ext] || "📁";
}

function FileAttachmentCard({ file }: { file: DroppedFile }) {
  const isImage = file.type.startsWith("image/");

  return (
    <div
      className="rounded p-2.5 mb-2 inline-flex items-start gap-2.5 max-w-full"
      style={{
        background: "rgba(255, 157, 46, 0.05)",
        border: "1px solid rgba(255, 157, 46, 0.15)",
      }}
    >
      {/* Icon or thumbnail */}
      {isImage && file.content ? (
        <img
          src={file.content}
          alt={file.name}
          className="rounded"
          style={{
            width: 48,
            height: 48,
            objectFit: "cover",
            border: "1px solid var(--friday-border)",
          }}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded"
          style={{
            width: 40,
            height: 40,
            background: "rgba(255, 157, 46, 0.1)",
            fontSize: 18,
          }}
        >
          {getFileIcon(file.name)}
        </div>
      )}

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p
          className="truncate"
          style={{ fontSize: 11, color: "var(--friday-text)", maxWidth: 200 }}
        >
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="annotation">{formatFileSize(file.size)}</span>
          <span className="hud-label" style={{ fontSize: 6, color: "var(--friday-accent)" }}>
            {file.name.split(".").pop()?.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ChatMessage({
  sender,
  message,
  files,
  index,
  isLast,
  onRegenerate,
}: ChatMessageProps) {
  const isUser = sender === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message]);

  const hasFiles = files && files.length > 0;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 animate-fadeIn`}>
      <div
        className="relative max-w-[85%] px-4 py-3"
        style={{
          background: isUser
            ? "rgba(255, 157, 46, 0.08)"
            : "rgba(44, 54, 71, 0.6)",
          border: `1px solid ${isUser ? "rgba(255, 157, 46, 0.2)" : "var(--friday-border)"}`,
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
        }}
      >
        {/* Sender label */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className="led"
            style={{
              background: isUser ? "var(--friday-accent)" : "var(--friday-steel)",
              boxShadow: isUser
                ? "0 0 6px rgba(255,157,46,0.5)"
                : "0 0 6px rgba(145,166,198,0.5)",
              width: 5,
              height: 5,
            }}
          />
          <span className="hud-label" style={{ fontSize: 7, color: isUser ? "var(--friday-accent)" : "var(--friday-steel)" }}>
            {isUser ? "USER" : "FRIDAY"}
          </span>
        </div>

        {/* File attachments */}
        {hasFiles && (
          <div className="mb-2">
            {files.map((file, i) => (
              <FileAttachmentCard key={i} file={file} />
            ))}
          </div>
        )}

        {/* Message with markdown */}
        {message && (
          <div className="chat-message-content" style={{ fontSize: 13, lineHeight: 1.7, color: "var(--friday-text)" }}>
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeString = String(children).replace(/\n$/, "");

                  if (match) {
                    return (
                      <div className="relative my-2 rounded overflow-hidden" style={{ border: "1px solid var(--friday-border)" }}>
                        <div
                          className="flex items-center justify-between px-3 py-1"
                          style={{
                            background: "rgba(26, 35, 50, 0.8)",
                            borderBottom: "1px solid var(--friday-border)",
                          }}
                        >
                          <span className="annotation">{match[1].toUpperCase()}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(codeString);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="hud-btn rounded px-2 py-0.5"
                            style={{ fontSize: 7 }}
                          >
                            {copied ? "COPIED" : "COPY"}
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: 0,
                            background: "rgba(26, 35, 50, 0.6)",
                            fontSize: 12,
                            padding: "12px",
                          }}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }

                  return (
                    <code
                      className="rounded px-1.5 py-0.5"
                      style={{
                        background: "rgba(255, 157, 46, 0.1)",
                        color: "var(--friday-accent)",
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
                },
                li({ children }) {
                  return <li style={{ color: "var(--friday-text)" }}>{children}</li>;
                },
                h1({ children }) {
                  return <h1 className="hud-value text-lg mb-2">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="hud-value text-base mb-2">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="hud-accent text-sm mb-1">{children}</h3>;
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                      style={{ color: "var(--friday-accent)" }}
                    >
                      {children}
                    </a>
                  );
                },
                blockquote({ children }) {
                  return (
                    <blockquote
                      className="pl-3 my-2"
                      style={{
                        borderLeft: "2px solid var(--friday-accent)",
                        color: "var(--friday-text-muted)",
                      }}
                    >
                      {children}
                    </blockquote>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-2">
                      <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th
                      className="text-left px-3 py-1.5"
                      style={{
                        background: "rgba(255, 157, 46, 0.08)",
                        border: "1px solid var(--friday-border)",
                        color: "var(--friday-accent)",
                        fontFamily: "var(--font-hud)",
                        fontSize: 10,
                      }}
                    >
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="px-3 py-1.5" style={{ border: "1px solid var(--friday-border)" }}>
                      {children}
                    </td>
                  );
                },
              }}
            >
              {message}
            </ReactMarkdown>
          </div>
        )}

        {/* Action buttons */}
        {!isUser && isLast && onRegenerate && (
          <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid var(--friday-border)" }}>
            <button
              onClick={handleCopy}
              className="hud-btn rounded px-2 py-1 flex items-center gap-1"
              style={{ fontSize: 8 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 10, height: 10 }}>
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
              {copied ? "COPIED" : "COPY"}
            </button>
            <button
              onClick={() => onRegenerate(index)}
              className="hud-btn rounded px-2 py-1 flex items-center gap-1"
              style={{ fontSize: 8 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 10, height: 10 }}>
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
              REGENERATE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
