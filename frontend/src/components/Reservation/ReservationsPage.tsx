import { useState, useEffect } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Users,
  Loader2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api";

type Reservation = {
  id: number;
  code: string;
  customer: string;
  phone?: string;
  date: string;
  time: string;
  startAt: string;
  endAt: string;
  tableIds: number[];
  guests: number;
  status: string;
  occasion?: string;
  source?: string;
};

type RestaurantTable = {
  table_id: number;
  table_number: string;
  table_name: string;
  capacity: number;
  is_active: number | string;
};

const SERVICE_TIMES = [
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
  "00:00",
  "01:00",
  "02:00",
];
const RESERVATION_DURATION_MINUTES = 90;

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeKey(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toSqlDateTime(date: string, time: string, startTime?: string) {
  const value = new Date(`${date}T${time}:00`);
  if (startTime && time < startTime) {
    value.setDate(value.getDate() + 1);
  }
  return `${dateKey(value)} ${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}:00`;
}

function toLocalDateTime(value: string) {
  return new Date(value.replace(" ", "T"));
}

function getDisplayedReservationStatus(reservation: Reservation, now: Date) {
  const status = reservation.status.toLowerCase();
  if (["cancelled", "completed", "no-show"].includes(status)) {
    return reservation.status;
  }

  const endAt = toLocalDateTime(reservation.endAt);
  const hasPassed =
    (!Number.isNaN(endAt.getTime()) && endAt < now) ||
    reservation.date < dateKey(now);

  return hasPassed ? "Completed" : reservation.status;
}

function formatReservationTime(value: string) {
  const date = toLocalDateTime(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function addMinutesToTime(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const end = new Date(2000, 0, 1, hours, mins + minutes);
  return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
}

export default function ReservationsPage() {
  const [now] = useState(() => new Date());
  const [currentDate, setCurrentDate] = useState(() => {
    const today = now;
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(now));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingReservationId, setEditingReservationId] = useState<number | null>(
    null,
  );

  // Reservation form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [tableIds, setTableIds] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [source, setSource] = useState("Walk-in");
  const [occasion, setOccasion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const fetchReservations = async () => {
    try {
      const res = await fetch(apiUrl("Reservation/GetReservation.php"));
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load reservations");
      }
      setReservations(data.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to local server",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadReservations() {
      try {
        const res = await fetch(apiUrl("Reservation/GetReservation.php"));
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load reservations");
        }
        if (active) setReservations(data.data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to connect to local server",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    async function loadTables() {
      try {
        const res = await fetch(apiUrl("Table/GetTable.php"));
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load tables");
        }
        if (active) {
          setTables(
            data.data.filter(
              (table: RestaurantTable) => Number(table.is_active) === 1,
            ),
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load restaurant tables",
          );
        }
      } finally {
        if (active) setTablesLoading(false);
      }
    }

    void loadReservations();
    void loadTables();
    return () => {
      active = false;
    };
  }, []);

  const availabilityChecked = !loading && !tablesLoading && !error;
  const selectedTableIds = tableIds.map(Number);
  const selectedTableCapacity = tables
    .filter((table) => selectedTableIds.includes(table.table_id))
    .reduce((total, table) => total + table.capacity, 0);

  function isTimeAvailable(
    date: string,
    time: string,
    availableTableId: number,
    intervalEndTime?: string,
    ignoredReservationId?: number | null,
  ) {
    const start = new Date(`${date}T${time}:00`);
    const end = intervalEndTime
      ? new Date(`${date}T${intervalEndTime}:00`)
      : new Date(start.getTime() + RESERVATION_DURATION_MINUTES * 60000);
    if (intervalEndTime && intervalEndTime < time) {
      end.setDate(end.getDate() + 1);
    }
    if (end <= start) return false;
    const isPast =
      !ignoredReservationId &&
      date === dateKey(now) &&
      start.getTime() <= now.getTime();
    if (isPast) return false;

    return !reservations.some((reservation) => {
      if (reservation.id === ignoredReservationId) return false;
      if (
        ["cancelled", "completed", "no-show"].includes(
          reservation.status.toLowerCase(),
        )
      ) {
        return false;
      }

      if (!reservation.tableIds.includes(availableTableId)) return false;

      const reservationStart = toLocalDateTime(reservation.startAt);
      const reservationEnd = toLocalDateTime(reservation.endAt);
      return start < reservationEnd && end > reservationStart;
    });
  }

  const selectableTables = tables.filter((table) =>
    selectedTime && endTime && endTime !== selectedTime
      ? isTimeAvailable(
          selectedDate,
          selectedTime,
          table.table_id,
          endTime,
          editingReservationId,
        )
      : SERVICE_TIMES.some((time) =>
          isTimeAvailable(
            selectedDate,
            time,
            table.table_id,
            undefined,
            editingReservationId,
          ),
        ),
  );

  function hasAvailableTable(date: string) {
    if (loading || tablesLoading || date < dateKey(now)) return false;
    return tables.some((table) =>
      SERVICE_TIMES.some((time) => isTimeAvailable(date, time, table.table_id)),
    );
  }

  const availableTimes =
    selectedTableIds.length > 0 && selectedTableCapacity >= Number(partySize)
      ? SERVICE_TIMES.filter((time) =>
          selectedTableIds.every((id) =>
            isTimeAvailable(
              selectedDate,
              time,
              id,
              undefined,
              editingReservationId,
            ),
          ),
        )
      : [];
  const intervalAvailable =
    Boolean(selectedTime) &&
    Boolean(endTime) &&
    endTime !== selectedTime &&
    selectedTableIds.every((id) =>
      isTimeAvailable(
        selectedDate,
        selectedTime,
        id,
        endTime,
        editingReservationId,
      ),
    );

  function openBooking(date = selectedDate) {
    setSelectedDate(date);
    setCurrentDate(new Date(`${date}T00:00:00`));
    setEditingReservationId(null);
    setCustomerName("");
    setCustomerPhone("");
    setPartySize("2");
    setTableIds([]);
    setSelectedTime("");
    setEndTime("");
    setSource("Walk-in");
    setOccasion("");
    setDialogOpen(true);
  }

  function openEditReservation(reservation: Reservation) {
    const start = toLocalDateTime(reservation.startAt);
    const end = toLocalDateTime(reservation.endAt);
    const date = dateKey(start);
    setEditingReservationId(reservation.id);
    setSelectedDate(date);
    setCurrentDate(new Date(`${date}T00:00:00`));
    setCustomerName(reservation.customer);
    setCustomerPhone(reservation.phone ?? "");
    setPartySize(String(reservation.guests));
    setTableIds(reservation.tableIds.map(String));
    setSelectedTime(timeKey(start));
    setEndTime(timeKey(end));
    setSource(reservation.source || "Walk-in");
    setOccasion(reservation.occasion || "");
    setDialogOpen(true);
  }

  function changeBookingDate(date: string) {
    setSelectedDate(date);
    setCurrentDate(new Date(`${date}T00:00:00`));
    setSelectedTime("");
    setEndTime("");
  }

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !customerName.trim() ||
      selectedTableIds.length === 0 ||
      selectedTableCapacity < Number(partySize) ||
      !selectedTime ||
      !endTime ||
      !intervalAvailable
    ) {
      alert(
        "Enter the customer name, select one or more tables with enough seats, and choose an available time",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        apiUrl(
          editingReservationId
            ? "Reservation/UpdateReservation.php"
            : "Reservation/CreateReservation.php",
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reservation_id: editingReservationId,
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            party_size: parseInt(partySize),
            table_ids: selectedTableIds,
            start_at: toSqlDateTime(selectedDate, selectedTime),
            end_at: toSqlDateTime(selectedDate, endTime, selectedTime),
            occasion,
            source: source.trim(),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setDialogOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setTableIds([]);
      setSource("Walk-in");
      setOccasion("");
      setSelectedTime("");
      setEndTime("");
      setEditingReservationId(null);
      void fetchReservations();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : `Error ${editingReservationId ? "updating" : "creating"} reservation`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this reservation?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(apiUrl("Reservation/DeleteReservation.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservation_id: id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete reservation");
      }
      setReservations((current) =>
        current.filter((reservation) => reservation.id !== id),
      );
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete reservation",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDayIndex; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) {
    days.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
    );
  }

  const selectedDateReservations = reservations.filter(
    (r) => r.date === selectedDate,
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Reservations Calendar
            </h2>
            <p className="text-sm text-neutral-500">
              Manage bookings with live MySQL database sync.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DialogContent className="grid-rows-[auto_minmax(0,1fr)] overflow-hidden max-h-[calc(100dvh-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingReservationId
                    ? "Edit Reservation"
                    : "Create New Reservation"}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmitReservation}
                className="min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-2"
              >
                <div className="space-y-1">
                  <Label htmlFor="reservation-customer-name">
                    Customer Name
                  </Label>
                  <Input
                    id="reservation-customer-name"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reservation-customer-phone">
                    Phone Number
                  </Label>
                  <Input
                    id="reservation-customer-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Enter customer phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reservation-date">Date</Label>
                  <Input
                    id="reservation-date"
                    type="date"
                    min={editingReservationId ? undefined : dateKey(now)}
                    value={selectedDate}
                    onChange={(e) => changeBookingDate(e.target.value)}
                    required
                  />
                </div>
                <div
                  aria-live="polite"
                  className="grid grid-cols-3 gap-2 rounded-md border bg-muted/40 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="truncate font-medium">
                      {selectedDate ? formatDate(selectedDate) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Start</p>
                    <p className="font-medium">
                      {selectedTime ? formatTime(selectedTime) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">End</p>
                    <p className="font-medium">
                      {endTime ? formatTime(endTime) : "—"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reservation-party-size">Party Size</Label>
                  <Input
                    id="reservation-party-size"
                    type="number"
                    min="1"
                    value={partySize}
                    onChange={(e) => {
                      setPartySize(e.target.value);
                      setTableIds([]);
                      setSelectedTime("");
                    }}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tables</Label>
                  <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border p-3">
                    {tablesLoading ? (
                      <p className="text-muted-foreground text-sm">
                        Loading tables...
                      </p>
                    ) : selectableTables.length > 0 ? (
                      selectableTables.map((table) => {
                        const checked = tableIds.includes(
                          table.table_id.toString(),
                        );
                        return (
                          <label
                            key={table.table_id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setTableIds((current) =>
                                  e.target.checked
                                    ? [...current, table.table_id.toString()]
                                    : current.filter(
                                        (id) =>
                                          id !== table.table_id.toString(),
                                      ),
                                );
                                setSelectedTime("");
                              }}
                            />
                            <span>
                              {table.table_number} · {table.table_name} (
                              {table.capacity} seats)
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-destructive text-sm">
                        {selectedTime
                          ? "No tables are available for the selected time range."
                          : "No active tables are available for this date."}
                      </p>
                    )}
                  </div>
                  {selectedTableIds.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {selectedTableIds.length} table
                      {selectedTableIds.length > 1 ? "s" : ""} selected ·{" "}
                      {selectedTableCapacity} seats
                    </p>
                  )}
                  {selectedTableIds.length > 0 &&
                    selectedTableCapacity < Number(partySize) && (
                      <p className="text-destructive text-xs">
                        Select another table to seat this party.
                      </p>
                    )}
                </div>
                <div className="space-y-2">
                  <Label>Available Times</Label>
                  {availableTimes.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableTimes.map((time) => (
                        <button
                          key={time}
                          type="button"
                          aria-pressed={selectedTime === time}
                          onClick={() => {
                            setSelectedTime(time);
                            setEndTime(
                              addMinutesToTime(
                                time,
                                RESERVATION_DURATION_MINUTES,
                              ),
                            );
                          }}
                          className={`h-10 rounded-md border text-sm transition-colors ${
                            selectedTime === time
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:bg-accent"
                          }`}
                        >
                          {formatTime(time)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground rounded-md border border-dashed px-3 py-3 text-sm">
                      {selectedTableIds.length > 0
                        ? "No available times for this table on the selected date."
                        : "Choose one or more tables to see ls."}
                    </p>
                  )}
                </div>
                {selectedTime && (
                  <div className="space-y-1">
                    <Label htmlFor="reservation-end-time">End Time</Label>
                    <Input
                      id="reservation-end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => {
                        const nextEndTime = e.target.value;
                        setEndTime(nextEndTime);
                        if (nextEndTime && nextEndTime !== selectedTime) {
                          setTableIds((current) =>
                            current.filter((id) =>
                              isTimeAvailable(
                                selectedDate,
                                selectedTime,
                                Number(id),
                                nextEndTime,
                                editingReservationId,
                              ),
                            ),
                          );
                        }
                      }}
                      required
                    />
                    {endTime &&
                      endTime !== selectedTime &&
                      !intervalAvailable && (
                        <p className="text-destructive text-xs">
                          The selected tables are not available for this time
                          range.
                        </p>
                      )}
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="reservation-source">Source</Label>
                  <select
                    id="reservation-source"
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    required
                  >
                    <option value="Walk-in">Walk-in</option>
                    <option value="Phone">Phone</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reservation-occasion">
                    Occasion (Optional)
                  </Label>
                  <Input
                    id="reservation-occasion"
                    placeholder="e.g. Birthday, Anniversary"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    submitting ||
                    !customerName.trim() ||
                    selectedTableIds.length === 0 ||
                    selectedTableCapacity < Number(partySize) ||
                    !selectedTime ||
                    !endTime ||
                    !intervalAvailable
                  }
                >
                  {submitting && (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  )}{" "}
                  {editingReservationId
                    ? "Update Reservation"
                    : "Save Reservation"}
                </Button>
              </form>
            </DialogContent>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold px-3 py-1.5 bg-white dark:bg-neutral-900 border rounded-lg shadow-sm">
                {monthNames[month]} {year}
              </span>
              <div className="flex items-center border rounded-lg bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevMonth}
                  className="rounded-none h-9 w-9"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="h-4 w-[1px] bg-neutral-200" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextMonth}
                  className="rounded-none h-9 w-9"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Calendar Grid
              </CardTitle>
              {loading && (
                <Loader2 className="size-4 animate-spin text-neutral-400" />
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-neutral-400 mb-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((dateStr, idx) => {
                  if (!dateStr)
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="h-24 bg-transparent"
                      />
                    );
                  const dayNumber = parseInt(dateStr.split("-")[2], 10);
                  const dayReservations = reservations.filter(
                    (r) => r.date === dateStr,
                  );
                  const hasBookings = dayReservations.length > 0;
                  const hasAvailability = hasAvailableTable(dateStr);
                  const hasNoAvailability =
                    availabilityChecked &&
                    dateStr >= dateKey(now) &&
                    !hasAvailability;
                  const isSelected = selectedDate === dateStr;
                  const isPastDate = dateStr < dateKey(now);

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() =>
                        isPastDate || hasNoAvailability
                          ? setSelectedDate(dateStr)
                          : openBooking(dateStr)
                      }
                      aria-label={`${formatDate(dateStr)}${hasNoAvailability ? ", unavailable for new bookings" : ""}${hasBookings ? `, ${dayReservations.length} booking${dayReservations.length > 1 ? "s" : ""}` : ", no bookings"}`}
                      className={`h-24 p-2 rounded-xl border flex flex-col justify-between text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                          : "border-neutral-200 bg-white dark:bg-neutral-900"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold ${isSelected ? "text-primary" : "text-neutral-700 dark:text-neutral-300"}`}
                        >
                          {dayNumber}
                        </span>
                        {hasBookings && (
                          <span className="size-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      {(hasBookings ||
                        hasAvailability ||
                        hasNoAvailability) && (
                        <div className="space-y-0.5">
                          {hasBookings && (
                            <div className="text-[10px] font-medium bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded truncate dark:bg-neutral-800 dark:text-neutral-300">
                              {dayReservations.length} booking
                              {dayReservations.length > 1 ? "s" : ""}
                            </div>
                          )}
                          {hasAvailability && (
                            <div className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded truncate dark:bg-emerald-950/40 dark:text-emerald-400">
                              Available
                            </div>
                          )}
                          {hasNoAvailability && (
                            <div className="text-[10px] font-semibold bg-red-50 text-red-700 px-1.5 py-0.5 rounded truncate dark:bg-red-950/40 dark:text-red-400">
                              Unavailable
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarCheck className="size-4 text-primary" /> Bookings for{" "}
                {selectedDate}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 overflow-y-auto max-h-[450px]">
              {selectedDateReservations.length > 0 ? (
                selectedDateReservations.map((res) => (
                  <div
                    key={res.id}
                    className="p-3.5 rounded-lg border bg-neutral-50 dark:bg-neutral-900/50 space-y-2 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm block">
                          {res.customer}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {res.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="default"
                          className="bg-emerald-600 text-[10px]"
                        >
                          {getDisplayedReservationStatus(res, now)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-primary"
                          aria-label={`Edit reservation ${res.code}`}
                          title="Edit reservation"
                          onClick={() => openEditReservation(res)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-red-500 hover:text-red-700"
                          aria-label={`Delete reservation ${res.code}`}
                          title="Delete reservation"
                          disabled={deletingId === res.id}
                          onClick={() => handleDelete(res.id)}
                        >
                          {deletingId === res.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-neutral-500 pt-1 border-t">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatReservationTime(res.startAt)} –{" "}
                        {formatReservationTime(res.endAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" /> {res.guests} guests
                      </span>
                      {res.occasion && (
                        <span className="italic text-neutral-400">
                          ({res.occasion})
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center text-neutral-400">
                  <User className="size-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">
                    No bookings on this date
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </Dialog>
  );
}
