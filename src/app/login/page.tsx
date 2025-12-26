import { Suspense } from "react";
import LoginClient from "./login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10 text-sm text-slate-500">
          Carregando...
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
