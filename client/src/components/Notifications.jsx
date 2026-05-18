import { useState, useEffect } from "react";

export default function Notifications({ notifications }) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="bg-gray-800 border border-gray-700 text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-fade-in"
        >
          <p className="font-medium">{n.title}</p>
          <p className="text-gray-400 text-xs mt-0.5">{n.message}</p>
        </div>
      ))}
    </div>
  );
}