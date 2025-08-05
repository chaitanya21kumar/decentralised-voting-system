"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const adminRoutes = [
  {
    href: "/admin_page/dashboard",
    label: "Dashboard",
    description: "Overview and main controls"
  },
  {
    href: "/results",
    label: "Results",
    description: "View election results"
  },
  {
    href: "/candidates",
    label: "Candidates",
    description: "View candidate information"
  }
];

export default function AdminNavigation() {
  const pathname = usePathname();

  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-6">
      <h3 className="text-lg font-semibold text-indigo-400 mb-4">Quick Navigation</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminRoutes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={`block p-4 rounded-lg border transition-colors ${
              pathname === route.href
                ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                : "border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white"
            }`}
          >
            <div className="font-semibold">{route.label}</div>
            <div className="text-sm text-gray-400 mt-1">{route.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
