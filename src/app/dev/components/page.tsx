"use client";

import React, { useState } from "react";
import {
  FileText,
  Inbox,
  Plus,
  Trash2,
  Search,
  Bell,
  Settings,
} from "lucide-react";

// UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUpload, type FileUploadFile } from "@/components/ui/file-upload";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Skeleton,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonDetailPanel,
} from "@/components/ui/skeleton";
import { ProgressBar, Stepper, type StepItem } from "@/components/ui/progress";
import { ApprovalTimeline, type TimelineItem } from "@/components/ui/approval-timeline";
import { Separator } from "@/components/ui/separator";
import type { InvoiceRequestStatus } from "@/lib/types";

/* ─── SECTION WRAPPER ─────────────────────────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <Separator />
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SubSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

/* ─── TOAST DEMO (needs provider context) ─────────────────────────────────── */

function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => toast({ title: "Default toast", description: "Something happened." })}
      >
        Default
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({ title: "Success!", description: "Invoice approved.", variant: "success" })
        }
      >
        Success
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({ title: "Error", description: "Something went wrong.", variant: "error" })
        }
      >
        Error
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({ title: "Warning", description: "PAN is inoperative.", variant: "warning" })
        }
      >
        Warning
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({ title: "Info", description: "New invoice submitted.", variant: "info" })
        }
      >
        Info
      </Button>
    </div>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────────────────────────── */

export default function ComponentsQAPage() {
  // State for interactive demos
  const [selectValue, setSelectValue] = useState("");
  const [comboValue, setComboValue] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [fileValue, setFileValue] = useState<FileUploadFile | null>(null);
  const [activeTab, setActiveTab] = useState("tab1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [destructiveConfirmOpen, setDestructiveConfirmOpen] = useState(false);

  const comboOptions: ComboboxOption[] = [
    { value: "festive26", label: "Festive Sale 2026" },
    { value: "beautyq2", label: "Beauty Q2 Collab" },
    { value: "electronics", label: "Electronics Launch" },
    { value: "disabled1", label: "Archived Campaign", disabled: true },
  ];

  const selectOptions = [
    { value: "influencer", label: "Influencer" },
    { value: "business_manager", label: "Business Manager" },
    { value: "finance_manager", label: "Finance Manager" },
    { value: "admin", label: "Admin" },
  ];

  // Table demo data
  interface DemoRow {
    id: string;
    invoice: string;
    campaign: string;
    amount: string;
    status: InvoiceRequestStatus;
  }

  const tableData: DemoRow[] = [
    { id: "1", invoice: "INV-AK-001", campaign: "Festive Sale 2026", amount: "₹75,000", status: "pending_bm_approval" },
    { id: "2", invoice: "INV-AK-002", campaign: "Beauty Q2 Collab", amount: "₹42,000", status: "pending_finance_approval" },
    { id: "3", invoice: "INV-VR-010", campaign: "Electronics Launch", amount: "₹1,20,000", status: "approved_payment_pending" },
    { id: "4", invoice: "INV-VR-009", campaign: "Electronics Launch", amount: "₹50,000", status: "paid" },
    { id: "5", invoice: "INV-AK-000", campaign: "Festive Sale 2026", amount: "₹15,000", status: "rejected" },
  ];

  const tableColumns: ColumnDef<DemoRow>[] = [
    { key: "invoice", header: "Invoice #" },
    { key: "campaign", header: "Campaign" },
    { key: "amount", header: "Amount" },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  // Stepper demo
  const stepperItems: StepItem[] = [
    { label: "Mobile", status: "completed" },
    { label: "Email", status: "completed" },
    { label: "PAN", status: "current" },
    { label: "Bank", status: "upcoming" },
    { label: "Address", status: "upcoming" },
  ];

  // Timeline demo
  const timelineItems: TimelineItem[] = [
    {
      id: "1",
      label: "Invoice Submitted",
      description: "By Aisha Khan",
      timestamp: "Aug 2, 2026 08:00",
      status: "completed",
    },
    {
      id: "2",
      label: "BM Approved",
      description: "By Priya Sharma",
      timestamp: "Aug 3, 2026 09:15",
      status: "completed",
    },
    {
      id: "3",
      label: "Finance Approval",
      description: "Awaiting review",
      status: "current",
    },
    {
      id: "4",
      label: "Payment",
      description: "Pending",
      status: "upcoming",
    },
  ];

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-12">
          <div>
            <h1 className="text-2xl font-bold">Component Library QA</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every component in every state. Resize the window to test responsive behavior.
            </p>
          </div>

          {/* ─── BUTTONS ─────────────────────────────────────────── */}
          <Section title="Button">
            <SubSection label="Variants">
              <div className="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="link">Link</Button>
              </div>
            </SubSection>
            <SubSection label="Sizes">
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon"><Plus /></Button>
              </div>
            </SubSection>
            <SubSection label="Disabled">
              <div className="flex flex-wrap gap-3">
                <Button disabled>Disabled Primary</Button>
                <Button variant="secondary" disabled>Disabled Secondary</Button>
              </div>
            </SubSection>
            <SubSection label="With Icons">
              <div className="flex flex-wrap gap-3">
                <Button><Plus /> Create Invoice</Button>
                <Button variant="destructive"><Trash2 /> Delete</Button>
                <Button variant="outline"><Search /> Search</Button>
              </div>
            </SubSection>
          </Section>

          {/* ─── INPUT ───────────────────────────────────────────── */}
          <Section title="Input">
            <SubSection label="Default">
              <Input id="input-default" placeholder="Enter your name..." />
            </SubSection>
            <SubSection label="With Error">
              <Input
                id="input-error"
                placeholder="PAN number"
                value="INVALID"
                error="PAN format must be AAAAA9999A"
              />
            </SubSection>
            <SubSection label="Disabled">
              <Input id="input-disabled" placeholder="Disabled input" disabled />
            </SubSection>
          </Section>

          {/* ─── TEXTAREA ────────────────────────────────────────── */}
          <Section title="Textarea">
            <SubSection label="Default">
              <Textarea id="textarea-default" placeholder="Enter rejection reason..." />
            </SubSection>
            <SubSection label="With Error">
              <Textarea
                id="textarea-error"
                value=""
                error="Rejection comment is required"
              />
            </SubSection>
          </Section>

          {/* ─── SELECT ──────────────────────────────────────────── */}
          <Section title="Select">
            <SubSection label="Default">
              <Select
                id="select-default"
                options={selectOptions}
                placeholder="Select a role"
                value={selectValue}
                onChange={setSelectValue}
              />
            </SubSection>
            <SubSection label="With Error">
              <Select
                id="select-error"
                options={selectOptions}
                placeholder="Select a role"
                value=""
                error="Role is required"
              />
            </SubSection>
          </Section>

          {/* ─── COMBOBOX ────────────────────────────────────────── */}
          <Section title="Combobox (Searchable Select)">
            <SubSection label="Default">
              <Combobox
                id="combo-default"
                options={comboOptions}
                value={comboValue}
                onChange={setComboValue}
                placeholder="Select campaign..."
                searchPlaceholder="Search campaigns..."
              />
            </SubSection>
            <SubSection label="With Error">
              <Combobox
                id="combo-error"
                options={comboOptions}
                value=""
                placeholder="Select campaign..."
                error="Campaign selection is required"
              />
            </SubSection>
          </Section>

          {/* ─── DATE PICKER ─────────────────────────────────────── */}
          <Section title="Date Picker">
            <SubSection label="Default">
              <DatePicker
                id="date-default"
                value={dateValue}
                onChange={setDateValue}
              />
            </SubSection>
            <SubSection label="With Error">
              <DatePicker
                id="date-error"
                value=""
                error="Invoice date is required"
              />
            </SubSection>
          </Section>

          {/* ─── FILE UPLOAD ─────────────────────────────────────── */}
          <Section title="File Upload">
            <SubSection label="Empty (Drop Zone)">
              <FileUpload
                id="file-empty"
                value={null}
                onChange={() => {}}
              />
            </SubSection>
            <SubSection label="With File (Interactive)">
              <FileUpload
                id="file-demo"
                value={fileValue}
                onChange={setFileValue}
              />
            </SubSection>
            <SubSection label="With Error">
              <FileUpload
                id="file-error"
                value={null}
                onChange={() => {}}
                error="Invoice document is required"
              />
            </SubSection>
          </Section>

          {/* ─── STATUS BADGE ────────────────────────────────────── */}
          <Section title="Status Badge (Invoice States)">
            <div className="flex flex-wrap gap-3">
              <StatusBadge status="pending_bm_approval" />
              <StatusBadge status="pending_finance_approval" />
              <StatusBadge status="approved_payment_pending" />
              <StatusBadge status="paid" />
              <StatusBadge status="rejected" />
            </div>
          </Section>

          {/* ─── BADGE (base) ────────────────────────────────────── */}
          <Section title="Badge (Base)">
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
            </div>
          </Section>

          {/* ─── TABS ────────────────────────────────────────────── */}
          <Section title="Tabs">
            <Tabs
              tabs={[
                { id: "tab1", label: "Details" },
                { id: "tab2", label: "Timeline" },
                { id: "tab3", label: "Disabled", disabled: true },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            >
              <TabsContent tabId="tab1" activeTab={activeTab}>
                <p className="text-sm">This is the Details tab content. Use arrow keys to navigate between tabs.</p>
              </TabsContent>
              <TabsContent tabId="tab2" activeTab={activeTab}>
                <p className="text-sm">This is the Timeline tab content.</p>
              </TabsContent>
            </Tabs>
          </Section>

          {/* ─── CARD ────────────────────────────────────────────── */}
          <Section title="Card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice REQ-1001</CardTitle>
                  <CardDescription>Festive Sale 2026 campaign</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">₹75,000</p>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button size="sm">Approve</Button>
                  <Button size="sm" variant="outline">Reject</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Empty Card</CardTitle>
                  <CardDescription>Card with no content slot</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button size="sm" variant="ghost">Action</Button>
                </CardFooter>
              </Card>
            </div>
          </Section>

          {/* ─── DATA TABLE ──────────────────────────────────────── */}
          <Section title="Data Table (Responsive)">
            <p className="text-xs text-muted-foreground">
              Resize below md breakpoint to see stacked card layout.
            </p>
            <DataTable
              columns={tableColumns}
              data={tableData}
              rowKey={(row) => row.id}
              onRowClick={(row) => alert(`Clicked: ${row.invoice}`)}
            />
          </Section>

          {/* ─── DIALOG ──────────────────────────────────────────── */}
          <Section title="Dialog">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                Open Dialog
              </Button>
              <Button variant="outline" onClick={() => setConfirmOpen(true)}>
                Confirmation Dialog
              </Button>
              <Button variant="destructive" onClick={() => setDestructiveConfirmOpen(true)}>
                Destructive Confirm
              </Button>
            </div>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
              <DialogTitle>Invoice Details</DialogTitle>
              <DialogDescription>
                Review the invoice information below before proceeding.
              </DialogDescription>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="font-medium">Amount:</span> ₹75,000</p>
                <p><span className="font-medium">Campaign:</span> Festive Sale 2026</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => setDialogOpen(false)}>Approve</Button>
              </DialogFooter>
            </Dialog>

            <ConfirmationDialog
              open={confirmOpen}
              onClose={() => setConfirmOpen(false)}
              onConfirm={() => setConfirmOpen(false)}
              title="Approve Invoice?"
              description="This will advance the invoice to finance review. This action cannot be undone."
              confirmLabel="Yes, Approve"
            />

            <ConfirmationDialog
              open={destructiveConfirmOpen}
              onClose={() => setDestructiveConfirmOpen(false)}
              onConfirm={() => setDestructiveConfirmOpen(false)}
              title="Reject Invoice?"
              description="The influencer will be notified and will need to resubmit."
              confirmLabel="Reject"
              destructive
            />
          </Section>

          {/* ─── TOAST ───────────────────────────────────────────── */}
          <Section title="Toast">
            <p className="text-xs text-muted-foreground">
              Click buttons to trigger toasts (bottom-right, auto-dismiss 5s).
            </p>
            <ToastDemo />
          </Section>

          {/* ─── ALERT ───────────────────────────────────────────── */}
          <Section title="Alert">
            <div className="space-y-3">
              <Alert variant="info" title="Information">
                Your onboarding is in progress. Complete all steps to submit.
              </Alert>
              <Alert variant="success" title="Payment Confirmed">
                UTR NEFT240512001 has been recorded successfully.
              </Alert>
              <Alert variant="warning" title="PAN Inoperative">
                Your PAN is marked as inoperative by NSDL. Please contact support.
              </Alert>
              <Alert variant="error" title="Submission Failed">
                Invoice number INV-AK-001 already exists. Use a unique number.
              </Alert>
              <Alert variant="info">
                Alert without a title — just body text.
              </Alert>
            </div>
          </Section>

          {/* ─── EMPTY STATE ─────────────────────────────────────── */}
          <Section title="Empty State">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    icon={Inbox}
                    heading="No invoices yet"
                    description="Submit your first invoice to get started with payments."
                    action={<Button size="sm"><Plus /> Submit Invoice</Button>}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    icon={Bell}
                    heading="All caught up"
                    description="You have no new notifications."
                  />
                </CardContent>
              </Card>
            </div>
          </Section>

          {/* ─── SKELETON LOADERS ────────────────────────────────── */}
          <Section title="Skeleton Loaders">
            <SubSection label="Card Skeleton">
              <SkeletonCard />
            </SubSection>
            <SubSection label="Table Row Skeleton">
              <div className="rounded-lg border border-border overflow-hidden">
                <SkeletonTableRow columns={4} />
                <SkeletonTableRow columns={4} />
                <SkeletonTableRow columns={4} />
              </div>
            </SubSection>
            <SubSection label="Detail Panel Skeleton">
              <SkeletonDetailPanel />
            </SubSection>
            <SubSection label="Individual Skeletons">
              <div className="flex gap-4 items-center">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </SubSection>
          </Section>

          {/* ─── PROGRESS ────────────────────────────────────────── */}
          <Section title="Progress">
            <SubSection label="Linear Progress Bar">
              <div className="space-y-4">
                <ProgressBar value={0} label="Not started" />
                <ProgressBar value={35} label="Uploading..." />
                <ProgressBar value={75} label="Processing" />
                <ProgressBar value={100} label="Complete" />
              </div>
            </SubSection>
            <SubSection label="Stepper">
              <Stepper steps={stepperItems} />
            </SubSection>
          </Section>

          {/* ─── APPROVAL TIMELINE ───────────────────────────────── */}
          <Section title="Approval Timeline">
            <Card>
              <CardContent className="pt-6">
                <ApprovalTimeline items={timelineItems} />
              </CardContent>
            </Card>
          </Section>

          {/* ─── SEPARATOR ───────────────────────────────────────── */}
          <Section title="Separator">
            <div className="space-y-4">
              <p className="text-sm">Horizontal separator below:</p>
              <Separator />
              <div className="flex h-8 items-center gap-4">
                <span className="text-sm">Left</span>
                <Separator orientation="vertical" />
                <span className="text-sm">Right</span>
              </div>
            </div>
          </Section>

          {/* ─── FOCUS STATES DEMO ───────────────────────────────── */}
          <Section title="Keyboard Focus Demo">
            <p className="text-xs text-muted-foreground">
              Tab through these elements to verify visible focus rings (ring-2 ring-ring).
            </p>
            <div className="flex flex-wrap gap-3">
              <Button>Focusable Button</Button>
              <Button variant="outline">Outline</Button>
              <Input id="focus-input" placeholder="Tab here..." className="max-w-xs" />
              <Button variant="ghost"><Settings /> Settings</Button>
            </div>
          </Section>
        </div>
      </div>
    </ToastProvider>
  );
}
