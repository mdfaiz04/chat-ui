"use client"; // Enables client-side rendering (required for hooks like useState, useEffect)

import { useState, useEffect, useRef } from "react";
import Message from "./Message";
import InputArea from "./InputArea";
import TypingIndicator from "./TypingIndicator";
import Sidebar from "./Sidebar";
import { Menu, ArrowLeft, Plus, PlusCircle } from "lucide-react";



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



  const [chatId, setChatId] = useState<string | null>(null); // Current session ID

  // ---------------- REFS ----------------

  const messagesEndRef = useRef<HTMLDivElement>(null); // Used for auto-scrolling
  const profileMenuRef = useRef<HTMLDivElement>(null); // Used for detecting outside clicks

  /**
   * Generates a new unique chat session
   */
  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    setChatId(newId);
    setMessages([]);
    setIsChatOpen(false);
  };

  /**
   * Specific function to load a chat session from Sidebar
   */
  const loadChat = async (id: string) => {
    try {
      setIsSidebarOpen(false);
      setIsLoading(true);
      const response = await fetch(`/api/messages?chatId=${id}`);
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
        setChatId(id);
        setIsChatOpen(true);
      }
    } catch (error) {
      console.error("Failed to load chat session:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
    // Initial theme setup
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
    setIsDarkMode(false);
    
    // Initialize first chatId
    if (!chatId) setChatId(crypto.randomUUID());
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
   * Clears all messages from DB and local state
   */
  const handleClearChat = async () => {
    if (!window.confirm("Are you sure you want to clear all chat history?")) return;
    
    try {
      const response = await fetch("/api/messages", { method: "DELETE" });
      if (response.ok) {
        setMessages([]);
        setIsChatOpen(false);
        setChatId(crypto.randomUUID()); // Reset with new ID
      }
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }
  };

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
    console.log("SENDING MESSAGE:", content);
    setIsChatOpen(true);

    const tempId = Date.now().toString() + Math.random();

    const tempUserMessage: MessageType = {
      id: tempId,
      role: "user",
      content,
      timestamp: new Date(),
    };

    // Update locally
    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      console.log("Calling API at /api/chat...");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: content, 
          model: selectedModel,
          chatId: chatId 
        }),

      });

      const data = await response.json();
      console.log("API Response received:", data);

      if (!response.ok) throw new Error(data.error);

      const aiMessage: MessageType = {
        ...data.message,
        id: data.message.id || Date.now().toString() + Math.random(),
      };

      setMessages((prev) => [...prev, aiMessage]);

    } catch (error: any) {
      console.error("Chat Window Error:", error);
      const errorMessage: MessageType = {
        id: Date.now().toString() + Math.random(),
        role: "assistant",
        content: `⚠️ Error: ${error.message || "Something went wrong."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  // ---------------- UI RENDER ----------------

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 dark:bg-gradient-to-b dark:from-[#0f172a] dark:to-[#020617] text-gray-900 dark:text-white transition-colors duration-300 overflow-hidden">

      {/* HEADER SECTION - Fixed at top */}
      <header className="flex-shrink-0 justify-between items-center px-4 md:px-6 py-3 border-b border-gray-200 dark:border-white/10 shadow-sm z-30 bg-white dark:bg-[#0f172a] dark:backdrop-blur-xl flex">

        {/* LEFT SIDE: Menu + Title */}
        <div className="flex items-center gap-2">

          {/* Sidebar Toggle Button */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-500" />
          </button>

          {/* Premium New Chat Button */}
          <button
            onClick={handleNewChat}
            title="Start a new conversation"
            className="flex items-center gap-2 px-3 py-1.5 md:px-5 md:py-2.5 
                       rounded-full border border-gray-200 dark:border-zinc-700/50 
                       bg-white dark:bg-zinc-800 shadow-sm
                       hover:bg-gray-50 dark:hover:bg-zinc-700 
                       hover:scale-105 active:scale-95
                       hover:shadow-md hover:shadow-blue-500/10
                       transition-all duration-200 group"
          >
            <PlusCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-500 group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-xs md:text-sm font-semibold tracking-wide text-gray-700 dark:text-zinc-200 hidden sm:inline">
              New Chat
            </span>
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
            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-200 dark:border-zinc-700/50 
                       bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md 
                       shadow-sm hover:shadow-md hover:shadow-blue-500/20 hover:scale-105 
                       transition-all duration-300 text-gray-700 dark:text-zinc-200"
          >
            <span className="text-base transition-transform duration-300">
              {isDarkMode ? "☀️" : "🌙"}
            </span>
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
                  onClick={() => {
                    handleClearChat();
                    setShowProfileMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Clear Chat History
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
      </header>

      {/* SCROLLABLE CONTENT AREA */}
      <main className="flex-1 overflow-y-auto w-full relative custom-scrollbar messages-scroll">
        <div className="max-w-3xl mx-auto px-4 pt-10 pb-32 md:pb-10 w-full flex flex-col h-full min-h-0">

          {/* Welcome Screen OR Chat Messages */}
          {!isChatOpen ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl shadow-sm dark:shadow-2xl dark:backdrop-blur-xl p-6 md:p-8">

              {/* Gradient Heading */}
              <h2 className="text-3xl md:text-4xl font-extrabold mb-3 text-center text-gray-900 dark:text-white leading-tight">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  Nexus AI
                </span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-center text-sm md:text-base">
                Choose a mode to get started
              </p>

              {/* 2×2 Feature Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {[
                  { icon: "✨", label: "Chat & Brainstorm",    prompt: "Chat" },
                  { icon: "🔍", label: "Research & Summarize", prompt: "Research" },
                  { icon: "💻", label: "Code & Develop",       prompt: "Code" },
                  { icon: "🎨", label: "Create Images",        prompt: "Images" },
                ].map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white p-4 rounded-2xl shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3 select-none"
                  >
                    <span className="text-xl md:text-2xl">{item.icon}</span>
                    <span className="text-sm md:text-base font-semibold">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Render Messages */}
              {messages.map((msg, index) => (
                <Message
                  key={msg.id || index}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  image={msg.image}
                />
              ))}

              {/* Typing Indicator */}
              {isLoading && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* INPUT AREA — Fixed/Sticky at the bottom */}
      <footer className="flex-shrink-0 z-30 w-full max-w-3xl mx-auto px-4 py-4 sticky bottom-0 bg-gray-50 dark:bg-transparent">
        <InputArea
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          setMessages={setMessages}
        />
      </footer>

      {/* SIDEBAR */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectChat={loadChat}
      />

    </div>
  );
}