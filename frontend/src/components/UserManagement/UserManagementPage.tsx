import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api";

type ManagedUser = {
  user_id: number;
  full_name: string;
  username: string;
  email: string;
  role: string;
  is_active: number | string;
  last_login: string | null;
};

type UserForm = {
  full_name: string;
  username: string;
  email: string;
  role: string;
  password: string;
  is_active: string;
};

const emptyForm: UserForm = {
  full_name: "",
  username: "",
  email: "",
  role: "staff",
  password: "",
  is_active: "1",
};

async function readResponse<T>(response: Response) {
  const data = (await response.json()) as {
    success: boolean;
    message?: string;
    data?: T;
  };
  if (!response.ok || !data.success) {
    throw new Error(data.message || "The user request failed");
  }
  return data;
}

async function fetchUsers() {
  const response = await fetch(apiUrl("User/GetUsers.php"));
  const result = await readResponse<ManagedUser[]>(response);
  return result.data ?? [];
}

export default function UserManagementPage({
  currentUserEmail,
}: {
  currentUserEmail: string;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      try {
        const data = await fetchUsers();
        if (active) {
          setUsers(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load users");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadUsers();
    return () => {
      active = false;
    };
  }, []);

  function openCreateDialog() {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(user: ManagedUser) {
    setEditingUser(user);
    setForm({
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role: user.role,
      password: "",
      is_active: Number(user.is_active) === 1 ? "1" : "0",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        apiUrl(
          editingUser ? "User/UpdateUser.php" : "User/CreateUser.php",
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            ...(editingUser ? { user_id: editingUser.user_id } : {}),
          }),
        },
      );
      await readResponse(response);
      setDialogOpen(false);
      try {
        setUsers(await fetchUsers());
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? `User saved, but the list could not be refreshed: ${err.message}`
            : "User saved, but the list could not be refreshed",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: ManagedUser) {
    if (!confirm(`Delete the account for ${user.full_name}?`)) return;
    setDeletingId(user.user_id);
    setError(null);
    try {
      const response = await fetch(apiUrl("User/DeleteUser.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id }),
      });
      await readResponse(response);
      setUsers((current) =>
        current.filter((currentUser) => currentUser.user_id !== user.user_id),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-sm text-neutral-500">
            Create and manage staff accounts.
          </p>
        </div>
        <Button type="button" className="gap-2" onClick={openCreateDialog}>
          <Plus className="size-4" /> Add User
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" /> Staff Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500">
              <Loader2 className="size-4 animate-spin" /> Loading users...
            </div>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-500">
              No user accounts found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Username</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => {
                    const isCurrentUser =
                      user.email.toLowerCase() === currentUserEmail.toLowerCase();
                    const isActive = Number(user.is_active) === 1;
                    return (
                      <tr key={user.user_id}>
                        <td className="py-3 font-medium">
                          {user.full_name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-neutral-500">
                              (You)
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-neutral-500">{user.username}</td>
                        <td className="py-3 text-neutral-500">{user.email}</td>
                        <td className="py-3">{user.role}</td>
                        <td className="py-3">
                          <Badge
                            variant={isActive ? "default" : "outline"}
                            className={isActive ? "bg-emerald-600" : ""}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${user.full_name}`}
                              onClick={() => openEditDialog(user)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${user.full_name}`}
                              disabled={
                                isCurrentUser || deletingId === user.user_id
                              }
                              onClick={() => void handleDelete(user)}
                              className="text-red-500 hover:text-red-700"
                            >
                              {deletingId === user.user_id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!saving) setDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Create User"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="user-full-name">Full name</Label>
              <Input
                id="user-full-name"
                value={form.full_name}
                onChange={(event) =>
                  setForm({ ...form, full_name: event.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-username">Username</Label>
              <Input
                id="user-username"
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-role">Role</Label>
              <Input
                id="user-role"
                value={form.role}
                onChange={(event) =>
                  setForm({ ...form, role: event.target.value })
                }
                placeholder="staff"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-password">
                Password{editingUser ? " (leave blank to keep current)" : ""}
              </Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                minLength={6}
                required={!editingUser}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-status">Status</Label>
              <select
                id="user-status"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={form.is_active}
                disabled={
                  editingUser?.email.toLowerCase() ===
                  currentUserEmail.toLowerCase()
                }
                onChange={(event) =>
                  setForm({ ...form, is_active: event.target.value })
                }
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingUser ? "Save Changes" : "Create User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
