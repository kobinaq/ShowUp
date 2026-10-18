import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meridiqa",
  description: "University lecturer quality assurance platform",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }]
  }
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
                  var stored = localStorage.getItem("meridiqa-theme") || localStorage.getItem("showup-theme");
                  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  var dark = stored ? stored === "dark" : prefersDark;
                  document.documentElement.classList.toggle("dark", dark);
                  document.documentElement.dataset.theme = dark ? "dark" : "light";
                  if (stored && !localStorage.getItem("meridiqa-theme")) {
                    localStorage.setItem("meridiqa-theme", stored);
                    localStorage.removeItem("showup-theme");
                  }
                } catch (error) {}
              })();
            `
          }}
        />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
