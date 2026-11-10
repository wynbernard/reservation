import { useState, useEffect, type FormEvent } from "react";
import { Toast } from "@base-ui/react/toast";
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Loader2,
  Users,
  Pencil,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ToastData = { variant: "success" | "error" };

type RestaurantTable = {
  table_id: number;
  area_id: number;
  table_number: string;
  table_name: string;
  capacity: number;
  shape: string;
  is_active: number | string;
  notes?: string;
};

type TableArea = {
  area_id: number;
  area_name: string;
};

type TableForm = {
  area_id: string;
  table_number: string;
  table_name: string;
  capacity: string;
  shape: string;
  is_active: string;
  notes: string;
};

const emptyForm: TableForm = {
  area_id: "",
  table_number: "",
  table_name: "",
  capacity: "2",
  shape: "round",
  is_active: "1",
  notes: "",
};

async function readResponse<T>(response: Response) {
  const data = (await response.json()) as {
    success: boolean;
    message?: string;
    data?: T;
  };
  if (!response.ok || !data.success) {
    throw new Error(data.message || "The table request failed");
  }
  return data;
}

export default function TableListPage() {
  const { add: showToast } = Toast.useToastManager<ToastData>();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [form, setForm] = useState<TableForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [tablesResponse, areasResponse] = await Promise.all([
          fetch(apiUrl("Table/GetTable.php")),
          fetch(apiUrl("Table/GetAreas.php")),
        ]);
        const [tableData, areaData] = await Promise.all([
          readResponse<RestaurantTable[]>(tablesResponse),
          readResponse<TableArea[]>(areasResponse),
        ]);
        if (!active) return;
        setTables(tableData.data ?? []);
        setAreas(areaData.data ?? []);
        showToast({
          title: "Tables loaded",
          description: `${tableData.data?.length ?? 0} tables found.`,
          type: "success",
          data: { variant: "success" },
        });
        setForm((current) => ({
          ...current,
          area_id: areaData.data?.[0]?.area_id.toString() ?? "",
        }));
      } catch (err) {
        if (active) {
          showToast({
            title: "Could not load tables",
            description:
              err instanceof Error
                ? err.message
                : "Failed to load restaurant tables",
            type: "error",
            priority: "high",
            data: { variant: "error" },
          });
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load restaurant tables",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [showToast]);

  function openAddDialog() {
    setEditingTable(null);
    setForm({
      ...emptyForm,
      area_id: areas[0]?.area_id.toString() ?? "",
    });
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(table: RestaurantTable) {
    setEditingTable(table);
    setForm({
      area_id: table.area_id.toString(),
      table_number: table.table_number,
      table_name: table.table_name ?? "",
      capacity: table.capacity.toString(),
      shape: table.shape,
      is_active: Number(table.is_active) ? "1" : "0",
      notes: table.notes ?? "",
    });
    setError(null);
    setDialogOpen(true);
  }

  function updateForm(field: keyof TableForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const endpoint = editingTable
        ? "Table/UpdateTable.php"
        : "Table/CreateTable.php";
      const response = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          area_id: Number(form.area_id),
          capacity: Number(form.capacity),
          is_active: Number(form.is_active),
          ...(editingTable ? { table_id: editingTable.table_id } : {}),
        }),
      });
      await readResponse(response);
      const listResponse = await fetch(apiUrl("Table/GetTable.php"));
      const listData = await readResponse<RestaurantTable[]>(listResponse);
      setTables(listData.data ?? []);
      setDialogOpen(false);
      showToast({
        title: editingTable ? "Table updated" : "Table created",
        description: `${form.table_number} was saved successfully.`,
        type: "success",
        data: { variant: "success" },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save restaurant table";
      setError(message);
      showToast({
        title: editingTable ? "Could not update table" : "Could not create table",
        description: message,
        type: "error",
        priority: "high",
        data: { variant: "error" },
      });
    } finally {
      setSaving(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this table?")) return;
    setError(null);
    try {
      const response = await fetch(apiUrl("Table/DeleteTable.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: id }),
      });
      await readResponse(response);
      setTables((current) => current.filter((table) => table.table_id !== id));
      showToast({
        title: "Table deleted",
        description: "The table was removed successfully.",
        type: "success",
        data: { variant: "success" },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete restaurant table";
      setError(message);
      showToast({
        title: "Could not delete table",
        description: message,
        type: "error",
        priority: "high",
        data: { variant: "error" },
      });
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Restaurant Tables
          </h2>
          <p className="text-sm text-neutral-500">
            Manage seating arrangements, capacities, and active floor layouts.
          </p>
        </div>

        <Button className="gap-2" onClick={openAddDialog}>
          <Plus className="size-4" /> Add Table
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Seating Directory</CardTitle>
          <CardDescription>
            All configured dining tables and floor locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-neutral-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs uppercase">
                  <tr>
                    <th className="pb-3 font-medium">Table #</th>
                    <th className="pb-3 font-medium">Name / Label</th>
                    <th className="pb-3 font-medium">Capacity</th>
                    <th className="pb-3 font-medium">Shape</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Notes</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {tables.length > 0 ? (
                    tables.map((tbl) => (
                      <tr
                        key={tbl.table_id}
                        className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50"
                      >
                        <td className="py-3 font-semibold">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs">
                            {tbl.table_number}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-neutral-900 dark:text-neutral-100">
                          {tbl.table_name || "—"}
                        </td>
                        <td className="py-3 text-neutral-600 dark:text-neutral-400">
                          <span className="flex items-center gap-1.5">
                            <Users className="size-3.5 text-neutral-400" />{" "}
                            {tbl.capacity} Seats
                          </span>
                        </td>
                        <td className="py-3 text-neutral-600 dark:text-neutral-400 capitalize">
                          {tbl.shape}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={tbl.is_active ? "default" : "outline"}
                            className={
                              tbl.is_active
                                ? "bg-emerald-600 text-[10px]"
                                : "text-[10px] text-neutral-400"
                            }
                          >
                            {tbl.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3 text-neutral-400 text-xs italic truncate max-w-[200px]">
                          {tbl.notes || "—"}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Edit ${tbl.table_number}`}
                            onClick={() => openEditDialog(tbl)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${tbl.table_number}`}
                            className="size-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => handleDelete(tbl.table_id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center text-neutral-400"
                      >
                        <UtensilsCrossed className="mx-auto size-8 mb-2 opacity-40" />
                        <p className="text-sm font-medium">
                          No tables configured yet
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Click "Add Table" to set up your restaurant seating
                          layout.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTable ? "Edit Table" : "Add Table"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="table-number">Table number</Label>
                <Input
                  id="table-number"
                  value={form.table_number}
                  onChange={(event) =>
                    updateForm("table_number", event.target.value)
                  }
                  maxLength={20}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-name">Name / label</Label>
                <Input
                  id="table-name"
                  value={form.table_name}
                  onChange={(event) =>
                    updateForm("table_name", event.target.value)
                  }
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-area">Area</Label>
                <select
                  id="table-area"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={form.area_id}
                  onChange={(event) =>
                    updateForm("area_id", event.target.value)
                  }
                  required
                >
                  {areas.map((area) => (
                    <option key={area.area_id} value={area.area_id}>
                      {area.area_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-capacity">Capacity (seats)</Label>
                <Input
                  id="table-capacity"
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(event) =>
                    updateForm("capacity", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-shape">Shape</Label>
                <select
                  id="table-shape"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm capitalize"
                  value={form.shape}
                  onChange={(event) => updateForm("shape", event.target.value)}
                >
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                  <option value="rectangle">Rectangle</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-status">Status</Label>
                <select
                  id="table-status"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={form.is_active}
                  onChange={(event) =>
                    updateForm("is_active", event.target.value)
                  }
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-notes">Notes</Label>
              <Input
                id="table-notes"
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                maxLength={255}
              />
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={saving || areas.length === 0}
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {saving
                ? "Saving..."
                : editingTable
                  ? "Save Changes"
                  : "Create Table"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
