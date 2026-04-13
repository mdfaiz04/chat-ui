"use client";

import { useState } from "react";
import { Search, Trash, X, History } from "lucide-react";

/**
 * Props for Sidebar component
 */
interface SidebarProps {
  isOpen: boolean;   // Controls sidebar visibility
  onClose: () => void; // Function to close sidebar
}

/**
 * @component Sidebar
 * @desc Displays chat history with search and delete functionality in a premium UI
 */
export default function Sidebar({ isOpen, onClose }: SidebarProps) {

  // ---------------- STATE ----------------

  const [history, setHistory] = useState([
    { id: "1", title: "Project Explanation Guide", time: "07:41 AM" },
    { id: "2", title: "Next.js Setup", time: "Yesterday" },
    { id: "3", title: "AI Chat UI Build", time: "2 days ago" },
  ]);

  const [searchQuery, setSearchQuery] = useState("");

  // ---------------- DERIVED STATE ----------------

  const filteredHistory = history.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ---------------- HANDLERS ----------------

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this chat?")) {
      setHistory((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // ---------------- UI ----------------

  return (
    <>
      {/* OVERLAY: dark background when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* SIDEBAR CONTAINER - Glassmorphism & Theme-Aware */}
      <div
        className={`fixed top-0 left-0 h-full w-[280px] sm:w-72 
                   bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
                   border-r border-gray-200 dark:border-zinc-700
                   shadow-2xl z-50 transform transition-all duration-300 ease-in-out
                   ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full text-gray-900 dark:text-gray-100">

          {/* HEADER UPGRADE */}
          <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              History
            </h2>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SEARCH BAR (MODERN) */}
          <div className="p-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800/50 border border-transparent focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all duration-200">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500 dark:placeholder:text-zinc-500 font-medium"
              />
            </div>
          </div>

          {/* HISTORY LIST (UPGRADED UI) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 messages-scroll">

            {filteredHistory.length > 0 ? (
              filteredHistory.map((chat) => (
                <div
                  key={chat.id}
                  className="flex justify-between items-center group cursor-pointer 
                             rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 
                             hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="text-sm font-semibold truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                      {chat.title}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-zinc-500 mt-0.5">
                      {chat.time}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDelete(chat.id, e)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    title="Delete chat"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <span className="text-gray-500 dark:text-zinc-500 text-xs font-medium">
                  No matches found
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}