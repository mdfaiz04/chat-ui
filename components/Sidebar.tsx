import { useState, useEffect } from "react";
import { Search, Trash, X, History, MessageSquare } from "lucide-react";

/**
 * Props for Sidebar component
 */
interface SidebarProps {
  isOpen: boolean;   // Controls sidebar visibility
  onClose: () => void; // Function to close sidebar
  onSelectChat: (id: string) => void; // Function to load a specific chat
}

/**
 * @component Sidebar
 * @desc Displays chat sessions grouped from MongoDB with selection support
 */
export default function Sidebar({ isOpen, onClose, onSelectChat }: SidebarProps) {

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
        <div className="flex flex-col h-full text-gray-900 dark:text-gray-100">

          {/* HEADER */}
          <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              Recent Chats
            </h2>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="p-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800/50 border border-transparent focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all duration-200">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm outline-none font-medium"
              />
            </div>
          </div>

          {/* SESSIONS LIST */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 messages-scroll">
            {loading && sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredSessions.length > 0 ? (
              filteredSessions.map((session) => (
                <div
                  key={session._id}
                  onClick={() => onSelectChat(session._id)}
                  className="flex items-center gap-3 group cursor-pointer 
                             rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 
                             hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                  <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0" />
                  
                  <div className="flex flex-col truncate flex-1 pr-2">
                    <span className="text-sm font-semibold truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                      {session.title || "New Conversation"}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-zinc-500 mt-0.5">
                      {new Date(session.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDelete(session._id, e)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
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
    </>
  );
}