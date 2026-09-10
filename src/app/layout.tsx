import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Land Records | SIH26018", template: "%s | Land Records" },
  description: "Authorized land-record digitization workspace",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
