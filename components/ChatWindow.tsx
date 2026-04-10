"use client";

import { useState, useEffect, useRef } from "react";
import Message from "./Message";
import InputArea from "./InputArea";
import TypingIndicator from "./TypingIndicator";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

interface MessageType {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // default dark
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const handleSendMessage = async (content: string) => {
    setIsChatOpen(true);
    const tempId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random();
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
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      // Ensure the received message object conforms to MessageType (using id)
      const aiMessage: MessageType = {
        ...data.message,
        id: data.message.id || data.message._id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random()),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error("Chat API Error:", error);
      
      // Handle errors gracefully by displaying them in the chat UI
      const errorMessage: MessageType = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
        role: "assistant", // Using assistant role to show it as a received reply
        content: `⚠️ Sorry, I encountered an error: ${error.message || "Could not connect to server."}`,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* HEADER */}
      <div className="flex justify-between items-center px-4 md:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-110"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {isChatOpen && (
            <div className="relative group flex items-center animate-fade-in-up">
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
                aria-label="Go back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-700 dark:text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs px-2 py-1 rounded-md bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 shadow-md whitespace-nowrap pointer-events-none z-50">
                Back
              </div>
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight">Nexus AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="text-xl p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
            title="Toggle Theme"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-blue-400 text-white rounded-full flex items-center justify-center font-semibold shadow-sm hover:opacity-90 transition cursor-pointer"
            >
              AJ
            </button>
            
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-fade-in-up">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700/50 mb-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">AJ Profile</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">aj@example.com</p>
                </div>
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition cursor-pointer"
                >
                  Your Account Details
                </button>
                <div className="my-1 border-t border-gray-100 dark:border-gray-700/50"></div>
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* MAIN CONTAINER */}
      <div className="flex flex-col flex-1 w-full max-w-3xl mx-auto h-full px-4 relative">
        <div className={`flex flex-col w-full transition-all duration-500 ease-in-out ${!isChatOpen ? "flex-1 justify-center pb-20" : "flex-1 block overflow-y-auto pb-4 custom-scrollbar"}`}>
          {!isChatOpen ? (
            <div className="w-full flex justify-center text-center">
              <div className="max-w-2xl w-full flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                  Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Nexus AI</span>
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-10 text-lg">
                  Your Intelligent Partner for Chats, Insights, and Creativity
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full opacity-90 animate-fade-in-up">
                  {["✨ Chat & Brainstorm", "🔍 Research & Summarize", "💻 Code & Develop", "🎨 Create Images"].map((text) => (
                    <button key={text} onClick={() => handleSendMessage(text)} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-4 rounded-2xl transition border border-gray-200 dark:border-gray-700 text-left cursor-text text-sm md:text-base font-medium shadow-sm">
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-6 space-y-3 pb-2">
              {messages.map((msg, index) => (
                <Message
                  key={msg.id || `fallback-${index}`}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
        
        {/* INPUT AREA */}
        <div className={`w-full bg-gray-100 dark:bg-gray-900 pb-6 pt-2 shrink-0 ${!isChatOpen ? "" : "sticky bottom-0 z-10"}`}>
          <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
          <div className="text-center mt-3 text-xs text-gray-400 dark:text-gray-500">
            Nexus AI can make mistakes. Consider verifying important information.
          </div>
        </div>
      </div>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}