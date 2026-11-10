import { useEffect, useState } from "react";
import {
  Menu,
  Search,
  Bell,
  CalendarCheck,
  Clock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "@/components/Sidebar";
import ReservationsPage from "@/components/Reservation/ReservationsPage";
import TableListPage from "@/components/TableList/Table";
import UserManagementPage from "@/components/UserManagement/UserManagementPage";
import { apiUrl } from "@/lib/api";

type Reservation = {
  id: number;
  customer: string;
  startAt: string;
  endAt?: string;
  status: string;
  source?: string;
};

type RestaurantTable = {
  table_id: number;
  is_active: number | string;
};

const INACTIVE_RESERVATION_STATUSES = new Set([
  "cancelled",
  "completed",
  "no-show",
]);

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDisplayedReservationStatus(
  reservation: Reservation,
  now: Date,
) {
  const status = reservation.status.toLowerCase();
  if (INACTIVE_RESERVATION_STATUSES.has(status)) return reservation.status;

  const endAt = reservation.endAt
    ? new Date(reservation.endAt.replace(" ", "T"))
    : null;
  const startAt = new Date(reservation.startAt.replace(" ", "T"));
  const hasPassed = endAt && !Number.isNaN(endAt.getTime())
    ? endAt < now
    : !Number.isNaN(startAt.getTime()) &&
      localDateKey(startAt) < localDateKey(now);

  return hasPassed ? "Completed" : reservation.status;
}

type DashboardProps = {
  userEmail?: string;
  userRole: string;
  onLogout: () => void;
};

export default function Dashboard({
  userEmail = "admin@business.local",
  userRole,
  onLogout,
}: DashboardProps) {
  const [activeNav, setActiveNav] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>(
    [],
  );
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState<string | null>(
    null,
  );
  const [activeTableCount, setActiveTableCount] = useState<number | null>(null);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const canManageUsers = userRole.trim().toLowerCase() === "admin";

  useEffect(() => {
    let active = true;

    async function loadReservations() {
      try {
        const response = await fetch(apiUrl("Reservation/GetReservation.php"));
        const result = (await response.json()) as {
          success: boolean;
          message?: string;
          data?: Reservation[];
        };
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Failed to load reservations");
        }

        if (active) {
          const sortedReservations = [...result.data].sort(
            (a, b) =>
              new Date(b.startAt.replace(" ", "T")).getTime() -
              new Date(a.startAt.replace(" ", "T")).getTime(),
          );
          setRecentReservations(sortedReservations);
          setReservationsError(null);
        }
      } catch (err) {
        if (active) {
          setReservationsError(
            err instanceof Error ? err.message : "Failed to load reservations",
          );
        }
      } finally {
        if (active) setReservationsLoading(false);
      }
    }

    async function loadTables() {
      try {
        const response = await fetch(apiUrl("Table/GetTable.php"));
        const result = (await response.json()) as {
          success: boolean;
          message?: string;
          data?: RestaurantTable[];
        };
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Failed to load restaurant tables");
        }

        if (active) {
          setActiveTableCount(
            result.data.filter((table) => Number(table.is_active) === 1).length,
          );
          setTablesError(null);
        }
      } catch (err) {
        if (active) {
          setTablesError(
            err instanceof Error
              ? err.message
              : "Failed to load restaurant tables",
          );
        }
      }
    }

    function refreshDashboard() {
      void loadReservations();
      void loadTables();
    }

    refreshDashboard();
    const refreshInterval = window.setInterval(() => {
      refreshDashboard();
    }, 30_000);
    window.addEventListener("focus", refreshDashboard);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshDashboard);
    };
  }, []);

  const now = new Date();
  const today = localDateKey(now);
  const activeReservations = recentReservations.filter(
    (reservation) =>
      !INACTIVE_RESERVATION_STATUSES.has(
        getDisplayedReservationStatus(reservation, now).toLowerCase(),
      ),
  );
  const todayReservationCount = activeReservations.filter((reservation) => {
    const startAt = new Date(reservation.startAt.replace(" ", "T"));
    return !Number.isNaN(startAt.getTime()) && localDateKey(startAt) === today;
  }).length;
  const upcomingReservationCount = activeReservations.filter((reservation) => {
    const startAt = new Date(reservation.startAt.replace(" ", "T"));
    return !Number.isNaN(startAt.getTime()) && startAt >= now;
  }).length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 flex">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800 md:flex">
        <Sidebar
          activeNav={activeNav}
          canManageUsers={canManageUsers}
          onSelectNav={(id) => setActiveNav(id)}
          onLogout={onLogout}
        />
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Mobile Drawer Toggle */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger className="md:hidden inline-flex size-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-900 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50">
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <Sidebar
                  activeNav={activeNav}
                  canManageUsers={canManageUsers}
                  onSelectNav={(id) => {
                    setActiveNav(id);
                    setMobileOpen(false);
                  }}
                  onLogout={onLogout}
                />
              </SheetContent>
            </Sheet>

            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-3 top-2.5 size-4 text-neutral-400" />
              <Input
                placeholder="Search records..."
                className="pl-9 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="relative">
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 bg-red-600 rounded-full" />
            </Button>
            <div className="flex items-center gap-3 border-l pl-4 border-neutral-200 dark:border-neutral-800">
              <Avatar className="size-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-xs font-bold">
                  {userEmail.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold leading-none">
                  {userEmail}
                </p>
                <p className="text-[10px] text-neutral-500 mt-1">{userRole}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
          {activeNav === "tables" ? (
            <TableListPage />
          ) : activeNav === "reservations" ? (
            <ReservationsPage />
          ) : activeNav === "users" && canManageUsers ? (
            <UserManagementPage currentUserEmail={userEmail} />
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Dashboard Overview
                </h2>
                <p className="text-sm text-neutral-500">
                  Current reservation and table activity from your database.
                </p>
              </div>

              {/* Stats Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-500">
                      Total Reservations
                    </CardTitle>
                    <CalendarCheck className="size-4 text-neutral-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reservationsLoading ? "—" : recentReservations.length}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {reservationsError || "All reservations"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-500">
                      Active Tables
                    </CardTitle>
                    <Users className="size-4 text-neutral-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {activeTableCount === null ? "—" : activeTableCount}
                    </div>
                    <p
                      className="text-xs text-neutral-500 mt-1"
                      role={tablesError ? "alert" : undefined}
                    >
                      {tablesError || "Active restaurant tables"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-500">
                      Today&apos;s Reservations
                    </CardTitle>
                    <CalendarCheck className="size-4 text-neutral-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reservationsLoading ? "—" : todayReservationCount}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Active reservations scheduled today
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-500">
                      Upcoming Reservations
                    </CardTitle>
                    <Clock className="size-4 text-neutral-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reservationsLoading ? "—" : upcomingReservationCount}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Active bookings from now onward
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    Recent Reservations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs uppercase">
                        <tr>
                          <th className="pb-3 font-medium">Customer</th>
                          <th className="pb-3 font-medium">Date / Time</th>
                          <th className="pb-3 font-medium">Source</th>
                          <th className="pb-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {reservationsLoading ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-6 text-center text-neutral-500"
                            >
                              Loading recent reservations…
                            </td>
                          </tr>
                        ) : reservationsError ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-6 text-center text-red-600"
                            >
                              {reservationsError}
                            </td>
                          </tr>
                        ) : recentReservations.length ? (
                          recentReservations.slice(0, 5).map((reservation) => {
                            const startAt = new Date(
                              reservation.startAt.replace(" ", "T"),
                            );
                            const displayedStatus =
                              getDisplayedReservationStatus(reservation, now);
                            const status = displayedStatus.toLowerCase();
                            const statusClass =
                              status === "confirmed"
                                ? "bg-emerald-600"
                                : status === "pending"
                                  ? "text-amber-600 border-amber-300"
                                  : "";

                            return (
                              <tr key={reservation.id}>
                                <td className="py-3 font-medium">
                                  {reservation.customer}
                                </td>
                                <td className="py-3 text-neutral-500">
                                  {Number.isNaN(startAt.getTime())
                                    ? reservation.startAt
                                    : startAt.toLocaleString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit",
                                      })}
                                </td>
                                <td className="py-3 text-neutral-500">
                                  {reservation.source || "—"}
                                </td>
                                <td className="py-3">
                                  <Badge
                                    variant={
                                      status === "pending"
                                        ? "outline"
                                        : "default"
                                    }
                                    className={statusClass}
                                  >
                                    {displayedStatus}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-6 text-center text-neutral-500"
                            >
                              No reservations found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
