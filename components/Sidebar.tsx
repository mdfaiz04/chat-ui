import { useState } from "react";
import { Search, Trash, X } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [history, setHistory] = useState([
    { id: "1", title: "Project Explanation Guide", time: "07:41" },
    { id: "2", title: "Next.js Setup", time: "07:38" },
    { id: "3", title: "AI Chat UI Build", time: "07:30" },
  ]);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredHistory = history.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this chat?")) {
      setHistory((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-full sm:w-80 sm:max-w-sm bg-gray-900 border-r border-gray-800 shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full text-gray-100">
          {/* Sidebar Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="font-semibold text-lg">History</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 text-sm text-gray-100 rounded-lg pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-gray-600 transition-all placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((chat) => (
                <div
                  key={chat.id}
                  className="flex justify-between items-center group cursor-pointer rounded-xl p-3 hover:bg-gray-800 transition-all duration-200"
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="text-sm font-medium truncate">{chat.title}</span>
                    <span className="text-xs text-gray-500">{chat.time}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(chat.id, e)}
                    className="p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    title="Delete chat"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-20">
                <span className="text-gray-400 text-sm">No chats found</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
