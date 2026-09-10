"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/shared/api-client";
export function LoginForm() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="form-stack"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setBusy(true);
        const data = new FormData(event.currentTarget);
        try {
          await api("/api/v1/auth/login", {
            method: "POST",
            body: { email: data.get("email"), password: data.get("password") },
          });
          router.replace("/dashboard");
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
          setBusy(false);
        }
      }}
    >
      <label>
        Email address
        <input
          type="email"
          name="email"
          autoComplete="username"
          placeholder="name@department.gov.in"
          required
          maxLength={254}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
      </label>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <button disabled={busy} className="button primary" type="submit">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
