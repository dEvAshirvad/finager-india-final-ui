"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
	Building2,
	ChevronRight,
	Upload,
	RefreshCw,
	Copy,
	Pencil,
	PlusIcon,
	UserPlus,
} from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
	useGetFullOrganization,
	useUpdateOrganization,
	type Organization,
} from "@/lib/queries/organization";
import { useGetSession } from "@/lib/queries/auth";
import Link from "next/link";

const INDUSTRY_OPTIONS = [
	{ value: "serviceBased", label: "Service Based" },
	{ value: "retail", label: "Retail" },
	{ value: "manufacturing", label: "Manufacturing" },
] as const;

function getIndustryLabel(value?: string) {
	return INDUSTRY_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "—";
}

function formatFinancialYear(fy?: string) {
	if (!fy) return "—";
	return `FY ${fy}`;
}

// ──────────────────────────────────────────────
// Setting row component
// ──────────────────────────────────────────────

function SettingRow({
	label,
	description,
	value,
	onEdit,
	badge,
}: {
	label: string;
	description: string;
	value: React.ReactNode;
	onEdit?: () => void;
	badge?: string;
}) {
	return (
		<div className="flex items-center justify-between gap-8 py-5 px-6">
			<div className="flex-1 min-w-0 space-y-0.5">
				<div className="flex items-center gap-2">
					<p className="font-medium text-sm">{label}</p>
					{badge && (
						<Badge variant="secondary" className="text-[10px]">
							{badge}
						</Badge>
					)}
				</div>
				<p className="text-xs text-muted-foreground">{description}</p>
			</div>
			<div className="flex items-center gap-4 text-right shrink-0">
				<div className="text-sm max-w-[300px] text-right">{value}</div>
				{onEdit && (
					<button
						type="button"
						onClick={onEdit}
						className="flex items-center gap-1 text-xs font-medium text-primary hover:underline whitespace-nowrap cursor-pointer">
						Edit <ChevronRight className="size-3" />
					</button>
				)}
			</div>
		</div>
	);
}

function SettingRowSkeleton() {
	return (
		<div className="flex items-start justify-between gap-8 py-5 px-6">
			<div className="flex-1 space-y-2">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-3 w-56" />
			</div>
			<Skeleton className="h-4 w-40" />
		</div>
	);
}

// ──────────────────────────────────────────────
// Edit dialogs
// ──────────────────────────────────────────────

const nameSchema = z.object({
	name: z.string().min(2, "Minimum 2 characters"),
});
const slugSchema = z.object({
	slug: z
		.string()
		.min(2)
		.regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
});
const gstinSchema = z.object({
	gstin: z
		.string()
		.regex(
			/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d{1}[A-Z]{1}[A-Z\d]{1}$/,
			"Invalid GSTIN format",
		),
});
const industrySchema = z.object({ industry: z.string().min(1) });
const financialYearSchema = z.object({
	financialYearStart: z
		.string()
		.regex(/^\d{4}-\d{4}$/, "Must be in YYYY-YYYY format"),
});

type EditField =
	| "name"
	| "slug"
	| "gstin"
	| "industry"
	| "financialYearStart"
	| null;

function EditNameDialog({
	open,
	onOpenChange,
	org,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	org: Organization;
}) {
	const { mutateAsync, isPending } = useUpdateOrganization();
	const form = useForm({
		resolver: zodResolver(nameSchema as any),
		defaultValues: { name: org.name },
	});

	async function onSubmit(values: z.infer<typeof nameSchema>) {
		try {
			await mutateAsync({
				data: { name: values.name },
				organizationId: org.id,
			});
			toast.success("Organization name updated");
			onOpenChange(false);
		} catch {
			toast.error("Failed to update name");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Organization Name</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
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
							<Button type="submit" disabled={isPending}>
								{isPending ? "Saving..." : "Save"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function EditSlugDialog({
	open,
	onOpenChange,
	org,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	org: Organization;
}) {
	const { mutateAsync, isPending } = useUpdateOrganization();
	const form = useForm({
		resolver: zodResolver(slugSchema as any),
		defaultValues: { slug: org.slug },
	});

	async function onSubmit(values: z.infer<typeof slugSchema>) {
		try {
			await mutateAsync({
				data: { slug: values.slug },
				organizationId: org.id,
			});
			toast.success("Slug updated");
			onOpenChange(false);
		} catch {
			toast.error("Failed to update slug");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Organization Slug</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="slug"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Slug</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
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
							<Button type="submit" disabled={isPending}>
								{isPending ? "Saving..." : "Save"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function EditGstinDialog({
	open,
	onOpenChange,
	org,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	org: Organization;
}) {
	const { mutateAsync, isPending } = useUpdateOrganization();
	const form = useForm({
		resolver: zodResolver(gstinSchema as any),
		defaultValues: { gstin: org.gstin ?? "" },
	});

	async function onSubmit(values: z.infer<typeof gstinSchema>) {
		try {
			const pan = values.gstin.substring(2, 12);
			await mutateAsync({
				data: { gstin: values.gstin, pan },
				organizationId: org.id,
			});
			toast.success("GSTIN updated");
			onOpenChange(false);
		} catch {
			toast.error("Failed to update GSTIN");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit GSTIN</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="gstin"
							render={({ field }) => (
								<FormItem>
									<FormLabel>GSTIN</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) =>
												field.onChange(e.target.value.toUpperCase())
											}
											maxLength={15}
											placeholder="27AAACR5055K1Z7"
										/>
									</FormControl>
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
							<Button type="submit" disabled={isPending}>
								{isPending ? "Saving..." : "Save"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function EditIndustryDialog({
	open,
	onOpenChange,
	org,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	org: Organization;
}) {
	const { mutateAsync, isPending } = useUpdateOrganization();
	const form = useForm({
		resolver: zodResolver(industrySchema as any),
		defaultValues: { industry: org.industry ?? "retail" },
	});

	async function onSubmit(values: z.infer<typeof industrySchema>) {
		try {
			await mutateAsync({
				data: { industry: values.industry },
				organizationId: org.id,
			});
			toast.success("Industry updated");
			onOpenChange(false);
		} catch {
			toast.error("Failed to update industry");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Industry</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="industry"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Industry</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{INDUSTRY_OPTIONS.map((opt) => (
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
							<Button type="submit" disabled={isPending}>
								{isPending ? "Saving..." : "Save"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function EditFinancialYearDialog({
	open,
	onOpenChange,
	org,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	org: Organization;
}) {
	const { mutateAsync, isPending } = useUpdateOrganization();
	const form = useForm({
		resolver: zodResolver(financialYearSchema as any),
		defaultValues: { financialYearStart: org.financialYearStart ?? "" },
	});

	async function onSubmit(values: z.infer<typeof financialYearSchema>) {
		try {
			await mutateAsync({
				data: { financialYearStart: values.financialYearStart },
				organizationId: org.id,
			});
			toast.success("Financial year updated");
			onOpenChange(false);
		} catch {
			toast.error("Failed to update financial year");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Financial Year</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="financialYearStart"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Financial Year</FormLabel>
									<FormControl>
										<Input {...field} placeholder="2025-2026" />
									</FormControl>
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
							<Button type="submit" disabled={isPending}>
								{isPending ? "Saving..." : "Save"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────

export default function OrganisationPage() {
	const { data: org, isLoading, refetch } = useGetFullOrganization();
	const { data: sessionData } = useGetSession();
	const [editField, setEditField] = useState<EditField>(null);

	const activeOrgId = sessionData?.session?.activeOrganizationId;

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success("Copied to clipboard");
	}

	return (
		<div className="min-h-full">
			<DashboardPageHeader title="organisation" />

			<div className="p-6">
				{/* Section header */}
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-lg font-semibold">Organization Settings</h2>
						<p className="text-sm text-muted-foreground">
							View and manage your organization details.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Link href="/organisation/create">
							<Button variant="outline" size="sm">
								<PlusIcon className="size-3.5" />
								Add Organisation
							</Button>
						</Link>
						<Link href="/organisation/invite">
							<Button variant="outline" size="sm">
								<UserPlus className="size-3.5" />
								Invite User
							</Button>
						</Link>
						<Button
							variant="outline"
							size="sm"
							onClick={() => refetch()}
							disabled={isLoading}>
							<RefreshCw className="size-3.5" />
							Refresh
						</Button>
					</div>
				</div>

				{isLoading ? (
					<div className="rounded-xl border bg-card shadow-sm divide-y">
						{Array.from({ length: 8 }).map((_, i) => (
							<SettingRowSkeleton key={i} />
						))}
					</div>
				) : !org || !activeOrgId ? (
					<div className="rounded-xl border bg-card shadow-sm p-12 text-center">
						<Building2 className="size-10 mx-auto text-muted-foreground mb-3" />
						<p className="text-muted-foreground">
							No active organization selected.
						</p>
					</div>
				) : (
					<>
						<div className="rounded-xl border bg-card shadow-sm divide-y">
							{/* Logo */}
							{/* <div className="flex items-center justify-between py-5 px-6">
								<div className="space-y-0.5">
									<p className="font-medium text-sm">Organization Logo</p>
									<p className="text-xs text-muted-foreground">
										Min 400x400px, PNG or JPEG formats.
									</p>
								</div>
								<div className="flex items-center gap-4">
									<div className="size-12 rounded-lg bg-accent flex items-center justify-center border">
										{org.logo ? (
											<img
												src={org.logo}
												alt={org.name}
												className="size-12 rounded-lg object-cover"
											/>
										) : (
											<Building2 className="size-5 text-muted-foreground" />
										)}
									</div>
									<Button variant="outline" size="sm">
										<Upload className="size-3.5" />
										Upload
									</Button>
								</div>
							</div>

							<Separator /> */}

							{/* Name */}
							<SettingRow
								label="Organization Name"
								description="The official name of your organization."
								value={org.name}
								onEdit={() => setEditField("name")}
							/>

							{/* Slug */}
							<SettingRow
								label="Slug"
								description="Used in URLs to identify your organization."
								value={
									<span className="font-mono text-xs bg-accent px-2 py-1 rounded">
										{org.slug}
									</span>
								}
								onEdit={() => setEditField("slug")}
							/>

							{/* Org Code */}
							<SettingRow
								label="Organization Code"
								description="Unique identifier code for your organization."
								value={
									<div className="flex items-center gap-2">
										<span className="font-mono">{org.orgCode ?? "—"}</span>
										{org.orgCode && (
											<button
												type="button"
												onClick={() => copyToClipboard(org.orgCode!)}
												className="text-muted-foreground hover:text-foreground cursor-pointer">
												<Copy className="size-3.5" />
											</button>
										)}
									</div>
								}
								badge="Read Only"
							/>

							{/* GSTIN */}
							<SettingRow
								label="GSTIN"
								description="Goods and Services Tax Identification Number."
								value={<span className="font-mono">{org.gstin ?? "—"}</span>}
								onEdit={() => setEditField("gstin")}
							/>

							{/* PAN */}
							<SettingRow
								label="PAN"
								description="Permanent Account Number, auto-derived from GSTIN."
								value={<span className="font-mono">{org.pan ?? "—"}</span>}
								badge="Auto Generated"
							/>

							{/* Industry */}
							<SettingRow
								label="Industry"
								description="The industry your organization operates in."
								value={getIndustryLabel(org.industry)}
								onEdit={() => setEditField("industry")}
							/>

							{/* Financial Year */}
							<SettingRow
								label="Financial Year"
								description="The fiscal year period for accounting."
								value={formatFinancialYear(org.financialYearStart)}
								onEdit={() => setEditField("financialYearStart")}
							/>

							{/* Roles */}
							{/* <SettingRow
								label="Assigned CA"
								description="The Chartered Accountant assigned to this organization."
								value={org.assignedRoleCA ?? "—"}
								badge="Read Only"
							/>

							<SettingRow
								label="Assigned Owner"
								description="The business owner assigned to this organization."
								value={org.assignedRoleOwner ?? "—"}
								badge="Read Only"
							/> */}

							{/* Created */}
							<SettingRow
								label="Created On"
								description="When this organization was registered."
								value={new Date(org.createdAt).toLocaleDateString("en-IN", {
									day: "numeric",
									month: "long",
									year: "numeric",
								})}
								badge="Read Only"
							/>
						</div>

						{/* Edit dialogs */}
						{editField === "name" && (
							<EditNameDialog
								open
								onOpenChange={(v) => !v && setEditField(null)}
								org={org}
							/>
						)}
						{editField === "slug" && (
							<EditSlugDialog
								open
								onOpenChange={(v) => !v && setEditField(null)}
								org={org}
							/>
						)}
						{editField === "gstin" && (
							<EditGstinDialog
								open
								onOpenChange={(v) => !v && setEditField(null)}
								org={org}
							/>
						)}
						{editField === "industry" && (
							<EditIndustryDialog
								open
								onOpenChange={(v) => !v && setEditField(null)}
								org={org}
							/>
						)}
						{editField === "financialYearStart" && (
							<EditFinancialYearDialog
								open
								onOpenChange={(v) => !v && setEditField(null)}
								org={org}
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
}
