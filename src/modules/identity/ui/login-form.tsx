"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/shared/api-client";
import { EnvelopeSimple, LockKey, ArrowRight, SpinnerGap } from "@phosphor-icons/react";
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
      <label className="input-label">
        Email address
        <span className="input-control"><EnvelopeSimple size={18} aria-hidden="true" /><input
          type="email"
          name="email"
          autoComplete="username"
          placeholder="name@department.gov.in"
          required
          maxLength={254}
        /></span>
      </label>
      <label className="input-label">
        Password
        <span className="input-control"><LockKey size={18} aria-hidden="true" /><input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={128}
        /></span>
      </label>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <button disabled={busy} className="button primary" type="submit">
        {busy ? <><SpinnerGap className="spin" size={18} />Signing in</> : <>Sign in <ArrowRight size={18} /></>}
      </button>
    </form>
  );
}
