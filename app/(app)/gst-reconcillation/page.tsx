"use client";

import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
	useGstReconciliationMutation,
	type GstReconciliationData,
} from "@/lib/queries/reports";

const CSV_ACCEPT = ".csv,text/csv,application/vnd.ms-excel";
const MAX_CSV_SIZE_MB = 5;

export default function GstReconcillationPage() {
	const [file, setFile] = useState<File | null>(null);
	const [periodFrom, setPeriodFrom] = useState("");
	const [periodTo, setPeriodTo] = useState("");
	const [toleranceAmount, setToleranceAmount] = useState("1.0");
	const [toleranceDateDays, setToleranceDateDays] = useState("3");
	const [result, setResult] = useState<GstReconciliationData | null>(null);

	const fileRef = useRef<HTMLInputElement>(null);
	const reconMut = useGstReconciliationMutation();

	const summary = result?.summary ?? null;
	const buckets = result?.buckets ?? null;

	const totalIssues = useMemo(() => {
		if (!buckets) return 0;
		return (
			buckets.amountMismatch.length +
			buckets.dateMismatch.length +
			buckets.missingInBooks.length +
			buckets.missingInGstr2b.length
		);
	}, [buckets]);

	async function handleRun() {
		if (!file) {
			toast.error("Select a GSTR-2B CSV file.");
			return;
		}
		if (file.size > MAX_CSV_SIZE_MB * 1024 * 1024) {
			toast.error(`File must be under ${MAX_CSV_SIZE_MB}MB.`);
			return;
		}
		if (!periodFrom || !periodTo) {
			toast.error("Select period from & to.");
			return;
		}

		const tolAmt = Number(toleranceAmount || "1");
		const tolDays = Number(toleranceDateDays || "3");

		try {
			const data = await reconMut.mutateAsync({
				file,
				periodFrom,
				periodTo,
				toleranceAmount: Number.isFinite(tolAmt) ? tolAmt : undefined,
				toleranceDateDays: Number.isFinite(tolDays) ? tolDays : undefined,
			});
			setResult(data);
			toast.success("GST reconciliation completed.");
		} catch (err: unknown) {
			let message = "Failed to run GST reconciliation.";
			if (err && typeof err === "object" && "response" in err) {
				const res = (err as { response?: { data?: { message?: string } } })
					.response;
				if (res?.data?.message) message = res.data.message;
			}
			toast.error(message);
		}
	}

	function handleClearFile() {
		setFile(null);
		setResult(null);
		if (fileRef.current) fileRef.current.value = "";
	}

	return (
		<div className="flex flex-col h-full">
			<DashboardPageHeader title="GST Reconciliation" />
			<div className="flex-1 flex flex-col min-h-0 px-6 py-6 gap-4">
				<div className="rounded-lg border bg-card p-4 space-y-4">
					<p className="text-sm text-muted-foreground">
						Upload your GSTR-2B B2B CSV and reconcile it against ITC booked in
						your books (posted journal entries). The engine will classify
						invoices into matched, mismatches, and missing buckets.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground">
								GSTR-2B CSV
							</label>
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
										onClick={handleClearFile}>
										Clear
									</Button>
								)}
							</div>
							<p className="text-[11px] text-muted-foreground">
								Max {MAX_CSV_SIZE_MB}MB. Use the GSTR-2B B2B export from GSTN.
							</p>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground">
								Period from
							</label>
							<Input
								type="date"
								value={periodFrom}
								onChange={(e) => setPeriodFrom(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground">
								Period to
							</label>
							<Input
								type="date"
								value={periodTo}
								onChange={(e) => setPeriodTo(e.target.value)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground">
								Amount tolerance (₹)
							</label>
							<Input
								type="number"
								min={0}
								step="0.01"
								value={toleranceAmount}
								onChange={(e) => setToleranceAmount(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground">
								Date tolerance (days)
							</label>
							<Input
								type="number"
								min={0}
								step="1"
								value={toleranceDateDays}
								onChange={(e) => setToleranceDateDays(e.target.value)}
							/>
						</div>
						<div className="flex items-end justify-start">
							<Button
								type="button"
								size="sm"
								onClick={handleRun}
								disabled={reconMut.isPending}>
								{reconMut.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<>
										<Upload className="size-4" />
										Run reconciliation
									</>
								)}
							</Button>
						</div>
					</div>
				</div>

				<div className="flex-1 rounded-lg border bg-card overflow-hidden min-h-0 flex flex-col">
					{reconMut.isPending && !result ? (
						<div className="p-6 space-y-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : !result ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<p className="text-sm text-muted-foreground">
								Run a GST reconciliation to see matches and mismatches between
								GSTR-2B and your books.
							</p>
						</div>
					) : (
						<>
							<div className="border-b px-6 py-3 flex flex-wrap items-center gap-3">
								<div className="space-y-1">
									<p className="text-xs text-muted-foreground">Period</p>
									<p className="text-sm font-medium">
										{new Date(result.period.from).toLocaleDateString("en-IN")} –{" "}
										{new Date(result.period.to).toLocaleDateString("en-IN")}
									</p>
								</div>
								<div className="h-8 w-px bg-border" />
								<div className="space-y-1">
									<p className="text-xs text-muted-foreground">
										GSTR-2B ITC vs Books
									</p>
									<p className="text-sm font-medium">
										₹{summary?.gstr2bItc.toFixed(2)} vs ₹
										{summary?.booksItc.toFixed(2)} (Δ{" "}
										{summary?.difference.toFixed(2)})
									</p>
								</div>
								<div className="h-8 w-px bg-border" />
								<div className="flex items-center gap-2">
									<Badge
										variant="outline"
										className="gap-1 text-xs border-emerald-500/40 text-emerald-700 bg-emerald-50">
										<CheckCircle2 className="size-3" />
										Matched {summary?.matchedCount ?? 0}
									</Badge>
									{totalIssues > 0 && (
										<Badge
											variant="outline"
											className="gap-1 text-xs border-amber-500/40 text-amber-700 bg-amber-50">
											<AlertCircle className="size-3" />
											Issues {totalIssues}
										</Badge>
									)}
								</div>
							</div>

							<div className="flex-1 overflow-auto px-4 py-4 space-y-6">
								{buckets && (
									<>
										<GstReconBucketTable
											title="Missing in books (present in GSTR-2B)"
											rows={buckets.missingInBooks}
											variant="destructive"
										/>
										<GstReconBucketTable
											title="Missing in GSTR-2B (present in books)"
											rows={buckets.missingInGstr2b}
											variant="warning"
										/>
										<GstReconBucketTable
											title="Amount mismatches"
											rows={buckets.amountMismatch}
											variant="warning"
										/>
										<GstReconBucketTable
											title="Date mismatches"
											rows={buckets.dateMismatch}
											variant="warning"
										/>
										<GstReconBucketTable
											title="Matched invoices"
											rows={buckets.matched}
											variant="default"
										/>
									</>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function GstReconBucketTable({
	title,
	rows,
	variant,
}: {
	title: string;
	rows: {
		gstin: string;
		invoiceNumber: string;
		invoiceDate: string;
		gstr2b?: unknown;
		books?: unknown;
	}[];
	variant: "default" | "warning" | "destructive";
}) {
	if (!rows || rows.length === 0) return null;

	const badgeClass =
		variant === "destructive"
			? "border-destructive/40 text-destructive bg-destructive/10"
			: variant === "warning"
				? "border-amber-500/40 text-amber-700 bg-amber-50"
				: "border-emerald-500/40 text-emerald-700 bg-emerald-50";

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<p className="text-sm font-medium">{title}</p>
				<Badge variant="outline" className={`text-[11px] ${badgeClass}`}>
					{rows.length} row{rows.length === 1 ? "" : "s"}
				</Badge>
			</div>
			<div className="rounded-md border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="text-xs">GSTIN</TableHead>
							<TableHead className="text-xs">Invoice</TableHead>
							<TableHead className="text-xs">Invoice date</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row, i) => (
							<TableRow key={i}>
								<TableCell className="text-xs font-mono">{row.gstin}</TableCell>
								<TableCell className="text-xs font-mono">
									{row.invoiceNumber}
								</TableCell>
								<TableCell className="text-xs text-muted-foreground">
									{row.invoiceDate}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
