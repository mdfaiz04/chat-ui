"use client"; // Enables client-side rendering (required for React hooks)

import { useState, useRef, useEffect } from "react";

/**
 * Props for InputArea component
 */
interface InputAreaProps {
  onSendMessage: (message: string) => void; // Function to send message to parent
  isLoading: boolean;                       // Indicates if API call is in progress
}

/**
 * @component InputArea
 * @desc Handles user input, message sending, and textarea behavior
 */
export default function InputArea({ onSendMessage, isLoading }: InputAreaProps) {

  // ---------------- STATE ----------------

  const [input, setInput] = useState(""); // Stores user input text

  // ---------------- REFS ----------------

  const textareaRef = useRef<HTMLTextAreaElement>(null); // Reference for textarea (used for auto-resize)

  /**
   * Auto-resizes textarea based on content
   * Limits maximum height to 120px
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // Reset height
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`; // Adjust height dynamically
    }
  }, [input]);

  /**
   * Handles sending message
   * - Prevents sending empty messages
   * - Prevents sending while loading
   */
  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    onSendMessage(input.trim()); // Send message to parent
    setInput("");                // Clear input field
  };

  /**
   * Handles keyboard interaction
   * - Enter → Send message
   * - Shift + Enter → New line
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent newline
      handleSend();
    }
  };

  // ---------------- UI ----------------

  return (
    <div className="flex items-end bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-3 shadow-md border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-400 transition-all duration-300">

      {/* TEXTAREA INPUT */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)} // Update input state
        onKeyDown={handleKeyDown}                  // Handle Enter key
        placeholder="Message Nexus AI..."
        rows={1}
        disabled={isLoading} // Disable during API call
        className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white px-2 resize-none max-h-32 overflow-y-auto w-full leading-relaxed placeholder-gray-500 dark:placeholder-gray-400"
        style={{ minHeight: "24px" }}
      />

      {/* SEND BUTTON */}
      <button
        onClick={handleSend}
        disabled={!input.trim() || isLoading} // Disable if empty or loading
        className={`ml-2 p-2 rounded-full shadow transition-all flex items-center justify-center shrink-0 w-8 h-8
          ${input.trim() && !isLoading
            ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
            : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
          }`}
      >
        {/* Send Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
        </svg>
      </button>
    </div>
  );
}