import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FolderOpen,
  LogOut,
  User,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/portfolios", label: "Portfolios", icon: FolderOpen },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex h-screen">
      <aside className="flex w-64 flex-col border-r bg-card">
        <div className="flex h-14 items-center border-b px-4">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <FolderOpen className="h-5 w-5" />
            DevFolio
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === item.to
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{user?.name}</span>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
