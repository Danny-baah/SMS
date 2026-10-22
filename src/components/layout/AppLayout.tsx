"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Users2,
  Briefcase,
  Building2,
  BookOpen,
  UserCheck,
  Calendar,
  Clock,
  ClipboardCheck,
  FileText,
  Menu,
  X,
  School,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Students", href: "/students", icon: GraduationCap },
  { name: "Guardians", href: "/guardians", icon: Users2 },
  { name: "Staff", href: "/staff", icon: Briefcase },
  { name: "Classes", href: "/classes", icon: Building2 },
  { name: "Subjects", href: "/subjects", icon: BookOpen },
  { name: "Enrollments", href: "/enrollments", icon: UserCheck },
  { name: "Academic Years", href: "/academic-years", icon: Calendar },
  { name: "Terms", href: "/terms", icon: Clock },
  { name: "Attendance", href: "/attendance", icon: ClipboardCheck },
  { name: "Reports", href: "/reports", icon: FileText },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
          <Link href="/" className="flex items-center gap-3 font-semibold text-slate-100 hover:text-white">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-sm shadow-blue-500/20">
              <School className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-bold tracking-tight">Basic SMS</span>
              <span className="block text-[11px] text-slate-400 font-normal">School Admin Portal</span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 text-slate-400 hover:text-white lg:hidden rounded"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Main Management
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* System Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
          <div className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="truncate">
              <p className="font-medium text-slate-200 truncate">MySQL 8.0.46</p>
              <p className="text-[11px] text-slate-400 truncate">school_management</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 capitalize">
              {NAV_ITEMS.find(
                (item) =>
                  item.href === pathname ||
                  (item.href !== "/" && pathname.startsWith(item.href))
              )?.name || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Preschool – JHS
            </span>
          </div>
        </header>

        {/* Page Children Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
