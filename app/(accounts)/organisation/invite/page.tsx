"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	Mail,
	Plus,
	Loader2,
	RefreshCw,
	XCircle,
	Clock,
	CheckCircle2,
	Copy,
} from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import {
	useListInvitations,
	useInviteMember,
	useCancelInvitation,
	type Invitation,
} from "@/lib/queries/organization";
import { useGetSession } from "@/lib/queries/auth";

const ROLE_OPTIONS = [
	{ value: "owner", label: "Owner" },
	{ value: "ca", label: "CA" },
	{ value: "staff", label: "Staff" },
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteFormValues = {
	email: string;
	role: string;
};

function statusBadge(status: string) {
	switch (status) {
		case "pending":
			return (
				<Badge variant="secondary" className="gap-1">
					<Clock className="size-3" />
					Pending
				</Badge>
			);
		case "accepted":
			return (
				<Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
					<CheckCircle2 className="size-3" />
					Accepted
				</Badge>
			);
		case "canceled":
		case "cancelled":
			return (
				<Badge variant="destructive" className="gap-1">
					<XCircle className="size-3" />
					Cancelled
				</Badge>
			);
		case "rejected":
			return (
				<Badge variant="destructive" className="gap-1">
					<XCircle className="size-3" />
					Rejected
				</Badge>
			);
		default:
			return <Badge variant="outline">{status}</Badge>;
	}
}

function InviteDialog({
	open,
	onOpenChange,
	organizationId,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	organizationId: string;
}) {
	const inviteMutation = useInviteMember();
	const form = useForm<InviteFormValues>({
		defaultValues: { email: "", role: "owner" },
	});

	async function onSubmit(values: InviteFormValues) {
		if (!EMAIL_REGEX.test(values.email)) {
			form.setError("email", { message: "Please enter a valid email address." });
			return;
		}
		if (!values.role) {
			form.setError("role", { message: "Please select a role." });
			return;
		}
		try {
			await inviteMutation.mutateAsync({
				email: values.email,
				role: values.role,
				organizationId,
			});
			toast.success(`Invitation sent to ${values.email}`);
			form.reset();
			onOpenChange(false);
		} catch {
			toast.error("Failed to send invitation.");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Invite Member</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email Address</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="colleague@example.com"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Select role" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{ROLE_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" type="button">
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit" disabled={inviteMutation.isPending}>
								{inviteMutation.isPending ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Sending...
									</>
								) : (
									<>
										<Mail className="size-4" />
										Send Invitation
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function InvitationsTable({ data, isLoading }: { data: Invitation[]; isLoading: boolean }) {
	const cancelMutation = useCancelInvitation();

	const columns: ColumnDef<Invitation>[] = [
		{
			accessorKey: "email",
			header: "Email",
			cell: ({ row }) => (
				<span className="font-medium">{row.original.email}</span>
			),
		},
		{
			accessorKey: "role",
			header: "Role",
			cell: ({ row }) => (
				<Badge variant="outline" className="capitalize">
					{row.original.role}
				</Badge>
			),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => statusBadge(row.original.status),
		},
		{
			accessorKey: "expiresAt",
			header: "Expires",
			cell: ({ row }) =>
				new Date(row.original.expiresAt).toLocaleDateString("en-IN", {
					day: "numeric",
					month: "short",
					year: "numeric",
				}),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => {
				const inv = row.original;
				if (inv.status !== "pending") return null;
				return (
					<div className="flex items-center gap-2 justify-end">
						<Button
							variant="ghost"
							size="sm"
							className="h-7 text-xs"
							onClick={() => {
								navigator.clipboard.writeText(inv.id);
								toast.success("Invitation ID copied.");
							}}
						>
							<Copy className="size-3" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 text-xs text-destructive hover:text-destructive"
							disabled={cancelMutation.isPending}
							onClick={async () => {
								try {
									await cancelMutation.mutateAsync({ invitationId: inv.id });
									toast.success("Invitation cancelled.");
								} catch {
									toast.error("Failed to cancel invitation.");
								}
							}}
						>
							<XCircle className="size-3" />
							Cancel
						</Button>
					</div>
				);
			},
		},
	];

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	if (isLoading) {
		return (
			<div className="rounded-xl border bg-card shadow-sm">
				<div className="p-6 space-y-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="flex items-center gap-6">
							<Skeleton className="h-4 w-48" />
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-24" />
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-xl border bg-card shadow-sm">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id} className="hover:bg-transparent">
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									className="font-medium py-4 first:pl-6 last:pr-6"
								>
									{header.isPlaceholder
										? null
										: flexRender(header.column.columnDef.header, header.getContext())}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id} className="first:pl-6 last:pr-6">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
								No invitations yet.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

			{table.getPageCount() > 1 && (
				<div className="flex items-center justify-between border-t px-6 py-3">
					<span className="text-sm text-muted-foreground">
						Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
					</span>
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									href="#"
									onClick={(e) => {
										e.preventDefault();
										table.previousPage();
									}}
									className={cn(
										!table.getCanPreviousPage() && "pointer-events-none opacity-50",
									)}
								/>
							</PaginationItem>
							<PaginationItem>
								<PaginationNext
									href="#"
									onClick={(e) => {
										e.preventDefault();
										table.nextPage();
									}}
									className={cn(
										!table.getCanNextPage() && "pointer-events-none opacity-50",
									)}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}
		</div>
	);
}

export default function InvitePage() {
	const [inviteOpen, setInviteOpen] = useState(false);
	const { data: sessionData } = useGetSession();
	const { data: invitations, isLoading, refetch } = useListInvitations();

	const activeOrgId = sessionData?.session?.activeOrganizationId;

	return (
		<div className="min-h-full">
			<DashboardPageHeader title="invitations" />

			<div className="p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-lg font-semibold">Member Invitations</h2>
						<p className="text-sm text-muted-foreground">
							Invite new members to your organization and manage pending invitations.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => refetch()}
							disabled={isLoading}
						>
							<RefreshCw className="size-3.5" />
							Refresh
						</Button>
						<Button
							size="sm"
							onClick={() => setInviteOpen(true)}
							disabled={!activeOrgId}
						>
							<Plus className="size-3.5" />
							Invite Member
						</Button>
					</div>
				</div>

				{!activeOrgId ? (
					<div className="rounded-xl border bg-card shadow-sm p-12 text-center">
						<Mail className="size-10 mx-auto text-muted-foreground mb-3" />
						<p className="text-muted-foreground">
							No active organization selected. Please select an organization first.
						</p>
					</div>
				) : (
					<InvitationsTable data={invitations ?? []} isLoading={isLoading} />
				)}
			</div>

			{activeOrgId && (
				<InviteDialog
					open={inviteOpen}
					onOpenChange={setInviteOpen}
					organizationId={activeOrgId}
				/>
			)}
		</div>
	);
}
