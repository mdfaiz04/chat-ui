"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Message from "./Message";
import InputArea from "./InputArea";
import TypingIndicator from "./TypingIndicator";
import { ChevronDown, Moon, Sun, Sparkles, Zap, Shield, Command, Globe, Info, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_MODEL } from "@/lib/models";
import { useSidebar } from "@/lib/context/SidebarContext";

interface MessageType {
  _id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string | Date;
}

export default function ChatWindow() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const threadId = params?.threadId as string;
  const { isOpen, toggle } = useSidebar();

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [authError, setAuthError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadId) {
      loadThreadMessages();
    } else {
      setMessages([]);
    }
  }, [threadId]);

  const loadThreadMessages = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/messages?threadId=${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to load thread:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
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

  const handleSendMessage = async (content: string) => {
    if (!session?.user) {
      setAuthError("Please sign in to continue.");
      return;
    }

    let currentThreadId = threadId;
    if (!currentThreadId) {
      try {
        const threadRes = await fetch("/api/thread/new", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: content.slice(0, 40) + "..." }),
        });
        if (threadRes.ok) {
          const newThread = await threadRes.json();
          currentThreadId = newThread._id;
        } else {
          throw new Error("Failed to create thread");
        }
      } catch (err) {
        setAuthError("Failed to start conversation.");
        return;
      }
    }

    const tempUserMsg: MessageType = {
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          threadId: currentThreadId,
          model: selectedModel,
        }),
      });

      if (!response.ok) throw new Error("Our intelligence systems are experiencing high traffic.");

      const reply = await response.text();
      const aiMsg: MessageType = {
        role: "assistant",
        content: reply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (!threadId && currentThreadId) {
        router.push(`/chat/${currentThreadId}`);
      }
    } catch (error: any) {
      setAuthError(error.message);
      setTimeout(() => setAuthError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const isWelcomeScreen = !params?.threadId && messages.length === 0 && !isLoading;

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#05070d] relative overflow-hidden transition-colors duration-500">


      {/* Dynamic Background Accents */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-blue-50/50 dark:from-blue-600/5 to-transparent pointer-events-none" />
      <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header - Transparent Glass */}
      <header className="h-20 flex items-center justify-between px-8 bg-white/40 dark:bg-black/20 backdrop-blur-2xl z-20 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-blue-500"
            title={isOpen ? "Hide Sidebar" : "Show Sidebar"}
          >
            {isOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>

          <div className="flex flex-col">
            <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">
              {params?.threadId ? "Conversation" : "Nexus Hub"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 shadow-sm text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-105 active:scale-95"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {isWelcomeScreen ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="max-w-3xl w-full -mt-20">
                <div className="relative mb-8 inline-block">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 rounded-[2rem] blur-2xl"
                  />
                  <div className="relative w-16 h-16 bg-white dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center shadow-2xl border border-gray-100 dark:border-white/10 mx-auto">
                    <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-6 tracking-tight leading-[1.1]">
                  How can I <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">help you</span> today?
                </h1>

                <p className="text-base md:text-lg text-gray-500 dark:text-zinc-400 max-w-lg mx-auto font-medium leading-relaxed">
                  Experience the next generation of artificial intelligence.
                  Start a conversation to unlock creative potential.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 overflow-y-auto custom-scrollbar relative"
            >
              <div className="max-w-4xl mx-auto px-6 pt-12 pb-48 flex flex-col gap-10">
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg._id || i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <Message
                      role={msg.role}
                      content={msg.content}
                      timestamp={msg.createdAt}
                    />
                  </motion.div>
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="absolute bottom-0 inset-x-0 p-8 pt-20 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-[#05070d] dark:via-[#05070d]/80 dark:to-transparent z-30 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <InputArea
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            setMessages={setMessages}
          />
          <div className="mt-4 flex items-center justify-center gap-4 text-[9px] font-black text-gray-400 dark:text-zinc-600 uppercase tracking-widest">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Real-time Response</span>
            <span className="flex items-center gap-1"><Info className="w-3 h-3" /> AI may generate errors</span>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100]"
          >
            <div className="bg-rose-600 text-white px-8 py-4 rounded-3xl shadow-[0_20px_40px_rgba(225,29,72,0.3)] flex items-center gap-4 border border-rose-500/50 backdrop-blur-md">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="w-3 h-3" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">{authError}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}