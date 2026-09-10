import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="error-page">
      <h1>Page not found</h1>
      <p>The page may have moved or is not available in this phase.</p>
      <Link href="/dashboard" className="button primary">
        Back to workspace
      </Link>
    </main>
  );
}
