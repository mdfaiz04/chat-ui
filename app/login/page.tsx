"use client";

import LoginCard from "@/components/Auth/LoginCard";

/**
 * @page LoginPage
 * @desc Now acts as a secondary entry point. The primary login gate is on the homepage.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-[#0a0f1f] dark:via-[#05070d] dark:to-black p-4 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-600/10 blur-[130px] rounded-full -z-0 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 dark:bg-purple-600/10 blur-[130px] rounded-full -z-0 animate-pulse" style={{ animationDelay: '2s' }} />

      <LoginCard />
    </div>
  );
}
