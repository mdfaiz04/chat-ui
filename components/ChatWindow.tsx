"use client";

import { useState, useEffect, useRef } from "react";
import Message from "./Message";
import InputArea from "./InputArea";
import TypingIndicator from "./TypingIndicator";

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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

  const handleClearChat = async () => {
    try {
      setMessages([]);
      setShowClearConfirm(false);
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }
  };

  const handleSendMessage = async (content: string) => {
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

  const isEmpty = messages.length === 0;

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 overflow-hidden">
      {/* HEADER */}
      <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800 shadow-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-md sticky top-0 z-20 shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Nexus AI</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="text-xl p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title="Toggle Theme"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          {!isEmpty && (
            <button
               onClick={() => setShowClearConfirm(true)}
               className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition"
             >
               Clear Chat
             </button>
           )}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-blue-400 text-white rounded-full flex items-center justify-center font-semibold shadow-sm hover:shadow transition cursor-pointer"
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

      {showClearConfirm && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-6 py-3 flex justify-between items-center border-b border-red-100 dark:border-red-900/30 shrink-0">
          <span className="text-sm font-medium">Are you sure you want to clear all messages?</span>
          <div className="flex gap-4 text-sm font-semibold">
            <button onClick={() => setShowClearConfirm(false)} className="hover:opacity-80">Cancel</button>
            <button onClick={handleClearChat} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition shadow-sm">Confirm</button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex flex-col flex-1 w-full max-w-4xl mx-auto min-h-0 p-4 md:p-6 relative">
        <div className="flex flex-col w-full h-full bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          
          <div className={`flex flex-col w-full transition-all duration-500 ease-in-out px-4 md:px-6 relative ${isEmpty ? "flex-1 justify-center" : "flex-1 block overflow-y-auto pb-4 custom-scrollbar"}`}>
            {isEmpty ? (
              <div className="w-full flex justify-center text-center py-10">
                <div className="max-w-2xl w-full flex flex-col items-center">
                  <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                    Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Nexus AI</span>
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-10 text-lg">
                    Your Intelligent Partner for Chats, Insights, and Creativity
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full opacity-90 animate-fade-in-up">
                    {["✨ Chat & Brainstorm", "🔍 Research & Summarize", "💻 Code & Develop", "🎨 Create Images"].map((text) => (
                      <button key={text} className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 p-4 rounded-2xl transition border border-gray-200 dark:border-gray-700 text-left cursor-text text-sm md:text-base font-medium shadow-sm hover:shadow-md">
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-6 space-y-3">
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
          <div className="w-full bg-white dark:bg-gray-800 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
            <div className="text-center mt-3 text-xs text-gray-400 dark:text-gray-500">
              Nexus AI can make mistakes. Consider verifying important information.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}