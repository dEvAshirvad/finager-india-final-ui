"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
	useListContacts,
	useCreateContact,
	useUpdateContact,
	useDeleteContact,
	useDownloadContactImportTemplate,
	useImportContactsFromCsv,
	type Contact,
	type ContactAddress,
	type ContactType,
	type ContactImportError,
} from "@/lib/queries/contact";

const CSV_ACCEPT = ".csv,text/csv,application/vnd.ms-excel";
const MAX_CSV_SIZE_MB = 5;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatAddress(addr?: ContactAddress | null): string {
	if (!addr) return "—";
	const parts = [
		addr.line1,
		addr.line2,
		[addr.city, addr.state].filter(Boolean).join(", "),
		addr.pincode,
		addr.country,
	].filter(Boolean);
	return parts.length ? parts.join(", ") : "—";
}

// ──────────────────────────────────────────────
// Contact form dialog (create / edit)
// ──────────────────────────────────────────────

type ContactFormValues = {
	name: string;
	email: string;
	phone: string;
	line1: string;
	line2: string;
	city: string;
	state: string;
	pincode: string;
	country: string;
	gstin: string;
};

function ContactFormDialog({
	open,
	onOpenChange,
	editContact,
	type,
	entityLabel,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	editContact: Contact | null;
	type: "customer" | "vendor";
	entityLabel: string;
}) {
	const createMutation = useCreateContact();
	const updateMutation = useUpdateContact();
	const isEdit = !!editContact;

	const form = useForm<ContactFormValues>({
		defaultValues: {
			name: "",
			email: "",
			phone: "",
			line1: "",
			line2: "",
			city: "",
			state: "",
			pincode: "",
			country: "",
			gstin: "",
		},
	});

	useEffect(() => {
		if (editContact) {
			form.reset({
				name: editContact.name ?? "",
				email: editContact.email ?? "",
				phone: editContact.phone ?? "",
				line1: editContact.address?.line1 ?? "",
				line2: editContact.address?.line2 ?? "",
				city: editContact.address?.city ?? "",
				state: editContact.address?.state ?? "",
				pincode: editContact.address?.pincode ?? "",
				country: editContact.address?.country ?? "",
				gstin: editContact.gstin ?? "",
			});
		} else {
			form.reset({
				name: "",
				email: "",
				phone: "",
				line1: "",
				line2: "",
				city: "",
				state: "",
				pincode: "",
				country: "",
				gstin: "",
			});
		}
	}, [editContact, open]);

	async function onSubmit(values: ContactFormValues) {
		const name = values.name?.trim();
		if (!name) {
			form.setError("name", { message: "Name is required." });
			return;
		}

		const address =
			values.line1 || values.line2 || values.city || values.state || values.pincode || values.country
				? {
						line1: values.line1?.trim() || undefined,
						line2: values.line2?.trim() || undefined,
						city: values.city?.trim() || undefined,
						state: values.state?.trim() || undefined,
						pincode: values.pincode?.trim() || undefined,
						country: values.country?.trim() || undefined,
					}
				: undefined;

		try {
			if (isEdit && editContact) {
				await updateMutation.mutateAsync({
					id: editContact._id,
					body: {
						name,
						email: values.email?.trim() || undefined,
						phone: values.phone?.trim() || undefined,
						address,
						gstin: values.gstin?.trim() || undefined,
					},
				});
				toast.success(`${entityLabel} updated.`);
			} else {
				await createMutation.mutateAsync({
					type,
					name,
					email: values.email?.trim() || undefined,
					phone: values.phone?.trim() || undefined,
					address,
					gstin: values.gstin?.trim() || undefined,
				});
				toast.success(`${entityLabel} created.`);
			}
			onOpenChange(false);
		} catch {
			toast.error(isEdit ? `Failed to update ${entityLabel}.` : `Failed to create ${entityLabel}.`);
		}
	}

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEdit ? `Edit ${entityLabel}` : `Add ${entityLabel}`}</DialogTitle>
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
										<Input placeholder="Name" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input type="email" placeholder="email@example.com" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="phone"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Phone</FormLabel>
										<FormControl>
											<Input placeholder="Phone" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<div className="space-y-2">
							<FormLabel>Address (optional)</FormLabel>
							<div className="space-y-2">
								<FormField
									control={form.control}
									name="line1"
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<Input placeholder="Address line 1" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="line2"
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<Input placeholder="Address line 2" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div className="grid grid-cols-2 gap-2">
									<FormField
										control={form.control}
										name="city"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input placeholder="City" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="state"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input placeholder="State" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<FormField
										control={form.control}
										name="pincode"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input placeholder="Pincode" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="country"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input placeholder="Country" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</div>
						</div>
						<FormField
							control={form.control}
							name="gstin"
							render={({ field }) => (
								<FormItem>
									<FormLabel>GSTIN (optional)</FormLabel>
									<FormControl>
										<Input placeholder="GSTIN" {...field} />
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
								{isPending ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										{isEdit ? "Saving..." : "Creating..."}
									</>
								) : isEdit ? (
									"Save Changes"
								) : (
									`Add ${entityLabel}`
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

// ──────────────────────────────────────────────
// Import CSV dialog
// ──────────────────────────────────────────────

function ImportContactsDialog({
	open,
	onOpenChange,
	type,
	entityLabelPlural,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	type: ContactType;
	entityLabelPlural: string;
}) {
	const downloadTemplateMut = useDownloadContactImportTemplate();
	const importCsvMut = useImportContactsFromCsv();
	const [file, setFile] = useState<File | null>(null);
	const [importResult, setImportResult] = useState<{
		message: string;
		count: number;
		errors: ContactImportError[];
	} | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const f = e.target.files?.[0];
		if (!f) return;
		if (f.size > MAX_CSV_SIZE_MB * 1024 * 1024) {
			toast.error(`File must be under ${MAX_CSV_SIZE_MB}MB`);
			return;
		}
		setFile(f);
		setImportResult(null);
	}

	async function handleDownloadTemplate() {
		try {
			await downloadTemplateMut.mutateAsync(type);
			toast.success("Template downloaded.");
		} catch {
			toast.error("Failed to download template.");
		}
	}

	async function handleImport() {
		if (!file) {
			toast.error("Select a CSV file first.");
			return;
		}
		try {
			const res = await importCsvMut.mutateAsync({ file, type });
			setImportResult({
				message: res.message,
				count: res.count,
				errors: res.errors ?? [],
			});
			if (res.count > 0) toast.success(res.message);
			if (res.errors?.length) toast.warning(`${res.errors.length} row(s) had errors.`);
			if (res.count > 0 && (!res.errors || res.errors.length === 0)) {
				setFile(null);
				setImportResult(null);
				if (fileInputRef.current) fileInputRef.current.value = "";
				onOpenChange(false);
			}
		} catch (err: unknown) {
			let msg = "Import failed.";
			if (err && typeof err === "object" && "response" in err) {
				const res = (err as { response?: { data?: { errors?: ContactImportError[]; message?: string } } })
					.response;
				if (res?.data?.errors?.length) {
					setImportResult({
						message: res.data.message ?? msg,
						count: 0,
						errors: res.data.errors,
					});
				}
				if (res?.data?.message) msg = res.data.message;
			}
			toast.error(msg);
		}
	}

	function handleClose(open: boolean) {
		if (!open) {
			setFile(null);
			setImportResult(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
		onOpenChange(open);
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Import {entityLabelPlural} (CSV)</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Download the template, fill in name and optional email, phone, address, GSTIN. One row per{" "}
						{entityLabelPlural.slice(0, -1).toLowerCase()}. Max {MAX_CSV_SIZE_MB}MB.
					</p>

					<div className="flex flex-col gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-fit"
							disabled={downloadTemplateMut.isPending}
							onClick={handleDownloadTemplate}>
							{downloadTemplateMut.isPending ? (
								<>
									<Loader2 className="size-4 animate-spin" /> Downloading...
								</>
							) : (
								<>Download template</>
							)}
						</Button>

						<div className="flex items-center gap-2">
							<input
								ref={fileInputRef}
								type="file"
								accept={CSV_ACCEPT}
								className="hidden"
								onChange={handleFileChange}
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => fileInputRef.current?.click()}>
								{file ? file.name : "Choose CSV file"}
							</Button>
							{file && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-muted-foreground"
									onClick={() => {
										setFile(null);
										setImportResult(null);
										if (fileInputRef.current) fileInputRef.current.value = "";
									}}>
									Clear
								</Button>
							)}
						</div>
					</div>

					{importResult && (
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-lg p-3">
								<CheckCircle2 className="size-4 shrink-0" />
								{importResult.message}
							</div>
							{importResult.errors.length > 0 && (
								<div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 space-y-1">
									<div className="flex items-center gap-2 font-medium">
										<AlertCircle className="size-4 shrink-0" />
										Errors ({importResult.errors.length})
									</div>
									<ul className="list-disc pl-6 text-xs space-y-0.5 max-h-32 overflow-y-auto">
										{importResult.errors.map((err, i) => (
											<li key={i}>
												{err.row != null && `Row ${err.row}`}
												{` · ${err.message}`}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					)}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" type="button">
							Cancel
						</Button>
					</DialogClose>
					<Button
						onClick={handleImport}
						disabled={!file || importCsvMut.isPending}>
						{importCsvMut.isPending ? (
							<>
								<Loader2 className="size-4 animate-spin" /> Importing...
							</>
						) : (
							<>
								<Upload className="size-4" /> Import
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ──────────────────────────────────────────────
// Customers page
// ──────────────────────────────────────────────

export default function CustomersPage() {
	const [search, setSearch] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [editContact, setEditContact] = useState<Contact | null>(null);
	const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

	const { data, isLoading } = useListContacts({
		type: "customer",
		search: search.trim() || undefined,
		page: 1,
		limit: 100,
	});

	const deleteMutation = useDeleteContact();

	const contacts = Array.isArray(data?.data) ? data.data : [];
	const pagination = data?.pagination;

	function openCreate() {
		setEditContact(null);
		setDialogOpen(true);
	}

	function openEdit(c: Contact) {
		setEditContact(c);
		setDialogOpen(true);
	}

	async function handleDelete() {
		if (!deleteContact) return;
		try {
			await deleteMutation.mutateAsync(deleteContact._id);
			toast.success("Customer deleted.");
			setDeleteContact(null);
		} catch {
			toast.error("Failed to delete customer.");
		}
	}

	return (
		<div className="flex flex-col h-full">
			<DashboardPageHeader title="Customers" />
			<div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
				<div className="flex items-center gap-3 py-4">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							placeholder="Search customers..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Button variant="outline" size="sm" className="h-9" onClick={() => setImportOpen(true)}>
						<Upload className="size-4" />
						Import
					</Button>
					<Button onClick={openCreate}>
						<Plus className="size-4" />
						Add customer
					</Button>
				</div>

				<div className="flex-1 rounded-lg border bg-card overflow-hidden min-h-0 flex flex-col">
					{isLoading ? (
						<div className="p-6 space-y-3">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : contacts.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<p className="text-sm text-muted-foreground">
								{search.trim() ? "No customers match your search." : "No customers yet."}
							</p>
							{!search.trim() && (
								<Button variant="outline" className="mt-4" onClick={openCreate}>
									<Plus className="size-4" />
									Add customer
								</Button>
							)}
						</div>
					) : (
						<div className="overflow-auto flex-1">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead className="font-medium text-xs">Name</TableHead>
										<TableHead className="font-medium text-xs">Email</TableHead>
										<TableHead className="font-medium text-xs">Phone</TableHead>
										<TableHead className="font-medium text-xs">Address</TableHead>
										<TableHead className="font-medium text-xs">GSTIN</TableHead>
										<TableHead className="font-medium text-xs w-[100px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{contacts.map((c) => (
										<TableRow key={c._id}>
											<TableCell className="font-medium">{c.name}</TableCell>
											<TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
											<TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
											<TableCell className="text-muted-foreground max-w-[200px] truncate">
												{formatAddress(c.address)}
											</TableCell>
											<TableCell className="text-muted-foreground font-mono text-xs">
												{c.gstin ?? "—"}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														className="size-8"
														onClick={() => openEdit(c)}>
														<Pencil className="size-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="size-8 text-destructive hover:text-destructive"
														onClick={() => setDeleteContact(c)}>
														<Trash2 className="size-3.5" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
				{pagination && pagination.totalPages > 1 && (
					<p className="text-xs text-muted-foreground mt-2">
						Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
					</p>
				)}
			</div>

			<ContactFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				editContact={editContact}
				type="customer"
				entityLabel="Customer"
			/>

			<ImportContactsDialog
				open={importOpen}
				onOpenChange={setImportOpen}
				type="customer"
				entityLabelPlural="Customers"
			/>

			<AlertDialog open={!!deleteContact} onOpenChange={(open) => !open && setDeleteContact(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete customer?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete {deleteContact?.name}. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteMutation.isPending}>
							{deleteMutation.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								"Delete"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
