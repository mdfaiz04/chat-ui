"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  LogOut, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Search, 
  Command, 
  Settings, 
  Sparkles,
  User,
  History,
  MoreVertical,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import { useSidebar } from "@/lib/context/SidebarContext";

interface Thread {
  _id: string;
  title: string;
  createdAt: string;
}

export default function Sidebar() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const { isOpen, setIsOpen } = useSidebar();
  
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const activeThreadId = params?.threadId as string;

  useEffect(() => {
    fetchThreads();
  }, [activeThreadId]);

  // Click outside listener for the profile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await fetch("/api/thread");
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
      }
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewThread = async () => {
    router.push("/");
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const deleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat?")) return;
    
    try {
      const res = await fetch(`/api/thread/${threadId}`, { method: "DELETE" });
      if (res.ok) {
        setThreads(prev => prev.filter(t => t._id !== threadId));
        if (activeThreadId === threadId) router.push("/");
      }
    } catch (error) {
       console.error("Delete failed:", error);
    }
  };

  const clearAllHistory = async () => {
    if (!confirm("This will permanently delete ALL your chat history. Continue?")) return;
    
    setIsDeletingAll(true);
    try {
      const res = await fetch("/api/thread", { method: "DELETE" });
      if (res.ok) {
        setThreads([]);
        router.push("/");
      }
    } catch (error) {
      console.error("Clear all failed:", error);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const filteredThreads = threads.filter(thread => 
    thread.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ 
          width: isOpen ? 280 : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed lg:relative flex flex-col h-screen bg-white dark:bg-[#080a0f] border-r border-gray-100 dark:border-white/5 z-40 overflow-hidden shrink-0 shadow-2xl lg:shadow-none transition-colors duration-500`}
      >
        <div className="flex flex-col h-full w-[280px]">
          
          {/* Header */}
          <div className="p-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Command className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">Nexus AI</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all text-gray-400 hover:text-blue-500 lg:hidden"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat */}
          <div className="px-4 mb-6 mt-4">
            <button
              onClick={createNewThread}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-800 dark:text-zinc-200 font-bold text-xs transition-all shadow-sm group"
            >
              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>New Conversation</span>
              <Sparkles className="w-3.5 h-3.5 ml-auto text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="History..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-zinc-900/50 border border-transparent focus:border-blue-500/20 dark:focus:border-blue-500/30 rounded-lg text-[11px] font-semibold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
              <button 
                onClick={clearAllHistory}
                disabled={threads.length === 0 || isDeletingAll}
                className="p-2 hover:bg-rose-500/10 text-gray-400 hover:text-rose-500 rounded-lg transition-all disabled:opacity-30"
                title="Clear All"
              >
                <History className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 w-full bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => (
                <div key={thread._id} className="relative group/item">
                  <button
                    onClick={() => {
                      router.push(`/chat/${thread._id}`);
                      if (window.innerWidth < 1024) setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative ${
                      activeThreadId === thread._id 
                      ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold" 
                      : "text-gray-500 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-white/5 font-medium"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 text-left text-xs truncate tracking-tight">
                      {thread.title}
                    </span>
                  </button>
                  
                  <button
                    onClick={(e) => deleteThread(e, thread._id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover/item:opacity-100 hover:bg-rose-500/10 text-gray-400 hover:text-rose-500 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 opacity-20">
                <History className="w-5 h-5 mb-2" />
                <p className="text-[9px] uppercase font-black tracking-widest">No history</p>
              </div>
            )}
          </div>

          {/* Minimal Profile Section - ChatGPT Style */}
          <div className="p-3 mt-auto relative" ref={menuRef}>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-[calc(100%-8px)] left-3 right-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50"
                >
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-white/5 mb-2">
                    <p className="text-xs font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">
                      {session?.user?.name || "Member"}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-600 truncate font-bold lowercase">
                      {session?.user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-rose-500/5 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group"
                  >
                    <span>Sign Out</span>
                    <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                isMenuOpen ? "bg-gray-100 dark:bg-white/10 shadow-inner" : "hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-blue-600 uppercase text-xs">{session?.user?.name?.[0] || session?.user?.email?.[0] || "?"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">
                   {session?.user?.name || "Member"}
                </p>
              </div>
              <ChevronUp className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isMenuOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}