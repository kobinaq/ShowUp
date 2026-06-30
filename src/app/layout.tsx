import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShowUp",
  description: "University lecturer quality assurance platform",
  manifest: "/manifest.json"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem("showup-theme") || "system";
                  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  var dark = stored === "dark" || (stored === "system" && prefersDark);
                  document.documentElement.classList.toggle("dark", dark);
                  document.documentElement.dataset.theme = stored;
                } catch (error) {}
              })();
            `
          }}
        />
      </head>
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
