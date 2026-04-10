"use client";

import { useState, useRef, useEffect } from "react";

interface InputAreaProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export default function InputArea({ onSendMessage, isLoading }: InputAreaProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-3 shadow-md border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition-all duration-300">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Nexus AI..."
        rows={1}
        className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white px-2 resize-none max-h-32 overflow-y-auto w-full leading-relaxed placeholder-gray-500 dark:placeholder-gray-400"
        disabled={isLoading}
        style={{ minHeight: "24px" }}
      />

      <button
        onClick={handleSend}
        disabled={!input.trim() || isLoading}
        className={`ml-2 p-2 rounded-full shadow hover:shadow-md transition-all flex items-center justify-center shrink-0 w-8 h-8 mb-0.5
          ${input.trim() && !isLoading ? "bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400" : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 translate-x-[1px]">
          <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
        </svg>
      </button>
    </div>
  );
}