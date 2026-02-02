"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">Hemort</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-gray-600 hover:text-emerald-600 transition-colors text-sm font-medium">
              Hem
            </Link>
            <Link href="/jamfor" className="text-gray-600 hover:text-emerald-600 transition-colors text-sm font-medium">
              Jämför kommuner
            </Link>
            <Link href="/simulera" className="text-gray-600 hover:text-emerald-600 transition-colors text-sm font-medium">
              Simulera flytt
            </Link>
            <Link href="/quiz" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              Hitta din kommun
            </Link>
          </nav>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Meny"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-2">
            <Link href="/" className="block py-2 text-gray-600 text-sm font-medium" onClick={() => setMobileOpen(false)}>
              Hem
            </Link>
            <Link href="/jamfor" className="block py-2 text-gray-600 text-sm font-medium" onClick={() => setMobileOpen(false)}>
              Jämför kommuner
            </Link>
            <Link href="/simulera" className="block py-2 text-gray-600 text-sm font-medium" onClick={() => setMobileOpen(false)}>
              Simulera flytt
            </Link>
            <Link href="/quiz" className="block py-2 text-emerald-600 text-sm font-medium" onClick={() => setMobileOpen(false)}>
              Hitta din kommun
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
