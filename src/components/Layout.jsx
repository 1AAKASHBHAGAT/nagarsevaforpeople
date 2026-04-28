import React from "react";
import useOnlineStatus from "../hooks/useOnlineStatus";

const Layout = ({ children }) => {
  const isOnline = useOnlineStatus();

  return (
    <div className="min-h-screen flex flex-col text-slate-900 relative overflow-hidden bg-slate-50">
      {!isOnline && (
        <div className="bg-amber-400 text-slate-900 px-4 py-3 text-center text-sm font-semibold shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <span className="animate-pulse">📶</span>
            You're offline. Changes will sync when the connection returns.
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>

      <footer className="bg-white border-t border-slate-200 mt-5">
        <div className="container mx-auto py-4 text-center">
          <div className="flex flex-col md:flex-row justify-center items-center gap-3 text-sm text-slate-500">
            <p className="mb-0">Made with ❤️ for SDG 11 - Sustainable Cities</p>
            <div className="flex items-center gap-2 mb-0">
              <span className="animate-pulse">🏙️</span>
              <span className="font-semibold">NagarSeva © 2025</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
