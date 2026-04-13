"use client"; // Enables client-side rendering (required for hooks like useState, useEffect)

import { useState, useEffect, useRef } from "react";
import Message from "./Message";
import InputArea from "./InputArea";
import TypingIndicator from "./TypingIndicator";
import Sidebar from "./Sidebar";
import { Menu, ArrowLeft } from "lucide-react";

/**
 * MessageType defines the structure of a chat message
 */
interface MessageType {
  id: string | number;
  role: "user" | "assistant"; // Who sent the message
  content: string;            // Message text
  timestamp: Date | string;   // Time of message
  image?: string;             // Optional image URL
}


/**
 * @component ChatWindow
 * @desc Main chat interface handling UI, state management, and API interaction
 */
export default function ChatWindow() {

  // ---------------- STATE MANAGEMENT ----------------

  const [messages, setMessages] = useState<MessageType[]>([]); // Stores chat history
  const [isLoading, setIsLoading] = useState(false);           // Tracks API loading state
  const [isDarkMode, setIsDarkMode] = useState(false);          // Theme toggle (default to light)
  const [showProfileMenu, setShowProfileMenu] = useState(false); // Profile dropdown visibility
  const [isChatOpen, setIsChatOpen] = useState(false);         // Controls welcome vs chat UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);   // Sidebar visibility
  const [selectedModel, setSelectedModel] = useState("Gemini 3 Flash"); // Selected AI model



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
   * Enforces LIGHT mode on first load as per requirements
   */
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
    setIsDarkMode(false);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
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
        body: JSON.stringify({ 
          message: content, 
          model: selectedModel 
        }),
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
    <div className="min-h-[100dvh] flex flex-col bg-gray-50 dark:bg-gradient-to-b dark:from-[#0f172a] dark:to-[#020617] text-gray-900 dark:text-white transition-colors duration-300">

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center px-4 md:px-6 py-3 border-b border-gray-200 dark:border-white/10 shadow-sm sticky top-0 z-20 bg-white dark:bg-transparent dark:backdrop-blur-xl">

        {/* LEFT SIDE: Menu + Title */}
        <div className="flex items-center gap-2">

          {/* Sidebar Toggle Button */}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Chat Back Button */}
          {isChatOpen && (
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-all duration-200 text-gray-600 dark:text-white/80"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Nexus AI</h1>
          </div>


        </div>

        {/* RIGHT SIDE: Theme + Profile */}
        <div className="flex items-center gap-4">

          {/* Premium Theme Toggle Button */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-zinc-700/50 
                       bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md 
                       shadow-sm hover:shadow-md hover:shadow-blue-500/20 hover:scale-105 
                       transition-all duration-300 text-gray-700 dark:text-zinc-200"
          >
            {/* ICON - Instant change with rotation effect */}
            <span className="text-base transition-transform duration-300">
              {isDarkMode ? "☀️" : "🌙"}
            </span>

            {/* TEXT - Dynamic Label */}
            <span className="text-xs font-semibold whitespace-nowrap hidden sm:inline">
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </span>
          </button>



          {/* Profile Menu */}
          <div ref={profileMenuRef} className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center"
            >
              AJ
            </button>

            {/* Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Account Details
                </button>
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CENTERED CONTENT WRAPPER */}
      <div className="flex flex-col flex-1 max-w-3xl mx-auto mt-10 px-4 w-full">

        {/* Welcome Screen OR Chat Messages */}
        {!isChatOpen ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl shadow-sm dark:shadow-2xl dark:backdrop-blur-xl p-8">

            {/* Gradient Heading */}
            <h2 className="text-4xl font-extrabold mb-3 text-center text-gray-900 dark:text-white">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                Nexus AI
              </span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-center text-sm">
              Choose a mode to get started
            </p>

            {/* 2×2 Feature Card Grid */}
            {(() => {
              const options = [
                { icon: "✨", label: "Chat & Brainstorm",    prompt: "Chat" },
                { icon: "🔍", label: "Research & Summarize", prompt: "Research" },
                { icon: "💻", label: "Code & Develop",       prompt: "Code" },
                { icon: "🎨", label: "Create Images",        prompt: "Images" },
              ];

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full">
                  {options.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white p-4 rounded-2xl shadow-md dark:shadow-[0_8px_25px_rgba(0,0,0,0.4)] transition-all duration-200 cursor-pointer flex items-center gap-3 select-none"
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-base font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-y-auto py-4 gap-2">
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

        {/* INPUT AREA — fixed inside centered container */}
        <div className="py-4">
          <InputArea
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            setMessages={setMessages}
          />


        </div>
      </div>

      {/* SIDEBAR */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </div>
  );
}