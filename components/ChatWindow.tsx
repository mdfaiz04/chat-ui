"use client"; // Enables client-side rendering (required for hooks like useState, useEffect)

import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Message from "./Message";
import InputArea from "./InputArea";
import TypingIndicator from "./TypingIndicator";
import Sidebar from "./Sidebar";
import { Menu, LogIn, LogOut, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_MODEL } from "@/lib/models";

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

  // ---------------- AUTH ----------------
  const { data: session, status } = useSession();

  // ---------------- STATE MANAGEMENT ----------------

  const [messages, setMessages] = useState<MessageType[]>([]); // Stores chat history
  const [isLoading, setIsLoading] = useState(false);           // Tracks API loading state
  const [isDarkMode, setIsDarkMode] = useState(false);          // Theme toggle (default to light)
  const [showProfileMenu, setShowProfileMenu] = useState(false); // Profile dropdown visibility
  const [isChatOpen, setIsChatOpen] = useState(false);         // Controls welcome vs chat UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);   // Sidebar visibility
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL); // Selected AI model
  const [chatId, setChatId] = useState<string | null>(null); // Current session ID
  const [mounted, setMounted] = useState(false); // Hydration fix
  const [authError, setAuthError] = useState<string | null>(null); // Auth error messages

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
   * Clears all messages for the current user via the clear chat API
   */
  const handleClearChat = async () => {
    if (!window.confirm("Are you sure you want to clear all chat history?")) return;

    try {
      const response = await fetch("/api/chat/clear", { method: "DELETE" });
      if (response.ok) {
        setMessages([]);
        setIsChatOpen(false);
        setChatId(crypto.randomUUID()); // Reset with new ID
      } else {
        const data = await response.json();
        setAuthError(data.error || "Failed to clear chat history.");
        setTimeout(() => setAuthError(null), 4000);
      }
    } catch (error) {
      console.error("Failed to clear chat:", error);
      setAuthError("Failed to clear chat history. Please try again.");
      setTimeout(() => setAuthError(null), 4000);
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
    // Check authentication before sending
    if (!session?.user) {
      setAuthError("Please sign in to send messages.");
      setTimeout(() => setAuthError(null), 4000);
      return;
    }

    setIsChatOpen(true);

    const tempId = Date.now().toString() + Math.random();

    const tempUserMessage: MessageType = {
      id: tempId,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    // 🔥 Add a placeholder for the AI's streaming response
    const aiMessageId = Date.now().toString() + "ai";
    const tempAiMessage: MessageType = {
      id: aiMessageId,
      role: "assistant",
      content: "", // Will be filled as stream arrives
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, tempAiMessage]);

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

      setIsLoading(false);

      // ── Handle 401 specifically ──
      if (response.status === 401) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: "⚠️ Please sign in to use the chat."
          };
          return updated;
        });
        setAuthError("Session expired. Please sign in again.");
        setTimeout(() => setAuthError(null), 4000);
        return;
      }

      // ── Handle non-OK responses (incl. 502 provider errors) ──
      if (!response.ok) {
        let errorData: { error?: string; details?: string };
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: await response.text() };
        }
        const errMsg = errorData.details || errorData.error || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      if (!response.body) throw new Error("No response body received.");

      // ── Stream the response ──
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        result += chunk;

        // Strip any leaked prompt fragments
        let safeResult = result.split("User:")[0];
        safeResult = safeResult.split("AI:")[0];
        safeResult = safeResult.replace("<|assistant|>", "").trimStart();
        safeResult = safeResult.replace("<|end|>", "");

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: safeResult
          };
          return updated;
        });
      }

    } catch (error: any) {
      console.error("[ChatWindow] Error:", error);
      setIsLoading(false);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `⚠️ ${error.message || "Something went wrong. Please try again."}`
        };
        return updated;
      });
    }
  };

  /**
   * Get user initials for avatar
   */
  const getUserInitials = () => {
    if (session?.user?.name) {
      const parts = session.user.name.split(" ");
      return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
    }
    return "?";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="h-[100dvh] flex flex-col bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-[#0a0f1f] dark:via-[#05070d] dark:to-black text-gray-900 dark:text-white transition-all duration-500 ease-in-out overflow-hidden relative"
    >

      {/* DYNAMIC BACKGROUND BLUR EFFECTS */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-600/10 blur-[130px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 dark:bg-purple-600/10 blur-[130px] rounded-full -z-10 animate-pulse" style={{ animationDelay: '3s' }} />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-500/5 dark:bg-cyan-600/10 blur-[100px] rounded-full -z-10" />

      {/* AUTH ERROR TOAST */}
      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-red-500/90 backdrop-blur-md text-white text-sm font-medium rounded-xl shadow-lg border border-red-400/30"
          >
            {authError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION - Standard block flow guarantees no overlap */}
      <header className="h-16 shrink-0 flex justify-between items-center px-4 md:px-6 border-b border-gray-200/50 dark:border-white/5 shadow-sm bg-white/95 dark:bg-black/95 backdrop-blur-md sticky top-0 z-50 relative">
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

        {/* RIGHT SIDE: Theme + Auth */}
        <div className="flex items-center gap-3">

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

          {/* AUTH: Sign In Button (when not logged in) */}
          {status === "loading" ? (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700 animate-pulse" />
          ) : !session ? (
            <button
              onClick={() => signIn("google")}
              id="sign-in-button"
              className="flex items-center gap-2 px-4 py-2 rounded-full
                         bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold
                         shadow-md hover:shadow-lg hover:translate-y-[-1px] 
                         active:scale-95 transition-all duration-300"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          ) : (
            /* AUTH: Profile Menu (when logged in) */
            <div ref={profileMenuRef} className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                id="profile-menu-button"
                className="flex items-center gap-2 px-2 py-1.5 rounded-full
                           hover:bg-gray-100 dark:hover:bg-zinc-800 
                           transition-all duration-200 group"
              >
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border-2 border-blue-500/30 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold flex items-center justify-center shadow-sm">
                    {getUserInitials()}
                  </div>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 hidden sm:block ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* DROPDOWN MENU */}
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15 }}
                    id="profile-dropdown"
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200/80 dark:border-zinc-700/50 z-50 overflow-hidden backdrop-blur-xl"
                  >
                    {/* Account Details Section */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        {session.user?.image ? (
                          <img
                            src={session.user.image}
                            alt="Profile"
                            className="w-10 h-10 rounded-full border-2 border-blue-500/20"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold flex items-center justify-center">
                            {getUserInitials()}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {session.user?.name || "User"}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {session.user?.email || ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          signOut();
                        }}
                        id="sign-out-button"
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      {/* SCROLLABLE CONTENT AREA - flex-1 and overflow-y-auto handle chat scrolling */}
      <main className="flex-1 overflow-y-auto w-full relative custom-scrollbar messages-scroll flex flex-col min-h-0">
        <div
          className={`flex-1 flex flex-col w-full h-full min-h-0 ${isChatOpen ? 'max-w-3xl mx-auto px-4 pt-4 pb-40 md:pb-4' : ''}`}
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
                  {session
                    ? `Hello, ${session.user?.name?.split(" ")[0] || "there"}! The next generation of intelligent assistance.`
                    : "Sign in with Google to experience the future of conversation."
                  }
                </motion.p>

                {/* Sign In Prompt (if not authenticated) */}
                {!session && status !== "loading" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="mb-8"
                  >
                    <button
                      onClick={() => signIn("google")}
                      className="flex items-center gap-3 px-8 py-3 rounded-full
                                 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 
                                 text-white text-base font-semibold
                                 shadow-lg hover:shadow-xl hover:translate-y-[-2px]
                                 active:scale-95 transition-all duration-300"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Sign in with Google
                    </button>
                  </motion.div>
                )}

                {/* Centered Input Area - Primary Focus (only show if authenticated) */}
                {session && (
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
                )}
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
            <div className="flex flex-col gap-4 pt-18 pb-10">
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

      {isChatOpen && session && (
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
        onClearHistory={handleClearChat}
      />

    </motion.div>
  );
}