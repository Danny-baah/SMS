import type { Metadata } from "next";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "School Management System | Basic School Administration",
  description: "Academic and Student Management System for Preschool through Junior High School",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
