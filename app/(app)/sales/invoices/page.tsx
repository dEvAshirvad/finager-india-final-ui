"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import {
	Plus,
	Search,
	Loader2,
	Upload,
	Download,
	Pencil,
	Trash2,
	Send,
	Banknote,
	AlertCircle,
	CheckCircle2,
} from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetFooter,
	SheetClose,
} from "@/components/ui/sheet";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	useListInvoices,
	useGetInvoice,
	useCreateInvoice,
	useUpdateInvoice,
	usePostInvoice,
	useRecordPayment,
	useDeleteInvoice,
	useDownloadInvoiceTemplate,
	useImportInvoicesFromCsv,
	exportInvoicesJson,
	exportInvoicesCsv,
	type Invoice,
	type CreateInvoiceBody,
	type PaymentMode,
	type InvoiceStatus,
	type InvoiceImportError,
} from "@/lib/queries/invoices";
import { useListContacts } from "@/lib/queries/contact";
import { useListProducts } from "@/lib/queries/products";

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
	{ value: "CREDIT", label: "Credit" },
	{ value: "CASH", label: "Cash" },
	{ value: "ONLINE", label: "Online" },
];

const CSV_ACCEPT = ".csv,text/csv,application/vnd.ms-excel";
const MAX_CSV_SIZE_MB = 5;

function formatDate(iso?: string) {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatCurrency(n: number) {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
	}).format(n);
}

const STATUS_CONFIG: Record<
	InvoiceStatus,
	{ label: string; className: string }
> = {
	DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
	POSTED: { label: "Posted", className: "bg-blue-100 text-blue-700" },
	PAID: { label: "Paid", className: "bg-green-100 text-green-700" },
	PARTIAL: { label: "Partial", className: "bg-amber-100 text-amber-700" },
	CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

// ──────────────────────────────────────────────
// Invoice form (create / edit) — minimal fields, server computes totals
// ──────────────────────────────────────────────

type ItemRow = {
	productId: string;
	qty: string;
	rate: string;
	discount: string;
	gstRate: string;
};

type InvoiceFormValues = {
	reference: string;
	date: string;
	contactId: string;
	paymentMode: PaymentMode;
	placeOfSupply: string;
	paymentDue: string;
	items: ItemRow[];
	// Payment at create (CASH/ONLINE)
	payAmount: string;
	payDate: string;
	payReference: string;
	payNotes: string;
};

function InvoiceFormSheet({
	open,
	onOpenChange,
	editInvoice,
	customers,
	products,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	editInvoice: Invoice | null;
	customers: { _id: string; name: string }[];
	products: { _id: string; name: string; sellingPrice?: number }[];
}) {
	const createMut = useCreateInvoice();
	const updateMut = useUpdateInvoice();
	const isEdit = !!editInvoice;

	const form = useForm<InvoiceFormValues>({
		defaultValues: {
			reference: "",
			date: new Date().toISOString().slice(0, 10),
			contactId: "",
			paymentMode: "CREDIT",
			placeOfSupply: "",
			paymentDue: "",
			items: [
				{ productId: "", qty: "1", rate: "", discount: "0", gstRate: "12" },
			],
			payAmount: "",
			payDate: new Date().toISOString().slice(0, 10),
			payReference: "",
			payNotes: "",
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "items",
	});

	useEffect(() => {
		if (editInvoice) {
			form.reset({
				reference: editInvoice.reference,
				date: editInvoice.date.slice(0, 10),
				contactId: editInvoice.contactId,
				paymentMode: (editInvoice.paymentMode as PaymentMode) ?? "CREDIT",
				placeOfSupply: editInvoice.placeOfSupply ?? "",
				paymentDue: editInvoice.paymentDue?.slice(0, 10) ?? "",
				items:
					editInvoice.items?.length > 0
						? editInvoice.items.map((i) => ({
								productId: i.productId ?? "",
								qty: String(i.qty),
								rate: String(i.rate),
								discount: String(i.discount ?? 0),
								gstRate: String(i.gstRate ?? 12),
							}))
						: [
								{
									productId: "",
									qty: "1",
									rate: "",
									discount: "0",
									gstRate: "12",
								},
							],
				payAmount: "",
				payDate: new Date().toISOString().slice(0, 10),
				payReference: "",
				payNotes: "",
			});
		} else {
			form.reset({
				reference: "",
				date: new Date().toISOString().slice(0, 10),
				contactId: "",
				paymentMode: "CREDIT",
				placeOfSupply: "",
				paymentDue: "",
				items: [
					{ productId: "", qty: "1", rate: "", discount: "0", gstRate: "12" },
				],
				payAmount: "",
				payDate: new Date().toISOString().slice(0, 10),
				payReference: "",
				payNotes: "",
			});
		}
	}, [editInvoice, open]);

	async function onSubmit(values: InvoiceFormValues) {
		const ref = values.reference?.trim();
		if (!ref) {
			form.setError("reference", { message: "Required" });
			return;
		}
		if (!values.contactId?.trim()) {
			form.setError("contactId", { message: "Select a customer" });
			return;
		}
		if (!values.placeOfSupply?.trim()) {
			form.setError("placeOfSupply", { message: "Required for GST" });
			return;
		}
		const items = values.items
			.map((r) => {
				const qty = Number(r.qty);
				const rate = Number(r.rate);
				if (Number.isNaN(qty) || qty <= 0 || Number.isNaN(rate) || rate < 0)
					return null;
				return {
					productId: r.productId?.trim() || undefined,
					qty,
					rate,
					discount: r.discount ? Number(r.discount) : undefined,
					gstRate: r.gstRate ? Number(r.gstRate) : undefined,
				};
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);
		if (items.length === 0) {
			toast.error("Add at least one line with qty and rate.");
			return;
		}

		if (isEdit && editInvoice) {
			try {
				await updateMut.mutateAsync({
					id: editInvoice._id,
					body: {
						reference: ref,
						date: values.date,
						contactId: values.contactId,
						paymentMode: values.paymentMode,
						placeOfSupply: values.placeOfSupply,
						paymentDue: values.paymentDue || undefined,
						items,
					},
				});
				toast.success("Invoice updated.");
				onOpenChange(false);
			} catch {
				toast.error("Failed to update invoice.");
			}
			return;
		}

		const body: CreateInvoiceBody = {
			reference: ref,
			date: new Date(values.date).toISOString(),
			contactId: values.contactId,
			paymentMode: values.paymentMode,
			placeOfSupply: values.placeOfSupply,
			paymentDue: values.paymentDue
				? new Date(values.paymentDue).toISOString()
				: undefined,
			items,
		};

		const isCashOrOnline =
			values.paymentMode === "CASH" || values.paymentMode === "ONLINE";
		const payAmount = Number(values.payAmount);
		if (
			isCashOrOnline &&
			values.payAmount.trim() &&
			!Number.isNaN(payAmount) &&
			payAmount > 0
		) {
			body.payment = {
				amount: payAmount,
				date: new Date(values.payDate).toISOString(),
				reference: values.payReference.trim() || `PAY-${ref}`,
				notes: values.payNotes.trim() || undefined,
			};
		}

		try {
			await createMut.mutateAsync(body);
			toast.success("Invoice created.");
			onOpenChange(false);
		} catch (e: unknown) {
			const err = e as {
				response?: { status?: number; data?: { message?: string } };
			};
			if (err?.response?.status === 409) {
				toast.error("Duplicate reference. Use a unique reference.");
			} else {
				toast.error(
					err?.response?.data?.message ?? "Failed to create invoice.",
				);
			}
		}
	}

	const isPending = createMut.isPending || updateMut.isPending;
	const paymentMode = form.watch("paymentMode");
	const showPaymentAtCreate =
		!isEdit && (paymentMode === "CASH" || paymentMode === "ONLINE");

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex flex-col h-full w-full sm:max-w-xl overflow-hidden">
				<SheetHeader>
					<SheetTitle>{isEdit ? "Edit invoice" : "New invoice"}</SheetTitle>
				</SheetHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex flex-col flex-1 min-h-0 overflow-hidden">
						<div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-4">
							<FormField
								control={form.control}
								name="reference"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Reference</FormLabel>
										<FormControl>
											<Input
												placeholder="INV-0001"
												{...field}
												disabled={isEdit}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="date"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Date</FormLabel>
											<FormControl>
												<Input type="date" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="paymentMode"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Payment mode</FormLabel>
											<Select
												value={field.value}
												onValueChange={field.onChange}
												disabled={isEdit}>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{PAYMENT_MODES.map((m) => (
														<SelectItem key={m.value} value={m.value}>
															{m.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={form.control}
								name="contactId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Customer</FormLabel>
										<Select
											value={field.value}
											onValueChange={field.onChange}
											disabled={isEdit}>
											<SelectTrigger>
												<SelectValue placeholder="Select customer" />
											</SelectTrigger>
											<SelectContent>
												{customers.map((c) => (
													<SelectItem key={c._id} value={c._id}>
														{c.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="placeOfSupply"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Place of supply</FormLabel>
										<FormControl>
											<Input placeholder="e.g. 21-Odisha" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="paymentDue"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Payment due (optional)</FormLabel>
										<FormControl>
											<Input type="date" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div>
								<div className="flex items-center justify-between mb-2">
									<FormLabel>Items</FormLabel>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() =>
											append({
												productId: "",
												qty: "1",
												rate: "",
												discount: "0",
												gstRate: "12",
											})
										}>
										<Plus className="size-3.5" /> Add line
									</Button>
								</div>
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead className="text-xs">Product</TableHead>
												<TableHead className="text-xs w-20">Qty</TableHead>
												<TableHead className="text-xs w-24">Rate</TableHead>
												<TableHead className="text-xs w-20">GST%</TableHead>
												<TableHead className="w-8" />
											</TableRow>
										</TableHeader>
										<TableBody>
											{fields.map((field, i) => (
												<TableRow key={field.id}>
													<TableCell className="p-2">
														<Select
															value={
																form.watch(`items.${i}.productId`) || "__none__"
															}
															onValueChange={(v) =>
																form.setValue(
																	`items.${i}.productId`,
																	v === "__none__" ? "" : v,
																)
															}
															disabled={isEdit}>
															<SelectTrigger className="h-8 text-xs">
																<SelectValue placeholder="Optional" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="__none__">—</SelectItem>
																{products.map((p) => (
																	<SelectItem key={p._id} value={p._id}>
																		{p.name}
																		{p.sellingPrice != null &&
																			` — ₹${p.sellingPrice}`}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</TableCell>
													<TableCell className="p-2">
														<Input
															type="number"
															min={0}
															className="h-8 text-xs"
															{...form.register(`items.${i}.qty`)}
														/>
													</TableCell>
													<TableCell className="p-2">
														<Input
															type="number"
															step="0.01"
															min={0}
															className="h-8 text-xs"
															{...form.register(`items.${i}.rate`)}
														/>
													</TableCell>
													<TableCell className="p-2">
														<Input
															type="number"
															min={0}
															max={28}
															className="h-8 text-xs"
															{...form.register(`items.${i}.gstRate`)}
														/>
													</TableCell>
													<TableCell className="p-2">
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="size-8"
															onClick={() => remove(i)}
															disabled={fields.length <= 1 || isEdit}>
															<Trash2 className="size-3.5" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>

							{showPaymentAtCreate && (
								<div className="rounded-lg border p-3 space-y-2">
									<FormLabel>Payment at create (optional)</FormLabel>
									<div className="grid grid-cols-2 gap-2">
										<FormField
											control={form.control}
											name="payAmount"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input
															type="number"
															step="0.01"
															placeholder="Amount"
															{...field}
														/>
													</FormControl>
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="payDate"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input type="date" {...field} />
													</FormControl>
												</FormItem>
											)}
										/>
									</div>
									<FormField
										control={form.control}
										name="payReference"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input placeholder="Payment reference" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="payNotes"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input placeholder="Notes" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
								</div>
							)}
						</div>
						<SheetFooter className="shrink-0 pt-4 border-t mt-4">
							<SheetClose asChild>
								<Button variant="outline" type="button">
									Cancel
								</Button>
							</SheetClose>
							<Button type="submit" disabled={isPending}>
								{isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : isEdit ? (
									"Save"
								) : (
									"Create"
								)}
							</Button>
						</SheetFooter>
					</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
}

// ──────────────────────────────────────────────
// Record payment sheet
// ──────────────────────────────────────────────

function PaySheet({
	open,
	onOpenChange,
	invoice,
	onSuccess,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	invoice: Invoice | null;
	onSuccess: () => void;
}) {
	const payMut = useRecordPayment();
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [reference, setReference] = useState("");
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (open && invoice) {
			setAmount("");
			setDate(new Date().toISOString().slice(0, 10));
			setReference("");
			setNotes("");
		}
	}, [open, invoice]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!invoice) return;
		const num = Number(amount);
		if (Number.isNaN(num) || num <= 0) {
			toast.error("Enter a valid amount.");
			return;
		}
		try {
			await payMut.mutateAsync({
				id: invoice._id,
				body: {
					amount: num,
					date: new Date(date).toISOString(),
					reference: reference.trim() || `PAY-${invoice.reference}`,
					notes: notes.trim() || undefined,
				},
			});
			toast.success("Payment recorded.");
			onOpenChange(false);
			onSuccess();
		} catch {
			toast.error("Failed to record payment.");
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="sm:max-w-md flex flex-col">
				<SheetHeader>
					<SheetTitle>Record payment</SheetTitle>
				</SheetHeader>
				{invoice && (
					<form
						onSubmit={handleSubmit}
						className="flex flex-col flex-1 min-h-0">
						<div className="flex-1 space-y-4 overflow-y-auto px-4">
							<p className="text-sm text-muted-foreground">
								{invoice.reference} — {formatCurrency(invoice.totalAmount)}
							</p>
							<div>
								<label className="text-sm font-medium">Amount (₹)</label>
								<Input
									type="number"
									step="0.01"
									min={0}
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									className="mt-1"
									placeholder="0"
								/>
							</div>
							<div>
								<label className="text-sm font-medium">Date</label>
								<Input
									type="date"
									value={date}
									onChange={(e) => setDate(e.target.value)}
									className="mt-1"
								/>
							</div>
							<div>
								<label className="text-sm font-medium">Reference</label>
								<Input
									value={reference}
									onChange={(e) => setReference(e.target.value)}
									className="mt-1"
									placeholder="PAY-001"
								/>
							</div>
							<div>
								<label className="text-sm font-medium">Notes</label>
								<Input
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									className="mt-1"
									placeholder="Optional"
								/>
							</div>
						</div>
						<SheetFooter className="mt-4">
							<SheetClose asChild>
								<Button variant="outline" type="button">
									Cancel
								</Button>
							</SheetClose>
							<Button type="submit" disabled={payMut.isPending}>
								{payMut.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									"Record"
								)}
							</Button>
						</SheetFooter>
					</form>
				)}
			</SheetContent>
		</Sheet>
	);
}

// ──────────────────────────────────────────────
// Import sheet
// ──────────────────────────────────────────────

function ImportSheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const downloadMut = useDownloadInvoiceTemplate();
	const importMut = useImportInvoicesFromCsv();
	const [file, setFile] = useState<File | null>(null);
	const [result, setResult] = useState<{
		message?: string;
		created?: number;
		updated?: number;
		errors: InvoiceImportError[];
	} | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	function handleClose(v: boolean) {
		if (!v) {
			setFile(null);
			setResult(null);
			if (fileRef.current) fileRef.current.value = "";
		}
		onOpenChange(v);
	}

	async function handleImport() {
		if (!file) {
			toast.error("Select a CSV file.");
			return;
		}
		if (file.size > MAX_CSV_SIZE_MB * 1024 * 1024) {
			toast.error(`File must be under ${MAX_CSV_SIZE_MB}MB`);
			return;
		}
		try {
			const res = await importMut.mutateAsync(file);
			setResult({
				message: res.message,
				created: res.created,
				updated: res.updated,
				errors: res.errors ?? [],
			});
			if (res.message) toast.success(res.message);
			if (res.errors?.length)
				toast.warning(`${res.errors.length} row(s) had errors.`);
			if ((res.created ?? 0) + (res.updated ?? 0) > 0 && !res.errors?.length) {
				handleClose(false);
			}
		} catch {
			toast.error("Import failed.");
		}
	}

	return (
		<Sheet open={open} onOpenChange={handleClose}>
			<SheetContent
				side="right"
				className="flex flex-col h-full w-full sm:max-w-lg overflow-hidden">
				<SheetHeader>
					<SheetTitle>Import invoices (CSV)</SheetTitle>
				</SheetHeader>
				<div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-4">
					<p className="text-sm text-muted-foreground">
						Use the template. Each row = one invoice (DRAFT). Max{" "}
						{MAX_CSV_SIZE_MB}MB.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={downloadMut.isPending}
						onClick={() =>
							downloadMut
								.mutateAsync()
								.then(() => toast.success("Downloaded."))
								.catch(() => toast.error("Failed."))
						}>
						{downloadMut.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							"Download template"
						)}
					</Button>
					<div className="flex items-center gap-2">
						<input
							ref={fileRef}
							type="file"
							accept={CSV_ACCEPT}
							className="hidden"
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) setFile(f);
								setResult(null);
							}}
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => fileRef.current?.click()}>
							{file ? file.name : "Choose CSV"}
						</Button>
						{file && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => {
									setFile(null);
									setResult(null);
									if (fileRef.current) fileRef.current.value = "";
								}}>
								Clear
							</Button>
						)}
					</div>
					{result && (
						<div className="space-y-2">
							{(result.message ?? result.created != null) && (
								<div className="text-sm text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-lg p-3 flex items-center gap-2">
									<CheckCircle2 className="size-4" />
									{result.message ??
										`${result.created ?? 0} created, ${result.updated ?? 0} updated`}
								</div>
							)}
							{result.errors.length > 0 && (
								<div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 space-y-1">
									<div className="flex items-center gap-2 font-medium">
										<AlertCircle className="size-4" />
										Errors ({result.errors.length})
									</div>
									<ul className="list-disc pl-6 text-xs max-h-32 overflow-y-auto">
										{result.errors.map((err, i) => (
											<li key={i}>
												{err.row != null && `Row ${err.row}`}
												{err.field && ` · ${err.field}`}
												{` · ${err.reason ?? ""}`}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					)}
				</div>
				<SheetFooter className="shrink-0 pt-4 border-t mt-4">
					<SheetClose asChild>
						<Button variant="outline">Cancel</Button>
					</SheetClose>
					<Button
						onClick={handleImport}
						disabled={!file || importMut.isPending}>
						{importMut.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Upload className="size-4" />
						)}
						Import
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────

export default function InvoicesPage() {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [page, setPage] = useState(1);
	const limit = 20;
	const [formOpen, setFormOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
	const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
	const [postInvoice, setPostInvoice] = useState<Invoice | null>(null);
	const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null);

	const params = useMemo(
		() => ({
			page,
			limit,
			status:
				statusFilter === "all" ? undefined : (statusFilter as InvoiceStatus),
		}),
		[page, statusFilter, limit],
	);
	const { data, isLoading } = useListInvoices(params);
	const { data: customersData } = useListContacts({
		type: "customer",
		limit: 500,
	});
	const { data: productsData } = useListProducts({
		page: 1,
		limit: 500,
	});

	const invoices = data?.data ?? [];
	const pagination = data?.pagination;
	const customers = useMemo(() => {
		const d = customersData as
			| { data?: { _id: string; name: string }[] }
			| undefined;
		return d?.data ?? [];
	}, [customersData]);
	const products = useMemo(() => {
		const d = productsData;
		if (!d?.data) return [];
		return d.data;
	}, [productsData]);

	const postMut = usePostInvoice();
	const deleteMut = useDeleteInvoice();

	const filtered = useMemo(() => {
		if (!search.trim()) return invoices;
		const q = search.toLowerCase();
		return invoices.filter(
			(inv) =>
				inv.reference?.toLowerCase().includes(q) ||
				inv.contactId?.toLowerCase().includes(q),
		);
	}, [invoices, search]);

	function openCreate() {
		setEditInvoice(null);
		setFormOpen(true);
	}

	function openEdit(inv: Invoice) {
		setEditInvoice(inv);
		setFormOpen(true);
	}

	async function handlePost() {
		if (!postInvoice) return;
		try {
			await postMut.mutateAsync({ id: postInvoice._id });
			toast.success("Invoice posted.");
			setPostInvoice(null);
		} catch {
			toast.error("Failed to post invoice.");
		}
	}

	async function handleDelete() {
		if (!deleteInvoice) return;
		try {
			await deleteMut.mutateAsync(deleteInvoice._id);
			toast.success(
				deleteInvoice.status === "DRAFT"
					? "Invoice deleted."
					: "Invoice cancelled.",
			);
			setDeleteInvoice(null);
		} catch {
			toast.error("Failed to delete/cancel invoice.");
		}
	}

	async function handleExportJson() {
		try {
			const blob = await exportInvoicesJson({ ...params, limit: 10000 });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "invoices-export.json";
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Export downloaded.");
		} catch {
			toast.error("Failed to export.");
		}
	}

	async function handleExportCsv() {
		try {
			const blob = await exportInvoicesCsv({ ...params, limit: 10000 });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "invoices-export.csv";
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Export downloaded.");
		} catch {
			toast.error("Failed to export.");
		}
	}

	const contactMap = useMemo(() => {
		const m = new Map<string, string>();
		customers.forEach((c) => m.set(c._id, c.name));
		return m;
	}, [customers]);

	return (
		<div className="flex flex-col h-full">
			<DashboardPageHeader title="Invoices" />
			<div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
				<div className="flex flex-wrap items-center gap-3 py-4">
					<div className="relative flex-1 min-w-[200px] max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							placeholder="Search by reference..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-[130px] h-9">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							{Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
								<SelectItem key={v} value={v}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						variant="outline"
						size="sm"
						className="h-9"
						onClick={() => setImportOpen(true)}>
						<Upload className="size-4" />
						Import
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="h-9"
						onClick={handleExportCsv}>
						<Download className="size-4" />
						Export CSV
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="h-9"
						onClick={handleExportJson}>
						<Download className="size-4" />
						Export JSON
					</Button>
					<Button size="sm" className="h-9" onClick={openCreate}>
						<Plus className="size-4" />
						New invoice
					</Button>
				</div>

				<div className="flex-1 rounded-lg border bg-card overflow-hidden min-h-0 flex flex-col">
					{isLoading ? (
						<div className="p-6 space-y-3">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : filtered.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<p className="text-sm text-muted-foreground">
								{search.trim() ? "No invoices match." : "No invoices yet."}
							</p>
							{!search.trim() && (
								<Button variant="outline" className="mt-4" onClick={openCreate}>
									<Plus className="size-4" />
									New invoice
								</Button>
							)}
						</div>
					) : (
						<>
							<div className="overflow-auto flex-1">
								<Table>
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead className="font-medium text-xs">
												Reference
											</TableHead>
											<TableHead className="font-medium text-xs">
												Date
											</TableHead>
											<TableHead className="font-medium text-xs">
												Customer
											</TableHead>
											<TableHead className="font-medium text-xs">
												Mode
											</TableHead>
											<TableHead className="font-medium text-xs">
												Status
											</TableHead>
											<TableHead className="font-medium text-xs text-right">
												Total
											</TableHead>
											<TableHead className="font-medium text-xs w-40">
												Actions
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filtered.map((inv) => {
											const cfg = STATUS_CONFIG[
												inv.status as InvoiceStatus
											] ?? {
												label: inv.status,
												className: "bg-muted",
											};
											return (
												<TableRow key={inv._id}>
													<TableCell className="font-mono text-sm">
														{inv.reference}
													</TableCell>
													<TableCell className="text-muted-foreground">
														{formatDate(inv.date)}
													</TableCell>
													<TableCell>
														{contactMap.get(inv.contactId) ?? inv.contactId}
													</TableCell>
													<TableCell className="text-muted-foreground text-xs">
														{inv.paymentMode ?? "—"}
													</TableCell>
													<TableCell>
														<Badge
															variant="secondary"
															className={cn("text-[10px]", cfg.className)}>
															{cfg.label}
														</Badge>
													</TableCell>
													<TableCell className="text-right font-medium tabular-nums">
														{formatCurrency(inv.totalAmount)}
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-1">
															{inv.status === "DRAFT" && (
																<>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="size-8"
																		onClick={() => openEdit(inv)}>
																		<Pencil className="size-3.5" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="size-8"
																		onClick={() => setPostInvoice(inv)}>
																		<Send className="size-3.5" />
																	</Button>
																</>
															)}
															{(inv.status === "POSTED" ||
																inv.status === "PARTIAL") && (
																<Button
																	variant="ghost"
																	size="icon"
																	className="size-8"
																	onClick={() => setPayInvoice(inv)}>
																	<Banknote className="size-3.5" />
																</Button>
															)}
															{(inv.status === "DRAFT" ||
																inv.status === "POSTED") && (
																<Button
																	variant="ghost"
																	size="icon"
																	className="size-8 text-destructive hover:text-destructive"
																	onClick={() => setDeleteInvoice(inv)}>
																	<Trash2 className="size-3.5" />
																</Button>
															)}
														</div>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
							{pagination && pagination.totalPages > 1 && (
								<div className="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
									<span>
										Page {pagination.page} of {pagination.totalPages} (
										{pagination.total} total)
									</span>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											className="h-7 text-xs"
											disabled={pagination.page <= 1}
											onClick={() => setPage((p) => Math.max(1, p - 1))}>
											Previous
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="h-7 text-xs"
											disabled={pagination.page >= pagination.totalPages}
											onClick={() => setPage((p) => p + 1)}>
											Next
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			<InvoiceFormSheet
				open={formOpen}
				onOpenChange={setFormOpen}
				editInvoice={editInvoice}
				customers={customers}
				products={products}
			/>
			<PaySheet
				open={!!payInvoice}
				onOpenChange={(v) => !v && setPayInvoice(null)}
				invoice={payInvoice}
				onSuccess={() => setPayInvoice(null)}
			/>
			<ImportSheet open={importOpen} onOpenChange={setImportOpen} />

			<AlertDialog
				open={!!postInvoice}
				onOpenChange={(v) => !v && setPostInvoice(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Post invoice?</AlertDialogTitle>
						<AlertDialogDescription>
							This will finalize the invoice, create a journal entry, and reduce
							stock for items with products. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handlePost}
							disabled={postMut.isPending}>
							{postMut.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								"Post"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={!!deleteInvoice}
				onOpenChange={(v) => !v && setDeleteInvoice(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{deleteInvoice?.status === "DRAFT"
								? "Delete invoice?"
								: "Cancel invoice?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteInvoice?.status === "DRAFT"
								? "This draft will be removed. This cannot be undone."
								: "A reversal/credit note will be created and the invoice marked as cancelled."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteMut.isPending}>
							{deleteMut.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : deleteInvoice?.status === "DRAFT" ? (
								"Delete"
							) : (
								"Cancel invoice"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
