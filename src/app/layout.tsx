import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leads & Tickets Middleware",
  description: "Painel mockado para leads e tickets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-100 text-slate-900 antialiased`}
      >
        <ToastProvider>
          <div className="min-h-screen bg-slate-100">
          <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                  LT
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Leads & Tickets
                  </p>
                  <p className="text-xs text-slate-500">Middleware dashboard</p>
                </div>
              </div>

              <nav className="flex items-center gap-2 text-sm font-semibold">
                <Link
                  href="/"
                  className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Dashboard
                </Link>
                <Link
                  href="/metrics"
                  className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Métricas
                </Link>
              </nav>
            </div>
          </header>
            <main>{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
