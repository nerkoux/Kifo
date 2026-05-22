"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();

  const token = useMemo(() => params.get("accessToken") || "", [params]);

  useEffect(() => {
    if (token) {
      window.localStorage.setItem("kifo_access_token", token);
      router.replace("/dashboard");
    }
  }, [router, token]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 max-w-md w-full text-center">
        <h1 className="text-xl font-semibold">Completing sign-in...</h1>
        {!token && <p className="text-slate-400 mt-2">Missing access token. Please retry login.</p>}
      </div>
    </main>
  );
}
