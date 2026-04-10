"use client";

// useState to track whether the message was just copied
import { useState } from "react";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
}

export default function Message({ role, content, timestamp }: MessageProps) {

  // Track if this specific message was just copied
  // When true, we show "Copied!" instead of the copy icon
  const [copied, setCopied] = useState(false);

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isUser = role === "user";

  // This function copies the message text to the user's clipboard
  const handleCopy = async () => {
    try {
      // navigator.clipboard is the browser's built-in clipboard API
      await navigator.clipboard.writeText(content);

      // Show "Copied!" feedback for 2 seconds then reset
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // After 2000ms (2s), set back to false
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    // "message-animate" applies our custom fade-in animation from globals.css
    <div className={`flex w-full mb-4 message-animate ${isUser ? "justify-end" : "justify-start"}`}>

      {/* Bot avatar — only show on the LEFT side (bot messages) */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center
                        text-white text-xs font-bold mr-2 flex-shrink-0 self-end mb-5">
          AI
        </div>
      )}

      <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>

        {/* Role label above the bubble */}
        <span className="text-xs text-gray-400 dark:text-gray-500 mb-1 px-1">
          {isUser ? "You" : "AI Assistant"}
        </span>

        {/* Message bubble */}
        {/* "group" is a Tailwind trick — lets child elements react to hovering the parent */}
        <div className="relative group">
          <div
            className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser
              ? "bg-blue-500 text-white rounded-br-none"
              : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none"
              }`}
          >
            {content}
          </div>

          {/* Copy button — hidden by default, appears on hover */}
          {/* "opacity-0 group-hover:opacity-100" = invisible until parent is hovered */}
          <button
            onClick={handleCopy}
            className={`absolute -top-2 ${isUser ? "-left-8" : "-right-8"}
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600
                        rounded-full p-1 shadow-sm hover:bg-gray-50`}
            title="Copy message" // Tooltip on hover
          >
            {/* Show checkmark when copied, clipboard icon when not */}
            {copied ? (
              // Checkmark SVG icon
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              // Clipboard SVG icon
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
          {formattedTime}
        </span>

      </div>

      {/* User avatar — only show on the RIGHT side (user messages) */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center
                        justify-center text-gray-600 dark:text-gray-300 text-xs font-bold
                        ml-2 flex-shrink-0 self-end mb-5">
          You
        </div>
      )}

    </div>
  );
}