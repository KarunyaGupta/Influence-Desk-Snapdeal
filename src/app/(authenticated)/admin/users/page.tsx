"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { useServices } from "@/components/providers";
import type { User, UserRole, ProfileEditRequest } from "@/lib/types";

const ROLE_LABELS: Record<UserRole, string> = {
  influencer: "Influencer",
  business_manager: "Business Mgr",
  finance_manager: "Finance Mgr",
  admin: "Admin",
};

const ROLE_COLORS: Record<UserRole, string> = {
  influencer: "bg-blue-100 text-blue-800",
  business_manager: "bg-purple-100 text-purple-800",
  finance_manager: "bg-emerald-100 text-emerald-800",
  admin: "bg-red-100 text-red-800",
};

function UsersContent() {
  const { admin, kyc } = useServices();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [editRequests, setEditRequests] = useState<ProfileEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("influencer");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const userList = await admin.listUsers();
        setUsers(userList);
        // Load edit requests for all influencers
        const allReqs: ProfileEditRequest[] = [];
        for (const u of userList.filter((u) => u.role === "influencer")) {
          try {
            const reqs = await kyc.listEditRequests(`SIF${u.id.replace("usr_inf_", "100000")}`);
            allReqs.push(...reqs);
          } catch { /* skip */ }
        }
        // Also try known influencer IDs
        try { allReqs.push(...await kyc.listEditRequests("SIF1000001")); } catch {}
        try { allReqs.push(...await kyc.listEditRequests("SIF1000002")); } catch {}
        // Deduplicate
        const seen = new Set<string>();
        setEditRequests(allReqs.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }));
      } catch { /* fallback */ }
      setLoading(false);
    }
    load();
  }, [admin, kyc]);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, roleFilter, search]);

  const pendingEdits = editRequests.filter((r) => r.status === "pending");

  async function handleCreate() {
    if (!newName.trim() || !newEmail.trim() || !newMobile.trim()) return;
    setCreating(true);
    try {
      const user = await admin.createUser({
        role: newRole,
        displayName: newName.trim(),
        email: newEmail.trim(),
        mobile: newMobile.trim(),
      });
      setUsers((prev) => [...prev, user]);
      setCreateOpen(false);
      setNewName(""); setNewEmail(""); setNewMobile("");
      toast({ title: "User created", description: `${user.displayName} added as ${ROLE_LABELS[user.role]}.`, variant: "success" });
    } catch (err: unknown) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function handleEditRequestAction(reqId: string, action: "approve" | "deny") {
    // Mock: just update local state (in real app this would call a service)
    setEditRequests((prev) =>
      prev.map((r) => r.id === reqId ? { ...r, status: action === "approve" ? "approved" as const : "rejected" as const, resolvedAt: new Date().toISOString() } : r),
    );
    toast({
      title: action === "approve" ? "Edit request approved" : "Edit request denied",
      variant: action === "approve" ? "success" : "warning",
    });
  }

  const columns: ColumnDef<User>[] = [
    {
      key: "displayName",
      header: "Name",
      render: (row) => <span className="text-sm font-medium">{row.displayName}</span>,
    },
    {
      key: "email",
      header: "Email",
      render: (row) => <span className="text-sm text-muted-foreground">{row.email}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[row.role]}`}>
          {ROLE_LABELS[row.role]}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.status === "active" ? "success" : row.status === "locked" ? "destructive" : "outline"} className="text-[10px]">
          {row.status}
        </Badge>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">User Management</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Pending Edit Requests */}
      {pendingEdits.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending Profile Edit Requests ({pendingEdits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingEdits.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{req.influencerId} — {req.fieldGroup}</p>
                  <p className="text-xs text-muted-foreground truncate">{req.reason}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => handleEditRequestAction(req.id, "approve")}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => handleEditRequestAction(req.id, "deny")}>
                    <XCircle className="h-3.5 w-3.5" /> Deny
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "influencer", "business_manager", "finance_manager", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${roleFilter === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {r === "all" ? "All" : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filtered} rowKey={(row) => row.id} />

      {/* Create User Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} className="max-w-sm">
        <DialogTitle>Add User</DialogTitle>
        <DialogDescription>Create a new user account.</DialogDescription>
        <div className="mt-4 space-y-3">
          <Input id="new-name" placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input id="new-email" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <Input id="new-mobile" placeholder="Mobile (10 digits)" value={newMobile} onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} />
          <Select
            id="new-role"
            options={[
              { value: "influencer", label: "Influencer" },
              { value: "business_manager", label: "Business Manager" },
              { value: "finance_manager", label: "Finance Manager" },
              { value: "admin", label: "Admin" },
            ]}
            value={newRole}
            onChange={(v) => setNewRole(v as UserRole)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <ToastProvider>
      <UsersContent />
    </ToastProvider>
  );
}
