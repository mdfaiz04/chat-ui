"use client";

// This component has no props — it always looks the same
// It's purely visual — just three bouncing dots
export default function TypingIndicator() {
  return (
    // Aligned to the left (like bot messages)
    <div className="flex w-full mb-3 justify-start">
      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-none px-4 py-3">

        {/* Three dots side by side */}
        <div className="flex space-x-1 items-center">

          {/* Each dot is a small circle */}
          {/* "animate-bounce" is a Tailwind class that makes it bounce up and down */}
          {/* "animation-delay" staggers each dot so they bounce one after another */}
          <div
            className="w-2 h-2 bg-gray-400 dark:bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}   // First dot starts immediately
          />
          <div
            className="w-2 h-2 bg-gray-400 dark:bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}  // Second dot starts 150ms later
          />
          <div
            className="w-2 h-2 bg-gray-400 dark:bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}  // Third dot starts 300ms later
          />
        </div>

      </div>
    </div>
  );
}