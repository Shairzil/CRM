import type { Metadata } from "next";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "NextEd Advisors Internal Management System",
  description: "Secure internal management console for student registration, invoice creation, and consultancy history tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
