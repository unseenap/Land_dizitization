"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/shared/api-client";
export function LogoutButton({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        className="button subtle"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/api/v1/auth/logout", { method: "POST", csrfToken });
            router.replace("/login");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
