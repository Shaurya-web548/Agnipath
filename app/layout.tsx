import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgniPath — Wildfire Evacuation Planner",
  description:
    "Wind-driven wildfire spread simulation and evacuation planning — Uttarakhand scenario",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
