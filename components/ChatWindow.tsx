"use client"; // Enables client-side rendering (required for hooks like useState, useEffect)

import { useState, useEffect, useRef } from "react";
import Message from "./Message";
import InputArea from "./InputArea";
import TypingIndicator from "./TypingIndicator";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

/**
 * MessageType defines the structure of a chat message
 */
interface MessageType {
  id: string;
  role: "user" | "assistant"; // Who sent the message
  content: string;            // Message text
  timestamp: Date | string;   // Time of message
}

/**
 * @component ChatWindow
 * @desc Main chat interface handling UI, state management, and API interaction
 */
export default function ChatWindow() {

  // ---------------- STATE MANAGEMENT ----------------

  const [messages, setMessages] = useState<MessageType[]>([]); // Stores chat history
  const [isLoading, setIsLoading] = useState(false);           // Tracks API loading state
  const [isDarkMode, setIsDarkMode] = useState(true);          // Theme toggle
  const [showProfileMenu, setShowProfileMenu] = useState(false); // Profile dropdown visibility
  const [isChatOpen, setIsChatOpen] = useState(false);         // Controls welcome vs chat UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);   // Sidebar visibility

  // ---------------- REFS ----------------

  const messagesEndRef = useRef<HTMLDivElement>(null); // Used for auto-scrolling
  const profileMenuRef = useRef<HTMLDivElement>(null); // Used for detecting outside clicks

  /**
   * Scrolls chat to the latest message
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll when messages or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  /**
   * Handles dark mode toggle by adding/removing 'dark' class
   */
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  /**
   * Closes profile menu when clicking outside of it
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup event listener
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Handles sending user message and receiving AI response
   */
  const handleSendMessage = async (content: string) => {
    setIsChatOpen(true);

    // Generate temporary unique ID
    const tempId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString() + Math.random();

    // Create user message object
    const tempUserMessage: MessageType = {
      id: tempId,
      role: "user",
      content,
      timestamp: new Date(),
    };

    // Add user message to UI immediately
    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      // Send message to backend API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      // Normalize AI response message
      const aiMessage: MessageType = {
        ...data.message,
        id:
          data.message.id ||
          data.message._id ||
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString() + Math.random()),
      };

      // Add AI response to chat
      setMessages((prev) => [...prev, aiMessage]);

    } catch (error: any) {
      console.error("Chat API Error:", error);

      // Show error message inside chat UI
      const errorMessage: MessageType = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString() + Math.random(),
        role: "assistant",
        content: `⚠️ Sorry, I encountered an error: ${error.message || "Could not connect to server."
          }`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);

    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  // ---------------- UI RENDER ----------------

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center px-4 md:px-6 py-3 border-b shadow-sm sticky top-0 z-20">

        {/* LEFT SIDE: Menu + Title */}
        <div className="flex items-center gap-2">

          {/* Sidebar Toggle Button */}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Chat Back Button */}
          {isChatOpen && (
            <button onClick={() => setIsChatOpen(false)}>
              ←
            </button>
          )}

          <h1 className="text-xl font-bold">Nexus AI</h1>
        </div>

        {/* RIGHT SIDE: Theme + Profile */}
        <div className="flex items-center gap-4">

          {/* Theme Toggle */}
          <button onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? "☀️" : "🌙"}
          </button>

          {/* Profile Menu */}
          <div ref={profileMenuRef}>
            <button onClick={() => setShowProfileMenu(!showProfileMenu)}>
              AJ
            </button>

            {/* Dropdown */}
            {showProfileMenu && (
              <div>
                <button onClick={() => setShowProfileMenu(false)}>
                  Account Details
                </button>
                <button onClick={() => setShowProfileMenu(false)}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex flex-col flex-1">

        {/* Welcome Screen OR Chat Messages */}
        {!isChatOpen ? (
          <div>
            <h2>Welcome to Nexus AI</h2>

            {/* Quick Action Buttons */}
            {["Chat", "Research", "Code", "Images"].map((text) => (
              <button key={text} onClick={() => handleSendMessage(text)}>
                {text}
              </button>
            ))}
          </div>
        ) : (
          <div>
            {/* Render Messages */}
            {messages.map((msg, index) => (
              <Message
                key={msg.id || index}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))}

            {/* Typing Indicator */}
            {isLoading && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* INPUT AREA */}
        <InputArea
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>

      {/* SIDEBAR */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </div>
  );
}