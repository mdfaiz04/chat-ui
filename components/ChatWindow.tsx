"use client"; // Enables client-side rendering (required for hooks like useState, useEffect)

import { useState, useEffect, useRef } from "react";
import Message from "./Message";
import InputArea from "./InputArea";
import TypingIndicator from "./TypingIndicator";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [mounted, setMounted] = useState(false); // Hydration fix

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
    setMounted(true);
    // Initial theme setup (LIGHT mode only on load)
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Handles sending user message and receiving AI response
   */
  const handleSendMessage = async (content: string) => {
    setIsChatOpen(true);

    const tempId = Date.now().toString() + Math.random();

    const tempUserMessage: MessageType = {
      id: tempId,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-[#0a0f1f] dark:via-[#05070d] dark:to-black text-gray-900 dark:text-white transition-all duration-500 ease-in-out overflow-hidden relative"
    >

      {/* DYNAMIC BACKGROUND BLUR EFFECTS */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-600/10 blur-[130px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 dark:bg-purple-600/10 blur-[130px] rounded-full -z-10 animate-pulse" style={{ animationDelay: '3s' }} />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-500/5 dark:bg-cyan-600/10 blur-[100px] rounded-full -z-10" />


      {/* HEADER SECTION - Fixed at top */}
      <header className="flex-shrink-0 justify-between items-center px-4 md:px-6 py-3 border-b border-gray-200/50 dark:border-white/5 shadow-sm z-30 backdrop-blur-md bg-white/60 dark:bg-black/40 sticky top-0 flex">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent shadow-[0_1px_10px_rgba(59,130,246,0.3)]" />

        {/* LEFT SIDE: Menu + Title */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Nexus AI</h1>
          </div>
        </div>

        {/* RIGHT SIDE: Theme + Profile */}
        <div className="flex items-center gap-4">

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-200 dark:border-zinc-700/50 
                       bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md 
                       shadow-sm hover:translate-y-[-1px] transition-all duration-300 text-gray-700 dark:text-zinc-200"
          >
            <span className="text-base">
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
      <main className="flex-1 overflow-y-auto w-full relative custom-scrollbar messages-scroll flex flex-col">
        <div 
          className={`flex-1 flex flex-col w-full h-full min-h-0 ${isChatOpen ? 'max-w-4xl mx-auto px-4 pt-24 pb-40 md:pb-4' : ''}`}
          style={isChatOpen ? { paddingBottom: "calc(160px + env(safe-area-inset-bottom))" } : {}}
        >

        {!isChatOpen ? (
          // MINIMAL INPUT-FOCUSED HERO LAYOUT
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            
            {/* Center Section: Heading & Subtext */}
            <div className="flex flex-col items-center text-center max-w-4xl w-full">
              <motion.h2 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent leading-tight tracking-tight mb-4"
              >
                Welcome to Nexus AI
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-gray-500 dark:text-gray-400 text-lg md:text-xl font-medium max-w-2xl px-4 mb-6"
              >
                The next generation of intelligent assistance. Experience the future of conversation.
              </motion.p>

              {/* Centered Input Area - Primary Focus */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="w-full max-w-3xl mt-8"
              >
                <InputArea
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  setMessages={setMessages}
                />
              </motion.div>
            </div>

            {/* Subtle Particles Overlay */}
            {mounted && (
              <div className="absolute inset-0 pointer-events-none -z-10 opacity-20 dark:opacity-30">
                {[...Array(15)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute rounded-full bg-blue-400 dark:bg-blue-500 animate-float"
                    style={{
                      width: Math.random() * 4 + 2 + 'px',
                      height: Math.random() * 4 + 2 + 'px',
                      left: Math.random() * 100 + '%',
                      top: Math.random() * 100 + '%',
                      animationDuration: Math.random() * 10 + 10 + 's',
                      animationDelay: Math.random() * 5 + 's',
                      opacity: Math.random() * 0.5 + 0.1
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg, index) => (
                <Message
                  key={msg.id || index}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  image={msg.image}
                />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {isChatOpen && (
        <footer className="fixed bottom-4 left-0 right-0 px-4 z-30">
          <div className="max-w-4xl mx-auto">
            <InputArea
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              setMessages={setMessages}
            />
          </div>
        </footer>
      )}

      {/* SIDEBAR */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectChat={loadChat}
        onSendMessage={handleSendMessage}
        onNewChat={handleNewChat}
      />

    </motion.div>
  );
}