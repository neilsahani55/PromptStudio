"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Users,
  Search,
  ArrowUpDown,
  Loader2,
  MoreHorizontal,
  UserPlus,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  Key,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/auth-provider";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin: string | null;
  activityCount: number;
}

type SortField =
  | "name"
  | "email"
  | "role"
  | "createdAt"
  | "lastLogin"
  | "activityCount";
type SortDir = "asc" | "desc";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Add User dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [addLoading, setAddLoading] = useState(false);

  // Alert dialog state
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    destructive?: boolean;
  }>({
    open: false,
    title: "",
    description: "",
    action: () => {},
    destructive: false,
  });

  // Temp password dialog state
  const [tempPasswordDialog, setTempPasswordDialog] = useState<{
    open: boolean;
    password: string;
  }>({ open: false, password: "" });

  // Action loading state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      const mapped = (data.users || data).map((u: any) => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status || "active",
        createdAt: u.created_at || u.createdAt || "",
        lastLogin: u.last_login || u.lastLogin || null,
        activityCount: u.activity_count ?? u.activityCount ?? 0,
      }));
      setUsers(mapped);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...users];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "");
          break;
        case "email":
          cmp = a.email.localeCompare(b.email);
          break;
        case "role":
          cmp = a.role.localeCompare(b.role);
          break;
        case "createdAt":
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "lastLogin":
          cmp =
            new Date(a.lastLogin || 0).getTime() -
            new Date(b.lastLogin || 0).getTime();
          break;
        case "activityCount":
          cmp = a.activityCount - b.activityCount;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [users, search, sortField, sortDir]);

  // --- Action Handlers ---

  const handleAddUser = async () => {
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }
      setAddDialogOpen(false);
      setAddForm({ name: "", email: "", password: "", role: "user" });
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setAddLoading(false);
    }
  };

  const handleChangeRole = (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    setAlertDialog({
      open: true,
      title: "Change User Role",
      description: `Are you sure you want to change ${user.name || user.email}'s role from "${user.role}" to "${newRole}"?`,
      action: async () => {
        setActionLoading(user.id);
        try {
          const res = await fetch(`/api/admin/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to update role");
          }
          await fetchUsers();
        } catch (err) {
          alert(err instanceof Error ? err.message : "Failed to update role");
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleToggleStatus = (user: User) => {
    const newStatus = user.status === "active" ? "blocked" : "active";
    const actionLabel = newStatus === "blocked" ? "block" : "unblock";
    setAlertDialog({
      open: true,
      title: `${newStatus === "blocked" ? "Block" : "Unblock"} User`,
      description: `Are you sure you want to ${actionLabel} ${user.name || user.email}?`,
      action: async () => {
        setActionLoading(user.id);
        try {
          const res = await fetch(`/api/admin/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to update status");
          }
          await fetchUsers();
        } catch (err) {
          alert(
            err instanceof Error ? err.message : "Failed to update status"
          );
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleResetPassword = (user: User) => {
    setAlertDialog({
      open: true,
      title: "Reset Password",
      description: `Are you sure you want to reset the password for ${user.name || user.email}? A temporary password will be generated.`,
      action: async () => {
        setActionLoading(user.id);
        try {
          const res = await fetch(`/api/admin/users/${user.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset-password" }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to reset password");
          }
          const data = await res.json();
          setTempPasswordDialog({
            open: true,
            password: data.temporaryPassword,
          });
        } catch (err) {
          alert(
            err instanceof Error ? err.message : "Failed to reset password"
          );
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleDeleteUser = (user: User) => {
    setAlertDialog({
      open: true,
      title: "Delete User",
      description:
        "This action cannot be undone. This will permanently delete the user account and all associated data.",
      destructive: true,
      action: async () => {
        setActionLoading(user.id);
        try {
          const res = await fetch(`/api/admin/users/${user.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to delete user");
          }
          await fetchUsers();
        } catch (err) {
          alert(err instanceof Error ? err.message : "Failed to delete user");
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const isCurrentUser = (userId: string) => {
    return currentUser && String(currentUser.id) === userId;
  };

  const SortableHead = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown
          className={`h-3.5 w-3.5 ${
            sortField === field
              ? "text-primary"
              : "text-muted-foreground/50"
          }`}
        />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-body">Users</h2>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-1">
              {filteredAndSorted.length} of {users.length} users
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {search ? "No users match your search" : "No users found"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead field="name">Name</SortableHead>
                    <SortableHead field="email">Email</SortableHead>
                    <SortableHead field="role">Role</SortableHead>
                    <TableHead>Status</TableHead>
                    <SortableHead field="createdAt">Joined</SortableHead>
                    <SortableHead field="lastLogin">Last Login</SortableHead>
                    <SortableHead field="activityCount">Activity</SortableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSorted.map((user) => (
                    <TableRow
                      key={user.id}
                      className={
                        user.status === "blocked" ? "opacity-50" : ""
                      }
                    >
                      <TableCell className="font-medium">
                        {user.name || (
                          <span className="text-muted-foreground italic">
                            No name
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin" ? "default" : "secondary"
                          }
                          className={
                            user.role === "admin"
                              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                              : ""
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === "active"
                              ? "default"
                              : "destructive"
                          }
                          className={
                            user.status === "active"
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : ""
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(user.lastLogin)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {user.activityCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        {actionLoading === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setTimeout(() => handleChangeRole(user), 0);
                                }}
                                disabled={isCurrentUser(user.id) || false}
                              >
                                {user.role === "admin" ? (
                                  <>
                                    <ShieldOff className="h-4 w-4 mr-2" />
                                    Change to User
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Change to Admin
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setTimeout(() => handleToggleStatus(user), 0);
                                }}
                                disabled={isCurrentUser(user.id) || false}
                              >
                                {user.status === "active" ? (
                                  <>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Block User
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Unblock User
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setTimeout(() => handleResetPassword(user), 0);
                                }}
                              >
                                <Key className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setTimeout(() => handleDeleteUser(user), 0);
                                }}
                                disabled={isCurrentUser(user.id) || false}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password</Label>
              <Input
                id="add-password"
                type="password"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="Password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(value) =>
                  setAddForm((f) => ({ ...f, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={addLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={
                addLoading ||
                !addForm.name ||
                !addForm.email ||
                !addForm.password
              }
            >
              {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Alert Dialog */}
      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) =>
          setAlertDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const run = alertDialog.action;
                setAlertDialog((prev) => ({ ...prev, open: false }));
                setTimeout(() => run(), 0);
              }}
              className={
                alertDialog.destructive
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : ""
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temporary Password Dialog */}
      <Dialog
        open={tempPasswordDialog.open}
        onOpenChange={(open) =>
          setTempPasswordDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              The temporary password has been generated. Please share it with
              the user securely. They should change it after logging in.
            </p>
            <div className="bg-muted rounded-md p-3 font-mono text-sm select-all">
              {tempPasswordDialog.password}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                setTempPasswordDialog({ open: false, password: "" })
              }
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
