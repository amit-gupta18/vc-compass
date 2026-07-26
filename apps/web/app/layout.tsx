import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppProviders } from "../components/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VC Brain",
  description: "Monorepo scaffold for the VC Brain platform.",
};

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/apply", label: "Apply" },
  { href: "/login", label: "Login" },
  { href: "/sourcing", label: "Sourcing" },
  { href: "/thesis", label: "Thesis" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
              <header className="mb-10 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                    The VC Brain
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold text-white">
                    Venture intelligence operating system
                  </h1>
                </div>
                <nav className="flex flex-wrap gap-3 text-sm text-slate-300">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-full border border-slate-700 px-4 py-2 transition hover:border-cyan-400 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </header>
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
