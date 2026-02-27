"use client";

import { useState, useMemo, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import {
	Plus,
	Trash2,
	Loader2,
	Search,
	CheckCircle2,
	Undo2,
	FileText,
	Clock,
	Filter,
	ChevronLeft,
	ChevronRight,
	Eye,
	Pencil,
	Upload,
	AlertCircle,
} from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { cn } from "@/lib/utils";
import {
	useListJournals,
	useGetJournal,
	useCreateJournal,
	usePatchJournal,
	useDeleteJournal,
	usePostJournals,
	useReverseJournals,
	useDownloadJournalImportTemplate,
	useImportJournalsFromCsv,
	type JournalEntry,
	type JournalLine,
	type CreateJournalBody,
	type ListJournalParams,
	type JournalStatus,
	type JournalImportError,
} from "@/lib/queries/journal";
import { useListAccounts, type CoaAccount } from "@/lib/queries/coa";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatCurrency(amount: number) {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
	}).format(amount);
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function totalDebit(lines: JournalLine[]) {
	return lines.reduce((s, l) => s + (l.debit || 0), 0);
}

function totalCredit(lines: JournalLine[]) {
	return lines.reduce((s, l) => s + (l.credit || 0), 0);
}

const STATUS_CONFIG: Record<JournalStatus, { label: string; className: string; icon: typeof Clock }> = {
	DRAFT: { label: "Draft", className: "bg-amber-100 text-amber-700", icon: Clock },
	POSTED: { label: "Posted", className: "bg-green-100 text-green-700", icon: CheckCircle2 },
	REVERSED: { label: "Reversed", className: "bg-red-100 text-red-700", icon: Undo2 },
};

function StatusBadge({ status }: { status: JournalStatus }) {
	const cfg = STATUS_CONFIG[status];
	const Icon = cfg.icon;
	return (
		<Badge variant="secondary" className={cn("gap-1 text-[10px]", cfg.className)}>
			<Icon className="size-3" />
			{cfg.label}
		</Badge>
	);
}

// ──────────────────────────────────────────────
// Account combobox (simple select with search)
// ──────────────────────────────────────────────

function AccountSelect({
	accounts,
	value,
	onChange,
}: {
	accounts: CoaAccount[];
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="w-full h-8 text-xs">
				<SelectValue placeholder="Select account" />
			</SelectTrigger>
			<SelectContent className="max-h-60">
				{accounts.map((a) => (
					<SelectItem key={a._id} value={a._id} className="text-xs">
						<span className="font-mono text-muted-foreground mr-1.5">{a.code}</span>
						{a.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

// ──────────────────────────────────────────────
// Create / Edit Journal Dialog
// ──────────────────────────────────────────────

type LineFormValue = {
	accountId: string;
	debit: string;
	credit: string;
	narration: string;
};

type JournalFormValues = {
	date: string;
	reference: string;
	description: string;
	lines: LineFormValue[];
};

const emptyLine: LineFormValue = { accountId: "", debit: "", credit: "", narration: "" };

function JournalFormDialog({
	open,
	onOpenChange,
	editEntry,
	accounts,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	editEntry?: JournalEntry | null;
	accounts: CoaAccount[];
}) {
	const createMutation = useCreateJournal();
	const patchMutation = usePatchJournal();
	const isEdit = !!editEntry;

	const form = useForm<JournalFormValues>({
		defaultValues: editEntry
			? {
					date: editEntry.date.slice(0, 10),
					reference: editEntry.reference ?? "",
					description: editEntry.description ?? "",
					lines: editEntry.lines.map((l) => ({
						accountId: l.accountId,
						debit: l.debit > 0 ? String(l.debit) : "",
						credit: l.credit > 0 ? String(l.credit) : "",
						narration: l.narration ?? "",
					})),
				}
			: {
					date: new Date().toISOString().slice(0, 10),
					reference: "",
					description: "",
					lines: [{ ...emptyLine }, { ...emptyLine }],
				},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "lines",
	});

	const watchedLines = form.watch("lines");
	const debits = watchedLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
	const credits = watchedLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
	const isBalanced = Math.abs(debits - credits) < 0.01 && debits > 0;

	async function onSubmit(values: JournalFormValues) {
		const lines: JournalLine[] = values.lines.map((l) => ({
			accountId: l.accountId,
			debit: parseFloat(l.debit) || 0,
			credit: parseFloat(l.credit) || 0,
			narration: l.narration || undefined,
		}));

		for (const line of lines) {
			if (!line.accountId) {
				toast.error("All lines must have an account selected.");
				return;
			}
			if (line.debit === 0 && line.credit === 0) {
				toast.error("Each line must have a debit or credit amount.");
				return;
			}
			if (line.debit > 0 && line.credit > 0) {
				toast.error("A line cannot have both debit and credit.");
				return;
			}
		}

		const td = lines.reduce((s, l) => s + l.debit, 0);
		const tc = lines.reduce((s, l) => s + l.credit, 0);
		if (Math.abs(td - tc) >= 0.01) {
			toast.error("Total debits must equal total credits.");
			return;
		}

		const payload = {
			date: values.date,
			reference: values.reference || undefined,
			description: values.description || undefined,
			lines,
		};

		try {
			if (isEdit) {
				await patchMutation.mutateAsync({ id: editEntry._id, body: payload });
				toast.success("Journal entry updated.");
			} else {
				await createMutation.mutateAsync(payload);
				toast.success("Journal entry created.");
			}
			onOpenChange(false);
		} catch {
			toast.error(isEdit ? "Failed to update entry." : "Failed to create entry.");
		}
	}

	const isPending = createMutation.isPending || patchMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Journal Entry" : "New Journal Entry"}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
						<div className="grid grid-cols-3 gap-4">
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
								name="reference"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Reference</FormLabel>
										<FormControl>
											<Input placeholder="JV-001" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Input placeholder="Cash deposit" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<Separator />

						{/* Lines */}
						<div>
							<div className="flex items-center justify-between mb-3">
								<h4 className="text-sm font-semibold">Journal Lines</h4>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-7 text-xs"
									onClick={() => append({ ...emptyLine })}
								>
									<Plus className="size-3" />
									Add Line
								</Button>
							</div>

							<div className="rounded-lg border">
								<Table>
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead className="text-xs font-medium pl-3 w-[35%]">Account</TableHead>
											<TableHead className="text-xs font-medium w-[20%]">Debit</TableHead>
											<TableHead className="text-xs font-medium w-[20%]">Credit</TableHead>
											<TableHead className="text-xs font-medium w-[20%]">Narration</TableHead>
											<TableHead className="text-xs w-8 pr-3" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{fields.map((field, index) => (
											<TableRow key={field.id} className="hover:bg-transparent">
												<TableCell className="pl-3 py-1.5">
													<FormField
														control={form.control}
														name={`lines.${index}.accountId`}
														render={({ field: f }) => (
															<AccountSelect
																accounts={accounts}
																value={f.value}
																onChange={f.onChange}
															/>
														)}
													/>
												</TableCell>
												<TableCell className="py-1.5">
													<FormField
														control={form.control}
														name={`lines.${index}.debit`}
														render={({ field: f }) => (
															<Input
																type="number"
																min="0"
																step="0.01"
																placeholder="0.00"
																className="h-8 text-xs"
																{...f}
																onChange={(e) => {
																	f.onChange(e);
																	if (parseFloat(e.target.value) > 0) {
																		form.setValue(`lines.${index}.credit`, "");
																	}
																}}
															/>
														)}
													/>
												</TableCell>
												<TableCell className="py-1.5">
													<FormField
														control={form.control}
														name={`lines.${index}.credit`}
														render={({ field: f }) => (
															<Input
																type="number"
																min="0"
																step="0.01"
																placeholder="0.00"
																className="h-8 text-xs"
																{...f}
																onChange={(e) => {
																	f.onChange(e);
																	if (parseFloat(e.target.value) > 0) {
																		form.setValue(`lines.${index}.debit`, "");
																	}
																}}
															/>
														)}
													/>
												</TableCell>
												<TableCell className="py-1.5">
													<FormField
														control={form.control}
														name={`lines.${index}.narration`}
														render={({ field: f }) => (
															<Input
																placeholder="Note"
																className="h-8 text-xs"
																{...f}
															/>
														)}
													/>
												</TableCell>
												<TableCell className="pr-3 py-1.5">
													{fields.length > 2 && (
														<button
															type="button"
															className="text-muted-foreground hover:text-destructive cursor-pointer"
															onClick={() => remove(index)}
														>
															<Trash2 className="size-3.5" />
														</button>
													)}
												</TableCell>
											</TableRow>
										))}

										{/* Totals row */}
										<TableRow className="bg-muted/50 hover:bg-muted/50 font-medium">
											<TableCell className="pl-3 text-xs text-right">Total</TableCell>
											<TableCell className="text-xs font-mono">
												{formatCurrency(debits)}
											</TableCell>
											<TableCell className="text-xs font-mono">
												{formatCurrency(credits)}
											</TableCell>
											<TableCell colSpan={2} className="text-xs">
												{isBalanced ? (
													<span className="text-green-600 flex items-center gap-1">
														<CheckCircle2 className="size-3" /> Balanced
													</span>
												) : debits > 0 || credits > 0 ? (
													<span className="text-destructive">
														Difference: {formatCurrency(Math.abs(debits - credits))}
													</span>
												) : null}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</div>
						</div>

						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" type="button">Cancel</Button>
							</DialogClose>
							<Button type="submit" disabled={isPending || !isBalanced}>
								{isPending ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										{isEdit ? "Saving..." : "Creating..."}
									</>
								) : isEdit ? "Save Changes" : "Create Entry"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

// ──────────────────────────────────────────────
// View Detail Dialog
// ──────────────────────────────────────────────

function ViewJournalDialog({
	open,
	onOpenChange,
	journalId,
	accounts,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	journalId: string;
	accounts: CoaAccount[];
}) {
	const { data: raw, isLoading } = useGetJournal(journalId);
	const entry = useMemo<JournalEntry | null>(() => {
		if (!raw) return null;
		if (Array.isArray((raw as JournalEntry).lines)) return raw as JournalEntry;
		const wrapped = raw as Record<string, unknown>;
		if (wrapped.data && Array.isArray((wrapped.data as JournalEntry).lines))
			return wrapped.data as JournalEntry;
		return raw as JournalEntry;
	}, [raw]);
	const accountMap = useMemo(() => {
		const m = new Map<string, CoaAccount>();
		accounts.forEach((a) => m.set(a._id, a));
		return m;
	}, [accounts]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Journal Entry</DialogTitle>
				</DialogHeader>

				{isLoading || !entry ? (
					<div className="space-y-3 py-4">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-4 w-60" />
						<Skeleton className="h-32 w-full" />
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-center gap-3 flex-wrap">
							<StatusBadge status={entry.status} />
							{entry.reference && (
								<span className="text-sm font-mono">{entry.reference}</span>
							)}
							<span className="text-sm text-muted-foreground">
								{formatDate(entry.date)}
							</span>
						</div>

						{entry.description && (
							<p className="text-sm text-muted-foreground">{entry.description}</p>
						)}

						<div className="rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead className="text-xs font-medium pl-4">Account</TableHead>
										<TableHead className="text-xs font-medium text-right">Debit</TableHead>
										<TableHead className="text-xs font-medium text-right pr-4">Credit</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{entry.lines.map((line, i) => {
										const acc = accountMap.get(line.accountId);
										return (
											<TableRow key={i}>
												<TableCell className="pl-4 text-sm">
													<span className="font-mono text-muted-foreground mr-1.5 text-xs">
														{acc?.code ?? "???"}
													</span>
													{acc?.name ?? line.accountId}
													{line.narration && (
														<span className="block text-xs text-muted-foreground">
															{line.narration}
														</span>
													)}
												</TableCell>
												<TableCell className="text-sm text-right font-mono">
													{line.debit > 0 ? formatCurrency(line.debit) : ""}
												</TableCell>
												<TableCell className="text-sm text-right pr-4 font-mono">
													{line.credit > 0 ? formatCurrency(line.credit) : ""}
												</TableCell>
											</TableRow>
										);
									})}
									<TableRow className="bg-muted/50 hover:bg-muted/50 font-semibold">
										<TableCell className="pl-4 text-xs">Total</TableCell>
										<TableCell className="text-xs text-right font-mono">
											{formatCurrency(totalDebit(entry.lines))}
										</TableCell>
										<TableCell className="text-xs text-right pr-4 font-mono">
											{formatCurrency(totalCredit(entry.lines))}
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</div>

						<div className="flex gap-4 text-xs text-muted-foreground">
							{entry.createdAt && <span>Created: {formatDate(entry.createdAt)}</span>}
							{entry.updatedAt && <span>Updated: {formatDate(entry.updatedAt)}</span>}
						</div>
					</div>
				)}

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Close</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ──────────────────────────────────────────────
// CSV Import Dialog
// ──────────────────────────────────────────────

const CSV_ACCEPT = ".csv,text/csv,application/vnd.ms-excel";
const MAX_CSV_SIZE_MB = 5;

function ImportJournalsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const downloadTemplateMut = useDownloadJournalImportTemplate();
	const importCsvMut = useImportJournalsFromCsv();
	const [file, setFile] = useState<File | null>(null);
	const [importResult, setImportResult] = useState<{
		message: string;
		count: number;
		errors: JournalImportError[];
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
			await downloadTemplateMut.mutateAsync();
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
			const res = await importCsvMut.mutateAsync(file);
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
				const res = (err as { response?: { data?: { errors?: JournalImportError[]; message?: string } } }).response;
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
					<DialogTitle>Import Journal Entries (CSV)</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Use account <strong>codes</strong> (e.g. 1001, 2001) from your Chart of Accounts.
						One row = one line; rows with the same <code className="text-xs bg-muted px-1 rounded">date</code> and{" "}
						<code className="text-xs bg-muted px-1 rounded">reference</code> form one entry (min 2 lines per entry).
						Max {MAX_CSV_SIZE_MB}MB.
					</p>

					<div className="flex flex-col gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-fit"
							disabled={downloadTemplateMut.isPending}
							onClick={handleDownloadTemplate}
						>
							{downloadTemplateMut.isPending ? (
								<><Loader2 className="size-4 animate-spin" /> Downloading...</>
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
								onClick={() => fileInputRef.current?.click()}
							>
								{file ? file.name : "Choose CSV file"}
							</Button>
							{file && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-muted-foreground"
									onClick={() => { setFile(null); setImportResult(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
								>
									Clear
								</Button>
							)}
						</div>
					</div>

					{importResult && (
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
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
												{err.reference && ` · ${err.reference}`}
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
						<Button variant="outline" type="button">Cancel</Button>
					</DialogClose>
					<Button
						onClick={handleImport}
						disabled={!file || importCsvMut.isPending}
					>
						{importCsvMut.isPending ? (
							<><Loader2 className="size-4 animate-spin" /> Importing...</>
						) : (
							<><Upload className="size-4" /> Import</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function JournalsPage() {
	const [params, setParams] = useState<ListJournalParams>({
		page: 1,
		limit: 20,
		sort: "date",
		order: "desc",
	});
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [searchRef, setSearchRef] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
	const [viewId, setViewId] = useState<string | null>(null);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const queryParams = useMemo<ListJournalParams>(() => {
		const p = { ...params };
		if (statusFilter !== "all") p.status = statusFilter as JournalStatus;
		if (searchRef.trim()) p.reference = searchRef.trim();
		return p;
	}, [params, statusFilter, searchRef]);

	const { data: journalData, isLoading } = useListJournals(queryParams);
	const { data: accountData } = useListAccounts({ limit: 500 });
	const postMutation = usePostJournals();
	const reverseMutation = useReverseJournals();
	const deleteMutation = useDeleteJournal();

	const entries = useMemo(() => {
		if (!journalData) return [];
		if (Array.isArray(journalData)) return journalData as JournalEntry[];
		if (journalData.data && Array.isArray(journalData.data)) return journalData.data;
		return [];
	}, [journalData]);

	const pagination = useMemo(() => {
		if (!journalData || Array.isArray(journalData)) return null;
		return journalData.pagination ?? null;
	}, [journalData]);

	const accounts = useMemo(() => {
		if (!accountData) return [];
		if (Array.isArray(accountData)) return accountData as CoaAccount[];
		if (accountData.data && Array.isArray(accountData.data)) return accountData.data;
		return [];
	}, [accountData]);

	const accountMap = useMemo(() => {
		const m = new Map<string, CoaAccount>();
		accounts.forEach((a) => m.set(a._id, a));
		return m;
	}, [accounts]);

	function toggleSelect(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAll() {
		if (selected.size === entries.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(entries.map((e) => e._id)));
		}
	}

	const selectedDraftIds = useMemo(
		() => entries.filter((e) => selected.has(e._id) && e.status === "DRAFT").map((e) => e._id),
		[entries, selected],
	);

	const selectedPostedIds = useMemo(
		() => entries.filter((e) => selected.has(e._id) && e.status === "POSTED").map((e) => e._id),
		[entries, selected],
	);

	async function handleBulkPost() {
		if (!selectedDraftIds.length) return;
		try {
			const res = await postMutation.mutateAsync({ ids: selectedDraftIds });
			toast.success(`${res.posted.length} entries posted.`);
			setSelected(new Set());
		} catch {
			toast.error("Failed to post entries.");
		}
	}

	async function handleBulkReverse() {
		if (!selectedPostedIds.length) return;
		try {
			const res = await reverseMutation.mutateAsync({ ids: selectedPostedIds });
			toast.success(`${res.reversed.length} entries reversed.`);
			setSelected(new Set());
		} catch {
			toast.error("Failed to reverse entries.");
		}
	}

	return (
		<div className="min-h-full flex flex-col">
			<DashboardPageHeader title="journal entries" />

			<div className="p-6 flex-1 flex flex-col gap-4">
				{/* Toolbar */}
				<div className="flex items-center justify-between gap-4 flex-wrap">
					<div className="flex items-center gap-2">
						<div className="relative">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
							<Input
								placeholder="Search by reference..."
								className="h-8 pl-8 w-56 text-xs"
								value={searchRef}
								onChange={(e) => {
									setSearchRef(e.target.value);
									setParams((p) => ({ ...p, page: 1 }));
								}}
							/>
						</div>
						<Select
							value={statusFilter}
							onValueChange={(v) => {
								setStatusFilter(v);
								setParams((p) => ({ ...p, page: 1 }));
							}}
						>
							<SelectTrigger className="h-8 w-32 text-xs">
								<Filter className="size-3 mr-1.5 text-muted-foreground" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="DRAFT">Draft</SelectItem>
								<SelectItem value="POSTED">Posted</SelectItem>
								<SelectItem value="REVERSED">Reversed</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center gap-2">
						{selectedDraftIds.length > 0 && (
							<Button
								size="sm"
								variant="outline"
								className="h-8 text-xs text-green-700 border-green-300 hover:bg-green-50"
								disabled={postMutation.isPending}
								onClick={handleBulkPost}
							>
								<CheckCircle2 className="size-3.5" />
								Post ({selectedDraftIds.length})
							</Button>
						)}
						{selectedPostedIds.length > 0 && (
							<Button
								size="sm"
								variant="outline"
								className="h-8 text-xs text-red-700 border-red-300 hover:bg-red-50"
								disabled={reverseMutation.isPending}
								onClick={handleBulkReverse}
							>
								<Undo2 className="size-3.5" />
								Reverse ({selectedPostedIds.length})
							</Button>
						)}
						<Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setImportOpen(true)}>
							<Upload className="size-3.5" />
							Import
						</Button>
						<Button size="sm" className="h-8 text-xs" onClick={() => { setEditEntry(null); setCreateOpen(true); }}>
							<Plus className="size-3.5" />
							New Entry
						</Button>
					</div>
				</div>

				{/* Table */}
				<div className="rounded-xl border bg-card shadow-sm flex-1">
					{isLoading ? (
						<div className="p-6 space-y-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} className="flex items-center gap-4">
									<Skeleton className="size-4 rounded" />
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-4 flex-1" />
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-4 w-16" />
								</div>
							))}
						</div>
					) : entries.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 text-center">
							<div className="size-16 rounded-full bg-muted flex items-center justify-center mb-3">
								<FileText className="size-7 text-muted-foreground" />
							</div>
							<h3 className="text-base font-medium mb-1">No journal entries</h3>
							<p className="text-sm text-muted-foreground max-w-xs mb-4">
								Create your first journal entry to start tracking transactions.
							</p>
							<Button size="sm" onClick={() => { setEditEntry(null); setCreateOpen(true); }}>
								<Plus className="size-3.5" />
								New Entry
							</Button>
						</div>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-10 pl-4">
											<input
												type="checkbox"
												className="rounded border-muted-foreground/40 cursor-pointer"
												checked={selected.size === entries.length && entries.length > 0}
												onChange={toggleAll}
											/>
										</TableHead>
										<TableHead className="font-medium text-xs">Date</TableHead>
										<TableHead className="font-medium text-xs">Reference</TableHead>
										<TableHead className="font-medium text-xs">Description</TableHead>
										<TableHead className="font-medium text-xs text-right">Amount</TableHead>
										<TableHead className="font-medium text-xs">Status</TableHead>
										<TableHead className="font-medium text-xs pr-4 w-28" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{entries.map((entry) => {
										const debit = totalDebit(entry.lines);
										return (
											<TableRow
												key={entry._id}
												className={cn(selected.has(entry._id) && "bg-primary/5")}
											>
												<TableCell className="pl-4">
													<input
														type="checkbox"
														className="rounded border-muted-foreground/40 cursor-pointer"
														checked={selected.has(entry._id)}
														onChange={() => toggleSelect(entry._id)}
													/>
												</TableCell>
												<TableCell className="text-sm whitespace-nowrap">
													{formatDate(entry.date)}
												</TableCell>
												<TableCell className="text-sm font-mono">
													{entry.reference ?? "—"}
												</TableCell>
												<TableCell className="text-sm truncate max-w-[280px]">
													{entry.description ?? "—"}
												</TableCell>
												<TableCell className="text-sm text-right font-mono">
													{formatCurrency(debit)}
												</TableCell>
												<TableCell>
													<StatusBadge status={entry.status} />
												</TableCell>
												<TableCell className="pr-4">
													<div className="flex items-center gap-1 justify-end">
														<Button
															variant="ghost"
															size="icon"
															className="size-7"
															onClick={() => setViewId(entry._id)}
														>
															<Eye className="size-3.5" />
														</Button>
														{entry.status === "DRAFT" && (
															<>
																<Button
																	variant="ghost"
																	size="icon"
																	className="size-7 text-green-600 hover:text-green-700"
																	disabled={postMutation.isPending}
																	onClick={async () => {
																		try {
																			await postMutation.mutateAsync({ ids: [entry._id] });
																			toast.success("Entry posted.");
																		} catch {
																			toast.error("Failed to post entry.");
																		}
																	}}
																>
																	<CheckCircle2 className="size-3.5" />
																</Button>
																<Button
																	variant="ghost"
																	size="icon"
																	className="size-7"
																	onClick={() => {
																		setEditEntry(entry);
																		setCreateOpen(true);
																	}}
																>
																	<Pencil className="size-3.5" />
																</Button>
																<Button
																	variant="ghost"
																	size="icon"
																	className="size-7 text-destructive hover:text-destructive"
																	disabled={deleteMutation.isPending}
																	onClick={async () => {
																		try {
																			await deleteMutation.mutateAsync(entry._id);
																			toast.success("Entry deleted.");
																		} catch {
																			toast.error("Failed to delete entry.");
																		}
																	}}
																>
																	<Trash2 className="size-3.5" />
																</Button>
															</>
														)}
														{entry.status === "POSTED" && (
															<Button
																variant="ghost"
																size="icon"
																className="size-7 text-red-600 hover:text-red-700"
																disabled={reverseMutation.isPending}
																onClick={async () => {
																	try {
																		await reverseMutation.mutateAsync({ ids: [entry._id] });
																		toast.success("Entry reversed.");
																	} catch {
																		toast.error("Failed to reverse entry.");
																	}
																}}
															>
																<Undo2 className="size-3.5" />
															</Button>
														)}
													</div>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>

							{/* Pagination */}
							{pagination && pagination.totalPages > 1 && (
								<div className="flex items-center justify-between border-t px-6 py-3">
									<span className="text-xs text-muted-foreground">
										Showing {entries.length} of {pagination.total} entries
									</span>
									<div className="flex items-center gap-2">
										<span className="text-xs text-muted-foreground">
											Page {pagination.page} of {pagination.totalPages}
										</span>
										<Button
											variant="outline"
											size="icon"
											className="size-7"
											disabled={pagination.page <= 1}
											onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
										>
											<ChevronLeft className="size-3.5" />
										</Button>
										<Button
											variant="outline"
											size="icon"
											className="size-7"
											disabled={pagination.page >= pagination.totalPages}
											onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
										>
											<ChevronRight className="size-3.5" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Create / Edit Dialog */}
			{createOpen && (
				<JournalFormDialog
					open
					onOpenChange={(v) => {
						if (!v) {
							setCreateOpen(false);
							setEditEntry(null);
						}
					}}
					editEntry={editEntry}
					accounts={accounts}
				/>
			)}

			{/* View Detail Dialog */}
			{viewId && (
				<ViewJournalDialog
					open
					onOpenChange={(v) => { if (!v) setViewId(null); }}
					journalId={viewId}
					accounts={accounts}
				/>
			)}

			{/* CSV Import Dialog */}
			{importOpen && (
				<ImportJournalsDialog
					open
					onOpenChange={(v) => { if (!v) setImportOpen(false); }}
				/>
			)}
		</div>
	);
}
