import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veneza Service Field",
  description: "Painel de consulta do Veneza Service Field.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body
        className="bg-slate-100 text-slate-900 antialiased overflow-x-hidden"
      >
        <AuthProvider>
          <ToastProvider>
            <div className="min-h-screen bg-slate-100">
              <AppHeader locale={DEFAULT_LOCALE} />
              <main>{children}</main>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
