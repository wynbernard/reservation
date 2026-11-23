import { useState, useEffect } from "react";
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Users,
  Loader2,
  Minus,
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
const SOURCES = ["Walk-in", "Phone", "Online"];
const RESERVATION_DURATION_MINUTES = 90;
const END_TIME_STEP_MINUTES = 15;

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeKey(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toServiceDateTime(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  if (time < SERVICE_TIMES[0]) {
    value.setDate(value.getDate() + 1);
  }
  return value;
}

function getServiceDate(date: Date) {
  const serviceDate = new Date(date);
  if (timeKey(date) < SERVICE_TIMES[0]) {
    serviceDate.setDate(serviceDate.getDate() - 1);
  }
  return dateKey(serviceDate);
}

function toSqlDateTime(date: string, time: string) {
  const value = toServiceDateTime(date, time);
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

function getEndTimeCandidates(
  date: string,
  startTime: string,
  additionalTime?: string,
) {
  const start = toServiceDateTime(date, startTime);
  const lastEnd = toServiceDateTime(date, "02:00");

  const candidates: string[] = [];
  for (
    let candidate = new Date(start.getTime() + END_TIME_STEP_MINUTES * 60000);
    candidate <= lastEnd;
    candidate = new Date(candidate.getTime() + END_TIME_STEP_MINUTES * 60000)
  ) {
    const time = timeKey(candidate);
    if (!candidates.includes(time)) candidates.push(time);
  }

  if (additionalTime && !candidates.includes(additionalTime)) {
    const additionalEnd = toServiceDateTime(date, additionalTime);
    if (additionalEnd > start && additionalEnd <= lastEnd) {
      candidates.push(additionalTime);
    }
  }
  return candidates;
}

function StepHeading({
  step,
  title,
  hint,
  done,
}: {
  step: number;
  title: string;
  hint?: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          done ? "bg-emerald-600 text-white" : "bg-primary/10 text-primary"
        }`}
      >
        {done ? <Check className="size-3.5" /> : step}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
    </div>
  );
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
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [blockingDay, setBlockingDay] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingReservationId, setEditingReservationId] = useState<
    number | null
  >(null);

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

    async function loadBlockedDates() {
      try {
        const res = await fetch(apiUrl("Reservation/BlockDay.php"));
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load blocked dates");
        }
        if (active) {
          setBlockedDates(
            new Set(
              (data.data as Array<{ blocked_date: string }>).map(
                (item) => item.blocked_date,
              ),
            ),
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load blocked dates",
          );
        }
      }
    }

    void loadReservations();
    void loadTables();
    void loadBlockedDates();
    return () => {
      active = false;
    };
  }, []);

  const availabilityChecked = !loading && !tablesLoading && !error;
  const selectedTableIds = tableIds.map(Number);
  const selectedTableCapacity = tables
    .filter((table) => selectedTableIds.includes(table.table_id))
    .reduce((total, table) => total + table.capacity, 0);
  const guestCount = Number(partySize) || 0;
  const tablesFitParty =
    selectedTableIds.length > 0 && selectedTableCapacity >= guestCount;

  function isTimeAvailable(
    date: string,
    time: string,
    availableTableId: number,
    intervalEndTime?: string,
    ignoredReservationId?: number | null,
  ) {
    if (blockedDates.has(date)) return false;
    const start = toServiceDateTime(date, time);
    const end = intervalEndTime
      ? toServiceDateTime(date, intervalEndTime)
      : new Date(start.getTime() + RESERVATION_DURATION_MINUTES * 60000);
    if (end <= start) return false;
    const isPast =
      !ignoredReservationId &&
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

  function getAvailableEndTimes(
    date: string,
    startTime: string,
    availableTableIds: number[],
    additionalTime?: string,
  ) {
    return getEndTimeCandidates(date, startTime, additionalTime).filter(
      (time) =>
        availableTableIds.length > 0 &&
        availableTableIds.every((id) =>
          isTimeAvailable(date, startTime, id, time, editingReservationId),
        ),
    );
  }

  const selectableTables = tables.filter((table) => {
    if (selectedTime) {
      return isTimeAvailable(
          selectedDate,
          selectedTime,
          table.table_id,
          endTime && endTime !== selectedTime ? endTime : undefined,
          editingReservationId,
        );
    }

    return SERVICE_TIMES.some((time) =>
      isTimeAvailable(
        selectedDate,
        time,
        table.table_id,
        undefined,
        editingReservationId,
      ),
    );
  });
  const selectableTableIds = new Set(selectableTables.map((t) => t.table_id));

  function hasAvailableTable(date: string) {
    if (loading || tablesLoading) return false;
    return tables.some((table) =>
      SERVICE_TIMES.some((time) => isTimeAvailable(date, time, table.table_id)),
    );
  }

  const candidateTimes =
    selectedTime && !SERVICE_TIMES.includes(selectedTime)
      ? [...SERVICE_TIMES, selectedTime]
      : SERVICE_TIMES;
  const availableTimes = tablesFitParty
    ? candidateTimes.filter(
        (time) =>
          selectedTableIds.every((id) =>
            isTimeAvailable(
              selectedDate,
              time,
              id,
              undefined,
              editingReservationId,
            ),
          ) &&
          getAvailableEndTimes(selectedDate, time, selectedTableIds).length > 0,
      )
    : [];
  const availableEndTimes =
    selectedTime && tablesFitParty
      ? getAvailableEndTimes(
          selectedDate,
          selectedTime,
          selectedTableIds,
          endTime,
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

  const selectedTableLabels = tables
    .filter((table) => selectedTableIds.includes(table.table_id))
    .map((table) => table.table_number)
    .join(", ");

  // What is still missing before the reservation can be saved
  const missingStep = !tablesFitParty
    ? selectedTableIds.length === 0
      ? "Choose at least one table"
      : "Add a table to seat the whole party"
    : !selectedTime
      ? "Choose a start time"
      : !endTime || !intervalAvailable
        ? "Choose an end time"
        : !customerName.trim()
          ? "Enter the customer name"
          : "";

  function openBooking(date = selectedDate) {
    if (blockedDates.has(date)) {
      setSelectedDate(date);
      setCurrentDate(new Date(`${date}T00:00:00`));
      alert(`${formatDate(date)} is unavailable for new reservations.`);
      return;
    }
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
    const date = getServiceDate(start);
    setEditingReservationId(reservation.id);
    setSelectedDate(date);
    setCurrentDate(new Date(`${date}T00:00:00`));
    setCustomerName(reservation.customer);
    setCustomerPhone(reservation.phone ?? "");
    setPartySize(String(reservation.guests));
    setTableIds(
      reservation.tableIds
        .filter((id) =>
          isTimeAvailable(
            date,
            timeKey(start),
            id,
            timeKey(end),
            reservation.id,
          ),
        )
        .map(String),
    );
    setSelectedTime(timeKey(start));
    setEndTime(timeKey(end));
    setSource(reservation.source || "Walk-in");
    setOccasion(reservation.occasion || "");
    setDialogOpen(true);
  }

  function changeBookingDate(date: string) {
    setSelectedDate(date);
    setCurrentDate(new Date(`${date}T00:00:00`));
    setTableIds([]);
    setSelectedTime("");
    setEndTime("");
  }

  function changePartySize(value: string) {
    setPartySize(value);
    setTableIds([]);
    setSelectedTime("");
    setEndTime("");
  }

  function toggleTable(table: RestaurantTable) {
    const id = table.table_id.toString();
    const nextTableIds = tableIds.includes(id)
      ? tableIds.filter((item) => item !== id)
      : [...tableIds, id];
    setTableIds(nextTableIds);

    const nextCapacity = tables
      .filter((item) => nextTableIds.includes(item.table_id.toString()))
      .reduce((total, item) => total + item.capacity, 0);
    const selectedTimeAvailable =
      nextCapacity >= guestCount &&
      nextTableIds.every((tid) =>
        isTimeAvailable(
          selectedDate,
          selectedTime,
          Number(tid),
          undefined,
          editingReservationId,
        ),
      );

    if (selectedTime && !selectedTimeAvailable) {
      setSelectedTime("");
      setEndTime("");
    } else if (selectedTime) {
      const nextEndTimes = getAvailableEndTimes(
        selectedDate,
        selectedTime,
        nextTableIds.map(Number),
        endTime,
      );
      const defaultEndTime = addMinutesToTime(
        selectedTime,
        RESERVATION_DURATION_MINUTES,
      );
      setEndTime(
        nextEndTimes.includes(endTime)
          ? endTime
          : nextEndTimes.includes(defaultEndTime)
            ? defaultEndTime
            : nextEndTimes[0] || "",
      );
    }
  }

  function chooseStartTime(nextStartTime: string) {
    setSelectedTime(nextStartTime);
    if (!nextStartTime) {
      setEndTime("");
      return;
    }

    const availableSelectedTableIds = selectedTableIds.filter((id) =>
      isTimeAvailable(
        selectedDate,
        nextStartTime,
        id,
        undefined,
        editingReservationId,
      ),
    );
    setTableIds(availableSelectedTableIds.map(String));
    const nextCapacity = tables
      .filter((table) => availableSelectedTableIds.includes(table.table_id))
      .reduce((total, table) => total + table.capacity, 0);
    const nextDefaultEndTime = nextStartTime
      ? addMinutesToTime(nextStartTime, RESERVATION_DURATION_MINUTES)
      : "";
    const nextAvailableEndTimes =
      availableSelectedTableIds.length > 0 && nextCapacity >= guestCount
        ? getAvailableEndTimes(
            selectedDate,
            nextStartTime,
            availableSelectedTableIds,
          )
        : [];
    setEndTime(
      nextAvailableEndTimes.includes(nextDefaultEndTime)
        ? nextDefaultEndTime
        : nextAvailableEndTimes[0] || "",
    );
  }

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockedDates.has(selectedDate)) {
      alert(`${formatDate(selectedDate)} is unavailable for new reservations.`);
      return;
    }
    if (missingStep) {
      alert(missingStep);
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
            end_at: toSqlDateTime(selectedDate, endTime),
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

  async function toggleBlockSelectedDay() {
    if (selectedDate < dateKey(now)) return;
    const isBlocked = blockedDates.has(selectedDate);
    if (
      isBlocked &&
      !confirm(`Make ${formatDate(selectedDate)} available for reservations?`)
    ) {
      return;
    }

    setBlockingDay(true);
    try {
      const res = await fetch(apiUrl("Reservation/BlockDay.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isBlocked ? "unblock" : "block",
          date: selectedDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update availability");
      }
      setBlockedDates((current) => {
        const next = new Set(current);
        if (isBlocked) next.delete(selectedDate);
        else next.add(selectedDate);
        return next;
      });
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to update availability",
      );
    } finally {
      setBlockingDay(false);
    }
  }

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
    (reservation) =>
      getServiceDate(toLocalDateTime(reservation.startAt)) === selectedDate,
  );
  const selectedDayIsBlocked = blockedDates.has(selectedDate);

  const selectClass =
    "border-input bg-background h-10 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

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
            <Button onClick={() => openBooking()} className="gap-1.5">
              <Plus className="size-4" /> New reservation
            </Button>
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
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="h-4 w-[1px] bg-neutral-200" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextMonth}
                  className="rounded-none h-9 w-9"
                  aria-label="Next month"
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
                    (reservation) =>
                      getServiceDate(toLocalDateTime(reservation.startAt)) ===
                      dateStr,
                  );
                  const hasBookings = dayReservations.length > 0;
                  const hasAvailability = hasAvailableTable(dateStr);
                  const isBlocked = blockedDates.has(dateStr);
                  const hasNoAvailability =
                    availabilityChecked &&
                    dateStr >= dateKey(now) &&
                    !isBlocked &&
                    !hasAvailability;
                  const isSelected = selectedDate === dateStr;
                  const isPastDate = dateStr < dateKey(now);

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() =>
                        isPastDate
                          ? setSelectedDate(dateStr)
                          : openBooking(dateStr)
                      }
                      aria-label={`${formatDate(dateStr)}${isBlocked ? ", unavailable" : hasNoAvailability ? ", unavailable for new bookings" : ""}${hasBookings ? `, ${dayReservations.length} booking${dayReservations.length > 1 ? "s" : ""}` : ", no bookings"}`}
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
                          {isBlocked && (
                            <div className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded truncate dark:bg-red-950/40 dark:text-red-400">
                              Unavailable
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
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarCheck className="size-4 text-primary" /> Bookings for{" "}
                {selectedDate}
              </CardTitle>
              <Button
                type="button"
                variant={selectedDayIsBlocked ? "outline" : "destructive"}
                size="sm"
                className="shrink-0"
                disabled={blockingDay || selectedDate < dateKey(now)}
                onClick={() => void toggleBlockSelectedDay()}
              >
                {blockingDay && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                {selectedDayIsBlocked ? "Make available" : "Block day"}
              </Button>
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

      {/* ───────────── Reservation dialog ───────────── */}
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)] overflow-hidden max-h-[calc(100dvh-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingReservationId ? "Edit reservation" : "New reservation"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmitReservation}
          className="flex min-h-0 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-2 pb-2">
            {/* Date + guests */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reservation-date">Date</Label>
                <Input
                  id="reservation-date"
                  type="date"
                  className="h-10"
                  min={editingReservationId ? undefined : dateKey(now)}
                  value={selectedDate}
                  onChange={(e) => changeBookingDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reservation-party-size">Guests</Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 shrink-0"
                    aria-label="Fewer guests"
                    disabled={guestCount <= 1}
                    onClick={() =>
                      changePartySize(String(Math.max(1, guestCount - 1)))
                    }
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    id="reservation-party-size"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    className="h-10 text-center"
                    value={partySize}
                    onChange={(e) => changePartySize(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 shrink-0"
                    aria-label="More guests"
                    onClick={() => changePartySize(String(guestCount + 1))}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 1 — tables */}
            <div className="space-y-3">
              <StepHeading
                step={1}
                title="Choose tables"
                hint={`Pick one or more tables that seat ${guestCount || "your"} guest${guestCount === 1 ? "" : "s"}.`}
                done={tablesFitParty}
              />
              {tablesLoading ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" /> Loading tables…
                </p>
              ) : tables.length === 0 ? (
                <p className="text-destructive text-sm">
                  No active tables found. Add a table first.
                </p>
              ) : (
                <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                  {tables.map((table) => {
                    const checked = tableIds.includes(
                      table.table_id.toString(),
                    );
                    const available = selectableTableIds.has(table.table_id);
                    return (
                      <button
                        key={table.table_id}
                        type="button"
                        disabled={!available}
                        aria-pressed={checked}
                        onClick={() => toggleTable(table)}
                        className={`relative flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                          checked
                            ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                            : available
                              ? "bg-background hover:border-primary/50 hover:bg-muted/50"
                              : "cursor-not-allowed bg-muted/40 opacity-50"
                        }`}
                      >
                        {checked && (
                          <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3" />
                          </span>
                        )}
                        <span className="text-sm font-semibold">
                          {table.table_number}
                        </span>
                        <span className="text-muted-foreground w-full truncate text-xs">
                          {table.table_name}
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-xs font-medium">
                          <Users className="size-3" />
                          {table.capacity} seats
                        </span>
                        {!available && (
                          <span className="text-destructive text-[11px]">
                            Booked
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedTableIds.length > 0 && (
                <p
                  aria-live="polite"
                  className={`text-xs ${
                    tablesFitParty
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {selectedTableIds.length} table
                  {selectedTableIds.length > 1 ? "s" : ""} selected ·{" "}
                  {selectedTableCapacity} of {guestCount} seats
                  {tablesFitParty
                    ? " — enough room"
                    : " — add another table to seat everyone"}
                </p>
              )}
            </div>

            {/* Step 2 — time */}
            <div
              className={`space-y-3 transition-opacity ${tablesFitParty ? "" : "opacity-50"}`}
            >
              <StepHeading
                step={2}
                title="Pick a time"
                hint={
                  tablesFitParty
                    ? `${formatDate(selectedDate)} · end time defaults to 90 minutes later.`
                    : "Choose tables first to see open times."
                }
                done={Boolean(selectedTime) && intervalAvailable}
              />
              {tablesFitParty && availableTimes.length === 0 ? (
                <p className="text-destructive text-sm">
                  These tables have no open start times on this date. Try other
                  tables or another day.
                </p>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Start time"
                  className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                >
                  {(tablesFitParty ? availableTimes : SERVICE_TIMES).map(
                    (time) => (
                      <button
                        key={time}
                        type="button"
                        role="radio"
                        aria-checked={selectedTime === time}
                        disabled={!tablesFitParty}
                        onClick={() => chooseStartTime(time)}
                        className={`h-9 rounded-md border text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                          selectedTime === time
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background hover:border-primary/50 hover:bg-muted/50 disabled:cursor-not-allowed"
                        }`}
                      >
                        {formatTime(time)}
                      </button>
                    ),
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="reservation-end-time">Ends at</Label>
                <select
                  id="reservation-end-time"
                  className={selectClass}
                  disabled={!selectedTime || !tablesFitParty}
                  value={availableEndTimes.includes(endTime) ? endTime : ""}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    {!selectedTime
                      ? "Choose a start time first"
                      : availableEndTimes.length === 0
                        ? "No available end times"
                        : "Choose an end time"}
                  </option>
                  {availableEndTimes.map((time) => (
                    <option key={time} value={time}>
                      {formatTime(time)}
                    </option>
                  ))}
                </select>
                {endTime && endTime !== selectedTime && !intervalAvailable && (
                  <p className="text-destructive text-xs">
                    The selected tables are not available for this time range.
                  </p>
                )}
              </div>
            </div>

            {/* Step 3 — guest details */}
            <div className="space-y-3">
              <StepHeading
                step={3}
                title="Guest details"
                done={Boolean(customerName.trim())}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="reservation-customer-name">Name</Label>
                  <Input
                    id="reservation-customer-name"
                    className="h-10"
                    placeholder="Customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reservation-customer-phone">
                    Phone (optional)
                  </Label>
                  <Input
                    id="reservation-customer-phone"
                    className="h-10"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Booked via</Label>
                <div
                  role="radiogroup"
                  aria-label="Booking source"
                  className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
                >
                  {SOURCES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={source === option}
                      onClick={() => setSource(option)}
                      className={`h-8 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                        source === option
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reservation-occasion">
                  Occasion (optional)
                </Label>
                <Input
                  id="reservation-occasion"
                  className="h-10"
                  placeholder="e.g. Birthday, Anniversary"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Sticky footer: summary + save */}
          <div className="space-y-2 border-t bg-background pt-3">
            {selectedTime && endTime && intervalAvailable && (
              <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                <span className="font-medium text-foreground">
                  {formatDate(selectedDate)}
                </span>
                <span>
                  {formatTime(selectedTime)} – {formatTime(endTime)}
                </span>
                <span>
                  Table {selectedTableLabels} · {guestCount} guest
                  {guestCount === 1 ? "" : "s"}
                </span>
              </p>
            )}
            {missingStep && (
              <p className="text-muted-foreground text-xs">{missingStep}.</p>
            )}
            <Button
              type="submit"
              className="h-10 w-full"
              disabled={submitting || Boolean(missingStep)}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingReservationId ? "Update reservation" : "Save reservation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
