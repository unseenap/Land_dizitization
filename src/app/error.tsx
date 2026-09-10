"use client";
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="error-page">
      <h1>We couldn’t load this page.</h1>
      <p>
        The service may be temporarily unavailable. Your saved data has not been
        changed.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
