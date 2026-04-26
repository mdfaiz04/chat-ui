"use client";

import Sidebar from "@/components/Sidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-[100dvh] bg-white dark:bg-[#05070d]">
      <Sidebar />
      <div className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </main>
  );
}
