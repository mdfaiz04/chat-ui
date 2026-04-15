import { useState, useEffect } from "react";
import { Search, Trash, X, History, MessageSquare, Code, Image as ImageIcon, Plus } from "lucide-react";

/**
 * Props for Sidebar component
 */
interface SidebarProps {
  isOpen: boolean;   // Controls sidebar visibility
  onClose: () => void; // Function to close sidebar
  onSelectChat: (id: string) => void; // Function to load a specific chat
  onSendMessage: (content: string) => void; // Function to send a message (added)
  onNewChat: () => void; // Function to start a new chat (added)
  onClearHistory?: () => void; // Function to clear all chat history (new)
}

/**
 * @component Sidebar
 * @desc Displays chat sessions grouped from MongoDB with selection support
 */
export default function Sidebar({ isOpen, onClose, onSelectChat, onSendMessage, onNewChat, onClearHistory }: SidebarProps) {

  // ---------------- STATE ----------------

  const [sessions, setSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------------- EFFECTS ----------------

  /**
   * Fetch unique chat sessions whenever sidebar opens
   */
  useEffect(() => {
    if (isOpen) {
      const fetchSessions = async () => {
        setLoading(true);
        try {
          const response = await fetch("/api/messages");
          const data = await response.json();
          if (response.ok) {
            setSessions(data);
          }
        } catch (error) {
          console.error("Failed to fetch chat sessions:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchSessions();
    }
  }, [isOpen]);

  // ---------------- DERIVED STATE ----------------

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ---------------- HANDLERS ----------------

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this conversation?")) {
      // For now we just filter locally, but in real app you'd call a DELETE session API
      setSessions((prev) => prev.filter((item) => item._id !== id));
    }
  };

  // ---------------- UI ----------------

  return (
    <>
      {/* OVERLAY */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* SIDEBAR CONTAINER */}
      <div
        className={`fixed top-0 left-0 h-full w-[280px] sm:w-72 
                   bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
                   border-r border-gray-200 dark:border-zinc-700
                   shadow-2xl z-50 transform transition-all duration-300 ease-in-out
                   ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full text-gray-900 dark:text-gray-100 px-3 py-4 space-y-4">

          {/* PRIMARY ACTION: New Chat */}
          <div className="px-2">
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl 
                         bg-blue-500 text-white shadow-sm hover:shadow-md
                         hover:bg-blue-600 active:scale-95
                         transition-all duration-200 text-left group"
            >
              <Plus size={20} className="text-blue-100 group-hover:rotate-90 transition-transform duration-300" />
              <div className="flex flex-col items-start leading-none gap-1">
                <span className="text-sm font-semibold">New Chat</span>
                <span className="text-[10px] text-blue-100/80">Start a new conversation</span>
              </div>
            </button>
          </div>

          {/* TOP SECTION: Workspace & Features */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center px-2 mb-4">
              <h2 className="font-bold text-sm tracking-tight text-gray-500 dark:text-gray-400 uppercase">
                ✨ Workspace
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-400 transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { icon: MessageSquare, label: "Chat & Brainstorm", prompt: "Chat" },
                { icon: Search, label: "Research & Summarize", prompt: "Research" },
                { icon: Code, label: "Code & Develop", prompt: "Code" },
                { icon: ImageIcon, label: "Create Images", prompt: "Images" },
              ].map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onSendMessage(item.prompt);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl 
                             bg-zinc-100 dark:bg-zinc-800 
                             hover:bg-zinc-200 dark:hover:bg-zinc-700 
                             text-gray-700 dark:text-zinc-200
                             transition-all duration-200 text-left group"
                >
                  <item.icon size={18} className="text-gray-500 group-hover:text-blue-500 transition-colors" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 my-2" />

          {/* MIDDLE SECTION: Search */}
          <div className="px-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-800 text-sm outline-none font-medium 
                           pl-10 pr-3 py-2.5 rounded-full border border-transparent 
                           focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 transition-all duration-200"
              />
            </div>
          </div>

          {/* NEW FEATURE: Clear All History */}
          <div className="px-2">
            <button
              onClick={() => {
                if (onClearHistory) {
                  onClearHistory();
                  onClose();
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg 
                         text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 
                         transition-colors duration-200 text-left"
            >
              <Trash size={18} />
              <span className="text-sm font-medium">Clear All History</span>
            </button>
          </div>

          {/* BOTTOM SECTION: Chat History */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <History className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Recent Chats</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar space-y-1">
              {loading && sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredSessions.length > 0 ? (
                filteredSessions.map((session) => (
                  <div
                    key={session._id}
                    onClick={() => onSelectChat(session._id)}
                    className="flex items-center gap-3 group cursor-pointer 
                               rounded-xl px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 
                               transition-all duration-200"
                  >
                    <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0" />

                    <div className="flex flex-col truncate flex-1 min-w-0">
                      <span className="text-sm font-medium truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors text-gray-700 dark:text-zinc-200">
                        {session.title || "New Conversation"}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500">
                        {new Date(session.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDelete(session._id, e)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <span className="text-gray-500 dark:text-zinc-500 text-xs font-medium">
                    No chat history yet
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}