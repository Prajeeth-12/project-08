import "./globals.css";
import React from "react";

export const metadata = {
  title: "Project 08 - AI Mock Interview & Assessment Platform",
  description: "Real-time AI Mock Interview, Resume Intelligence & Formal SEB Coding Exam Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
