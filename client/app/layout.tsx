import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "RAT - Rich Analytics Tool",
  description: "Tracking analytics that provide real value.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.className} antialiased tracking-tight`}>
        <div className="flex">
          <Sidebar />
          <main className="flex-1 lg:ml-72 min-h-screen bg-base-100">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
