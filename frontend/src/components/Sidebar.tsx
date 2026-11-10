import {
  LayoutDashboard,
  CalendarCheck,
  TableProperties,
  Users,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SidebarProps = {
  activeNav: string;
  canManageUsers: boolean;
  onSelectNav: (id: string) => void;
  onLogout: () => void;
};

export default function Sidebar({
  activeNav,
  canManageUsers,
  onSelectNav,
  onLogout,
}: SidebarProps) {
  const navItems = [
    { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
    { id: "reservations", label: "Reservations", icon: CalendarCheck },
    { id: "tables", label: "Table Management", icon: TableProperties },
    { id: "users", label: "User Management", icon: Users },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 p-6">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold flex items-center justify-center size-9">
          SYS
        </div>
        <div>
          <h1 className="font-semibold text-base leading-tight">
            Local Business
          </h1>
          <p className="text-xs text-neutral-500">LAN Server Node</p>
        </div>
      </div>

      <nav className="space-y-1.5 flex-1">
        {navItems
          .filter((item) => item.id !== "users" || canManageUsers)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
      </nav>

      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
