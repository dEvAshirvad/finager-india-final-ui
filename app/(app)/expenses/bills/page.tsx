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
	useListExpenses,
	useCreateExpense,
	useUpdateExpense,
	usePostExpense,
	useRecordExpensePayment,
	useDeleteExpense,
	useDownloadExpenseTemplate,
	useImportExpensesFromCsv,
	exportExpensesJson,
	exportExpensesCsv,
	type Expense,
	type CreateExpenseBody,
	type PaymentMode,
	type ExpenseStatus,
	type ExpenseImportError,
} from "@/lib/queries/expenses";
import { useListContacts } from "@/lib/queries/contact";

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
	{ value: "CREDIT", label: "Credit" },
	{ value: "CASH", label: "Cash" },
	{ value: "ONLINE", label: "Online" },
];

const EXPENSE_CATEGORIES = [
	"TRAVEL",
	"OFFICE",
	"UTILITIES",
	"MARKETING",
	"MEALS",
	"SUPPLIES",
	"OTHER",
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
	ExpenseStatus,
	{ label: string; className: string }
> = {
	DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
	POSTED: { label: "Posted", className: "bg-blue-100 text-blue-700" },
	PAID: { label: "Paid", className: "bg-green-100 text-green-700" },
	PARTIAL: { label: "Partial", className: "bg-amber-100 text-amber-700" },
	CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

// ──────────────────────────────────────────────
// Expense form (create / edit)
// ──────────────────────────────────────────────

type ItemRow = {
	description: string;
	amount: string;
	category: string;
};

type ExpenseFormValues = {
	reference: string;
	date: string;
	contactId: string;
	paymentMode: PaymentMode;
	totalAmount: string;
	useLineItems: boolean;
	items: ItemRow[];
	category: string;
	expenseType: string;
	receiptRef: string;
	attachmentUrl: string;
	placeOfSupply: string;
	paymentDue: string;
	narration: string;
};

function ExpenseFormSheet({
	open,
	onOpenChange,
	editExpense,
	vendors,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	editExpense: Expense | null;
	vendors: { _id: string; name: string }[];
}) {
	const createMut = useCreateExpense();
	const updateMut = useUpdateExpense();
	const isEdit = !!editExpense;

	const form = useForm<ExpenseFormValues>({
		defaultValues: {
			reference: "",
			date: new Date().toISOString().slice(0, 10),
			contactId: "",
			paymentMode: "CREDIT",
			totalAmount: "",
			useLineItems: false,
			items: [{ description: "", amount: "", category: "" }],
			category: "",
			expenseType: "",
			receiptRef: "",
			attachmentUrl: "",
			placeOfSupply: "",
			paymentDue: "",
			narration: "",
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "items",
	});

	useEffect(() => {
		if (editExpense) {
			const hasItems = (editExpense.items?.length ?? 0) > 0;
			form.reset({
				reference: editExpense.reference,
				date: editExpense.date.slice(0, 10),
				contactId: editExpense.contactId,
				paymentMode: (editExpense.paymentMode as PaymentMode) ?? "CREDIT",
				totalAmount: String(editExpense.totalAmount ?? ""),
				useLineItems: hasItems,
				items: hasItems
					? editExpense.items!.map((i) => ({
							description: i.description ?? "",
							amount: String(i.amount),
							category: i.category ?? "",
						}))
					: [{ description: "", amount: "", category: "" }],
				category: editExpense.category ?? "",
				expenseType: editExpense.expenseType ?? "",
				receiptRef: editExpense.receiptRef ?? "",
				attachmentUrl: editExpense.attachmentUrl ?? "",
				placeOfSupply: editExpense.placeOfSupply ?? "",
				paymentDue: editExpense.paymentDue?.slice(0, 10) ?? "",
				narration: editExpense.narration ?? "",
			});
		} else {
			form.reset({
				reference: "",
				date: new Date().toISOString().slice(0, 10),
				contactId: "",
				paymentMode: "CREDIT",
				totalAmount: "",
				useLineItems: false,
				items: [{ description: "", amount: "", category: "" }],
				category: "",
				expenseType: "",
				receiptRef: "",
				attachmentUrl: "",
				placeOfSupply: "",
				paymentDue: "",
				narration: "",
			});
		}
	}, [editExpense, open]);

	async function onSubmit(values: ExpenseFormValues) {
		const ref = values.reference?.trim();
		if (!ref) {
			form.setError("reference", { message: "Required" });
			return;
		}
		if (!values.contactId?.trim()) {
			form.setError("contactId", { message: "Select a vendor" });
			return;
		}

		const useLineItems = values.useLineItems;
		let totalAmount = 0;
		let items:
			| { description?: string; amount: number; category?: string }[]
			| undefined;

		if (useLineItems) {
			items = values.items
				.map((r) => {
					const amt = Number(r.amount);
					if (Number.isNaN(amt) || amt < 0) return null;
					return {
						description: r.description?.trim() || undefined,
						amount: amt,
						category: r.category?.trim() || undefined,
					};
				})
				.filter((x): x is NonNullable<typeof x> => x !== null);
			if (items.length === 0) {
				toast.error("Add at least one line with amount.");
				return;
			}
			totalAmount = items.reduce((s, i) => s + i.amount, 0);
		} else {
			const t = Number(values.totalAmount);
			if (Number.isNaN(t) || t < 0) {
				form.setError("totalAmount", { message: "Enter a valid amount" });
				return;
			}
			totalAmount = t;
		}

		if (isEdit && editExpense) {
			try {
				await updateMut.mutateAsync({
					id: editExpense._id,
					body: {
						reference: ref,
						date: values.date,
						contactId: values.contactId,
						totalAmount,
						paymentMode: values.paymentMode,
						category: values.category?.trim() || undefined,
						expenseType: values.expenseType?.trim() || undefined,
						receiptRef: values.receiptRef?.trim() || undefined,
						attachmentUrl: values.attachmentUrl?.trim() || undefined,
						placeOfSupply: values.placeOfSupply?.trim() || undefined,
						paymentDue: values.paymentDue || undefined,
						narration: values.narration?.trim() || undefined,
						...(items !== undefined ? { items } : {}),
					},
				});
				toast.success("Expense updated.");
				onOpenChange(false);
			} catch {
				toast.error("Failed to update expense.");
			}
			return;
		}

		const body: CreateExpenseBody = {
			reference: ref,
			date: new Date(values.date).toISOString(),
			contactId: values.contactId,
			totalAmount,
			paymentMode: values.paymentMode,
			category: values.category?.trim() || undefined,
			expenseType: values.expenseType?.trim() || undefined,
			receiptRef: values.receiptRef?.trim() || undefined,
			attachmentUrl: values.attachmentUrl?.trim() || undefined,
			placeOfSupply: values.placeOfSupply?.trim() || undefined,
			paymentDue: values.paymentDue
				? new Date(values.paymentDue).toISOString()
				: undefined,
			narration: values.narration?.trim() || undefined,
		};
		if (items?.length) body.items = items;

		try {
			await createMut.mutateAsync(body);
			toast.success("Expense created.");
			onOpenChange(false);
		} catch (e: unknown) {
			const err = e as {
				response?: { status?: number; data?: { message?: string } };
			};
			if (err?.response?.status === 409) {
				toast.error("Duplicate reference. Use a unique reference.");
			} else {
				toast.error(
					err?.response?.data?.message ?? "Failed to create expense.",
				);
			}
		}
	}

	const isPending = createMut.isPending || updateMut.isPending;
	const useLineItems = form.watch("useLineItems");

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex flex-col h-full w-full sm:max-w-xl overflow-hidden">
				<SheetHeader>
					<SheetTitle>{isEdit ? "Edit expense" : "New expense"}</SheetTitle>
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
												placeholder="EXP-0001"
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
										<FormLabel>Vendor / Payee</FormLabel>
										<Select
											value={field.value}
											onValueChange={field.onChange}
											disabled={isEdit}>
											<SelectTrigger>
												<SelectValue placeholder="Select vendor" />
											</SelectTrigger>
											<SelectContent>
												{vendors.map((c) => (
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
								name="useLineItems"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center gap-2">
										<FormControl>
											<input
												type="checkbox"
												checked={field.value}
												onChange={(e) => field.onChange(e.target.checked)}
												className="rounded border"
												disabled={isEdit}
											/>
										</FormControl>
										<FormLabel className="!mt-0">Use line items</FormLabel>
									</FormItem>
								)}
							/>
							{!useLineItems && (
								<FormField
									control={form.control}
									name="totalAmount"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Amount (₹)</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													min={0}
													placeholder="0"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
							{useLineItems && (
								<div>
									<div className="flex items-center justify-between mb-2">
										<FormLabel>Line items</FormLabel>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												append({
													description: "",
													amount: "",
													category: "",
												})
											}
											disabled={isEdit}>
											<Plus className="size-3.5" /> Add line
										</Button>
									</div>
									<div className="rounded-md border">
										<Table>
											<TableHeader>
												<TableRow className="hover:bg-transparent">
													<TableHead className="text-xs">Description</TableHead>
													<TableHead className="text-xs w-24">Amount</TableHead>
													<TableHead className="text-xs w-24">
														Category
													</TableHead>
													<TableHead className="w-8" />
												</TableRow>
											</TableHeader>
											<TableBody>
												{fields.map((field, i) => (
													<TableRow key={field.id}>
														<TableCell className="p-2">
															<Input
																className="h-8 text-xs"
																placeholder="Optional"
																{...form.register(`items.${i}.description`)}
																disabled={isEdit}
															/>
														</TableCell>
														<TableCell className="p-2">
															<Input
																type="number"
																step="0.01"
																min={0}
																className="h-8 text-xs"
																{...form.register(`items.${i}.amount`)}
																disabled={isEdit}
															/>
														</TableCell>
														<TableCell className="p-2">
															<Input
																className="h-8 text-xs"
																placeholder="Optional"
																{...form.register(`items.${i}.category`)}
																disabled={isEdit}
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
							)}
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="category"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Category</FormLabel>
											<Select
												value={field.value || "none"}
												onValueChange={(v) =>
													field.onChange(v === "none" ? "" : v)
												}>
												<SelectTrigger>
													<SelectValue placeholder="Optional" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">—</SelectItem>
													{EXPENSE_CATEGORIES.map((c) => (
														<SelectItem key={c} value={c}>
															{c}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="expenseType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Expense type</FormLabel>
											<FormControl>
												<Input placeholder="e.g. REIMBURSABLE" {...field} />
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={form.control}
								name="receiptRef"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Receipt reference</FormLabel>
										<FormControl>
											<Input placeholder="Optional" {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="attachmentUrl"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Attachment URL</FormLabel>
										<FormControl>
											<Input placeholder="Optional" {...field} />
										</FormControl>
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
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="narration"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Narration</FormLabel>
										<FormControl>
											<Input placeholder="Optional" {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
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
	expense,
	onSuccess,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	expense: Expense | null;
	onSuccess: () => void;
}) {
	const payMut = useRecordExpensePayment();
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [reference, setReference] = useState("");
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (open && expense) {
			setAmount("");
			setDate(new Date().toISOString().slice(0, 10));
			setReference("");
			setNotes("");
		}
	}, [open, expense]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!expense) return;
		const num = Number(amount);
		if (Number.isNaN(num) || num <= 0) {
			toast.error("Enter a valid amount.");
			return;
		}
		try {
			await payMut.mutateAsync({
				id: expense._id,
				body: {
					amount: num,
					date: new Date(date).toISOString(),
					reference: reference.trim() || `PAY-${expense.reference}`,
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
				{expense && (
					<form
						onSubmit={handleSubmit}
						className="flex flex-col flex-1 min-h-0">
						<div className="flex-1 space-y-4 overflow-y-auto px-4">
							<p className="text-sm text-muted-foreground">
								{expense.reference} — {formatCurrency(expense.totalAmount)}
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
	const downloadMut = useDownloadExpenseTemplate();
	const importMut = useImportExpensesFromCsv();
	const [file, setFile] = useState<File | null>(null);
	const [result, setResult] = useState<{
		message?: string;
		created?: number;
		updated?: number;
		errors: ExpenseImportError[];
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
					<SheetTitle>Import expenses (CSV)</SheetTitle>
				</SheetHeader>
				<div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-4">
					<p className="text-sm text-muted-foreground">
						Use the template. Each row = one expense (DRAFT). Max{" "}
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

export default function BillsPage() {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [page, setPage] = useState(1);
	const limit = 20;
	const [formOpen, setFormOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [editExpense, setEditExpense] = useState<Expense | null>(null);
	const [payExpense, setPayExpense] = useState<Expense | null>(null);
	const [postExpense, setPostExpense] = useState<Expense | null>(null);
	const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);

	const params = useMemo(
		() => ({
			page,
			limit,
			status:
				statusFilter === "all" ? undefined : (statusFilter as ExpenseStatus),
			category: categoryFilter === "all" ? undefined : categoryFilter,
		}),
		[page, statusFilter, categoryFilter, limit],
	);
	const { data, isLoading } = useListExpenses(params);
	const { data: vendorsData } = useListContacts({
		type: "vendor",
		limit: 500,
	});

	const expenses = data?.data ?? [];
	const pagination = data?.pagination;
	const vendors = useMemo(() => {
		const d = vendorsData as
			| { data?: { _id: string; name: string }[] }
			| undefined;
		return d?.data ?? [];
	}, [vendorsData]);

	const postMut = usePostExpense();
	const deleteMut = useDeleteExpense();

	const filtered = useMemo(() => {
		if (!search.trim()) return expenses;
		const q = search.toLowerCase();
		return expenses.filter(
			(exp) =>
				exp.reference?.toLowerCase().includes(q) ||
				exp.contactId?.toLowerCase().includes(q) ||
				exp.category?.toLowerCase().includes(q),
		);
	}, [expenses, search]);

	function openCreate() {
		setEditExpense(null);
		setFormOpen(true);
	}

	function openEdit(exp: Expense) {
		setEditExpense(exp);
		setFormOpen(true);
	}

	async function handlePost() {
		if (!postExpense) return;
		try {
			await postMut.mutateAsync({ id: postExpense._id });
			toast.success("Expense posted.");
			setPostExpense(null);
		} catch {
			toast.error("Failed to post expense.");
		}
	}

	async function handleDelete() {
		if (!deleteExpense) return;
		try {
			await deleteMut.mutateAsync(deleteExpense._id);
			toast.success(
				deleteExpense.status === "DRAFT"
					? "Expense deleted."
					: "Expense cancelled.",
			);
			setDeleteExpense(null);
		} catch {
			toast.error("Failed to delete/cancel expense.");
		}
	}

	async function handleExportJson() {
		try {
			const blob = await exportExpensesJson({ ...params, limit: 10000 });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "expenses-export.json";
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Export downloaded.");
		} catch {
			toast.error("Failed to export.");
		}
	}

	async function handleExportCsv() {
		try {
			const blob = await exportExpensesCsv({ ...params, limit: 10000 });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "expenses-export.csv";
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Export downloaded.");
		} catch {
			toast.error("Failed to export.");
		}
	}

	const contactMap = useMemo(() => {
		const m = new Map<string, string>();
		vendors.forEach((c) => m.set(c._id, c.name));
		return m;
	}, [vendors]);

	return (
		<div className="flex flex-col h-full">
			<DashboardPageHeader title="Bills" />
			<div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
				<div className="flex flex-wrap items-center gap-3 py-4">
					<div className="relative flex-1 min-w-[200px] max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							placeholder="Search by reference or category..."
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
					<Select value={categoryFilter} onValueChange={setCategoryFilter}>
						<SelectTrigger className="w-[130px] h-9">
							<SelectValue placeholder="Category" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							{EXPENSE_CATEGORIES.map((c) => (
								<SelectItem key={c} value={c}>
									{c}
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
						New expense
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
								{search.trim() ? "No expenses match." : "No expenses yet."}
							</p>
							{!search.trim() && (
								<Button variant="outline" className="mt-4" onClick={openCreate}>
									<Plus className="size-4" />
									New expense
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
												Vendor
											</TableHead>
											<TableHead className="font-medium text-xs">
												Category
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
										{filtered.map((exp) => {
											const cfg = STATUS_CONFIG[
												exp.status as ExpenseStatus
											] ?? {
												label: exp.status,
												className: "bg-muted",
											};
											return (
												<TableRow key={exp._id}>
													<TableCell className="font-mono text-sm">
														{exp.reference}
													</TableCell>
													<TableCell className="text-muted-foreground">
														{formatDate(exp.date)}
													</TableCell>
													<TableCell>
														{contactMap.get(exp.contactId) ?? exp.contactId}
													</TableCell>
													<TableCell className="text-muted-foreground text-xs">
														{exp.category ?? "—"}
													</TableCell>
													<TableCell className="text-muted-foreground text-xs">
														{exp.paymentMode ?? "—"}
													</TableCell>
													<TableCell>
														<Badge
															variant="secondary"
															className={cn("text-[10px]", cfg.className)}>
															{cfg.label}
														</Badge>
													</TableCell>
													<TableCell className="text-right font-medium tabular-nums">
														{formatCurrency(exp.totalAmount)}
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-1">
															{exp.status === "DRAFT" && (
																<>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="size-8"
																		onClick={() => openEdit(exp)}>
																		<Pencil className="size-3.5" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="size-8"
																		onClick={() => setPostExpense(exp)}>
																		<Send className="size-3.5" />
																	</Button>
																</>
															)}
															{(exp.status === "POSTED" ||
																exp.status === "PARTIAL") && (
																<Button
																	variant="ghost"
																	size="icon"
																	className="size-8"
																	onClick={() => setPayExpense(exp)}>
																	<Banknote className="size-3.5" />
																</Button>
															)}
															{(exp.status === "DRAFT" ||
																exp.status === "POSTED") && (
																<Button
																	variant="ghost"
																	size="icon"
																	className="size-8 text-destructive hover:text-destructive"
																	onClick={() => setDeleteExpense(exp)}>
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

			<ExpenseFormSheet
				open={formOpen}
				onOpenChange={setFormOpen}
				editExpense={editExpense}
				vendors={vendors}
			/>
			<PaySheet
				open={!!payExpense}
				onOpenChange={(v) => !v && setPayExpense(null)}
				expense={payExpense}
				onSuccess={() => setPayExpense(null)}
			/>
			<ImportSheet open={importOpen} onOpenChange={setImportOpen} />

			<AlertDialog
				open={!!postExpense}
				onOpenChange={(v) => !v && setPostExpense(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Post expense?</AlertDialogTitle>
						<AlertDialogDescription>
							This will finalize the expense and create a journal entry. This
							cannot be undone.
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
				open={!!deleteExpense}
				onOpenChange={(v) => !v && setDeleteExpense(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{deleteExpense?.status === "DRAFT"
								? "Delete expense?"
								: "Cancel expense?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteExpense?.status === "DRAFT"
								? "This draft will be removed. This cannot be undone."
								: "A reversal journal will be created and the expense marked as cancelled."}
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
							) : deleteExpense?.status === "DRAFT" ? (
								"Delete"
							) : (
								"Cancel expense"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
