"use client";

import { useState } from "react";
import {
	LayoutGrid,
	Scale,
	Package,
	FileText,
	TrendingUp,
	Wallet,
	Loader2,
	Play,
	PieChart,
} from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
	useTrialBalance,
	useBalanceSheet,
	useInventoryValuation,
	useGstSummary,
	useNetIncome,
	useProfitLossMutation,
	useCashFlowMutation,
	type TrialBalanceData,
	type BalanceSheetData,
	type InventoryValuationData,
	type GstSummaryData,
	type PnLData,
	type CashFlowData,
	type CashFlowItemDetail,
} from "@/lib/queries/reports";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatCurrency(amount: number | undefined) {
	if (amount === undefined || amount === null) return "₹0.00";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
	}).format(amount);
}

// ──────────────────────────────────────────────
// Zoho-style report layout (centered header + two-column table)
// ──────────────────────────────────────────────

function ReportHeader({
	title,
	subtitle,
	dateRange,
}: {
	title: string;
	subtitle?: string;
	dateRange: string;
}) {
	return (
		<div className="text-center space-y-1 pb-8 border-b border-border/60">
			<p className="text-sm text-muted-foreground font-medium">
				Financial Report
			</p>
			<h2 className="text-xl font-bold tracking-tight">{title}</h2>
			{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
			<p className="text-sm text-muted-foreground">{dateRange}</p>
		</div>
	);
}

function ReportTableHeader({
	left = "ACCOUNT",
	right = "TOTAL",
}: {
	left?: string;
	right?: string;
}) {
	return (
		<div className="grid grid-cols-[1fr_auto] gap-4 py-3 px-1 border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			<span>{left}</span>
			<span className="text-right min-w-[120px]">{right}</span>
		</div>
	);
}

function ReportRow({
	label,
	amount,
	indent = 0,
	bold = false,
}: {
	label: string;
	amount: string;
	indent?: 0 | 1 | 2;
	bold?: boolean;
}) {
	return (
		<div
			className={cn(
				"grid grid-cols-[1fr_auto] gap-4 py-2 px-1 border-b border-border/40 items-center",
				bold && "font-semibold",
			)}
			style={{ paddingLeft: indent ? `${indent * 16 + 4}px` : undefined }}>
			<span className="text-sm">{label}</span>
			<span className="text-sm font-mono text-right tabular-nums min-w-[120px]">
				{amount}
			</span>
		</div>
	);
}

function ReportSectionTitle({ title }: { title: string }) {
	return (
		<div className="pt-6 pb-2">
			<h3 className="text-sm font-bold tracking-tight">{title}</h3>
		</div>
	);
}

// ──────────────────────────────────────────────
// Report blocks
// ──────────────────────────────────────────────

function TrialBalanceReport({ asOfDate }: { asOfDate?: string }) {
	const { data, isLoading, error } = useTrialBalance(
		asOfDate ? { asOfDate: asOfDate + "T00:00:00.000Z" } : undefined,
	);
	if (isLoading) return <Skeleton className="h-64 w-full" />;
	if (error)
		return (
			<p className="text-sm text-destructive">Failed to load trial balance.</p>
		);
	if (!data) return null;
	const asOfDisplay = data.asOf
		? new Date(data.asOf).toLocaleDateString("en-IN")
		: "Latest";
	const balancedNote =
		data.isBalanced !== undefined ? (
			<span
				className={data.isBalanced ? " text-green-600" : " text-destructive"}>
				{data.isBalanced ? "Balanced" : "Not balanced"}
				{data.difference != null &&
					` (diff: ${formatCurrency(data.difference)})`}
			</span>
		) : null;
	return (
		<div className="space-y-0">
			<ReportHeader title="Trial Balance" dateRange={`As of ${asOfDisplay}`} />
			{balancedNote && (
				<p className="text-center text-sm pt-2">{balancedNote}</p>
			)}
			<div className="pt-6">
				<div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr] gap-4 py-3 px-1 border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					<span>Account</span>
					<span className="text-right">Debit</span>
					<span className="text-right">Credit</span>
				</div>
				{(data.accounts ?? []).map((r) => (
					<div
						key={r.accountId}
						className="grid grid-cols-[minmax(0,2fr)_1fr_1fr] gap-4 py-2.5 px-1 border-b border-border/40 items-center text-sm">
						<span>
							<span className="font-mono text-muted-foreground mr-2">
								{r.accountCode}
							</span>
							{r.accountName}
							<span className="text-muted-foreground ml-1 text-xs">
								({r.accountType})
							</span>
						</span>
						<span className="text-right font-mono tabular-nums">
							{r.debitBalance !== 0 ? formatCurrency(r.debitBalance) : "—"}
						</span>
						<span className="text-right font-mono tabular-nums">
							{r.creditBalance !== 0 ? formatCurrency(r.creditBalance) : "—"}
						</span>
					</div>
				))}
				<div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr] gap-4 py-3 px-1 mt-2 border-t-2 border-border font-semibold text-sm">
					<span>Total</span>
					<span className="text-right font-mono tabular-nums">
						{formatCurrency(data.totalDebits)}
					</span>
					<span className="text-right font-mono tabular-nums">
						{formatCurrency(data.totalCredits)}
					</span>
				</div>
			</div>
		</div>
	);
}

function BalanceSheetReport({ asOfDate }: { asOfDate?: string }) {
	const { data, isLoading, error } = useBalanceSheet(
		asOfDate ? { asOfDate: asOfDate + "T00:00:00.000Z" } : undefined,
	);
	if (isLoading) return <Skeleton className="h-64 w-full" />;
	if (error)
		return (
			<p className="text-sm text-destructive">Failed to load balance sheet.</p>
		);
	if (!data) return null;
	const asOfDisplay = data.asOf
		? new Date(data.asOf).toLocaleDateString("en-IN")
		: "Latest";
	const balancedNote = data.isBalanced !== undefined && (
		<span
			className={cn(
				data.isBalanced ? " text-green-600" : " text-destructive",
				"text-sm capitalize",
			)}>
			{data.isBalanced ? "Balanced" : "Not balanced"}
			{data.difference != null && ` (diff: ${formatCurrency(data.difference)})`}
		</span>
	);
	const sections = [
		{ ...data.assets, title: "Assets" },
		{ ...data.liabilities, title: "Liabilities" },
		{ ...data.equity, title: "Equity" },
	] as const;
	return (
		<div className="space-y-0">
			<ReportHeader title="Balance Sheet" dateRange={`As of ${asOfDisplay}`} />
			{balancedNote && (
				<p className="text-center text-sm pt-2">{balancedNote}</p>
			)}
			<div className="pt-6 space-y-4">
				{sections.map((sec) => (
					<div key={sec.type}>
						<ReportSectionTitle title={sec.label} />
						<ReportTableHeader left="Account" right="Total" />
						{(sec.accounts ?? []).map((a) => (
							<ReportRow
								key={a.accountId}
								label={`${a.accountCode} ${a.accountName}`}
								amount={formatCurrency(a.balance)}
								indent={1}
							/>
						))}
						<ReportRow
							label={`Total for ${sec.label}`}
							amount={formatCurrency(sec.total)}
							bold
						/>
					</div>
				))}
				<div className="pt-4 space-y-1">
					<ReportRow
						label="Net Income"
						amount={formatCurrency(data.netIncome)}
						bold
					/>
					<ReportRow
						label="Total Liabilities and Equity"
						amount={formatCurrency(data.totalLiabilitiesAndEquity)}
						bold
					/>
				</div>
			</div>
		</div>
	);
}

function InventoryValuationReport({
	asOfDate,
	inventoryParentCode,
}: {
	asOfDate?: string;
	inventoryParentCode?: string;
}) {
	const { data, isLoading, error } = useInventoryValuation({
		...(asOfDate && { asOfDate: asOfDate + "T00:00:00.000Z" }),
		...(inventoryParentCode?.trim() && {
			inventoryParentCode: inventoryParentCode.trim(),
		}),
	});
	if (isLoading) return <Skeleton className="h-64 w-full" />;
	if (error)
		return (
			<p className="text-sm text-destructive">
				Failed to load inventory valuation.
			</p>
		);
	if (!data) return null;
	const asOfDisplay = data.asOfDate
		? new Date(data.asOfDate).toLocaleDateString("en-IN")
		: "Latest";
	return (
		<div className="space-y-0">
			<ReportHeader
				title="Inventory Valuation"
				dateRange={`As of ${asOfDisplay}`}
			/>
			<div className="pt-6">
				<ReportTableHeader left="Account" right="Balance" />
				{data.rows.map((r) => (
					<ReportRow
						key={r.accountId}
						label={`${r.code} ${r.name}`}
						amount={formatCurrency(r.balance)}
						indent={1}
					/>
				))}
				<ReportRow
					label="Total Value"
					amount={formatCurrency(data.totalValue)}
					bold
				/>
			</div>
		</div>
	);
}

function NetIncomeReport({
	periodFrom,
	periodTo,
}: {
	periodFrom: string;
	periodTo: string;
}) {
	const params = periodFrom && periodTo ? { periodFrom, periodTo } : null;
	const { data, isLoading, error } = useNetIncome(params);
	if (!params)
		return (
			<p className="text-sm text-muted-foreground">Set period From and To.</p>
		);
	if (isLoading) return <Skeleton className="h-32 w-full" />;
	if (error)
		return (
			<p className="text-sm text-destructive">
				Failed to load net income report.
			</p>
		);
	if (!data) return null;
	const fromStr = data.period?.from
		? new Date(data.period.from).toLocaleDateString("en-IN")
		: periodFrom;
	const toStr = data.period?.to
		? new Date(data.period.to).toLocaleDateString("en-IN")
		: periodTo;
	return (
		<div className="space-y-0">
			<ReportHeader
				title="Net Income"
				dateRange={`From ${fromStr} To ${toStr}`}
			/>
			<div className="pt-6 max-w-md mx-auto">
				<ReportTableHeader left="Account" right="Total" />
				<ReportRow label="Revenue" amount={formatCurrency(data.revenue)} />
				<ReportRow label="Expenses" amount={formatCurrency(data.expenses)} />
				<ReportRow
					label="Net Income"
					amount={formatCurrency(data.netIncome)}
					bold
				/>
			</div>
		</div>
	);
}

function GstSummaryReport({
	periodFrom,
	periodTo,
}: {
	periodFrom: string;
	periodTo: string;
}) {
	const params = periodFrom && periodTo ? { periodFrom, periodTo } : null;
	const { data, isLoading, error } = useGstSummary(params);
	if (!params)
		return (
			<p className="text-sm text-muted-foreground">
				Set period From and To, then run.
			</p>
		);
	if (isLoading) return <Skeleton className="h-64 w-full" />;
	if (error)
		return (
			<p className="text-sm text-destructive">Failed to load GST summary.</p>
		);
	if (!data) return null;
	const table31Entries = data.table31 ? Object.entries(data.table31) : [];
	const table4Entries = data.table4 ? Object.entries(data.table4) : [];
	const dateRange = `From ${data.periodFrom} To ${data.periodTo}`;
	return (
		<div className="space-y-0">
			<ReportHeader title="GSTR-3B Summary" dateRange={dateRange} />
			{data.note && (
				<p className="text-center text-xs text-muted-foreground pt-2 max-w-xl mx-auto">
					{data.note}
				</p>
			)}
			<div className="pt-8 space-y-8">
				<div>
					<h3 className="text-sm font-bold tracking-tight mb-3">
						Table 3.1 – Outward supplies
					</h3>
					<div className="rounded-lg overflow-hidden border border-border">
						<Table>
							<TableHeader>
								<TableRow className="bg-blue-50 hover:bg-blue-50/80">
									<TableHead className="text-[11px] uppercase text-muted-foreground font-medium">
										Item
									</TableHead>
									<TableHead className="text-[11px] uppercase text-muted-foreground font-medium">
										Description
									</TableHead>
									<TableHead className="text-right text-[11px] uppercase text-muted-foreground font-medium">
										Taxable Value
									</TableHead>
									<TableHead className="text-right text-[11px] uppercase text-muted-foreground font-medium">
										Tax
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{table31Entries.map(([key, row]) => (
									<TableRow key={key} className="border-border/60">
										<TableCell className="font-mono text-xs">{key}</TableCell>
										<TableCell className="text-xs">
											{row.description ?? "—"}
										</TableCell>
										<TableCell className="text-right font-mono text-sm tabular-nums">
											{formatCurrency(row.taxableValue)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm tabular-nums">
											{formatCurrency(row.tax)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
				<div>
					<h3 className="text-sm font-bold tracking-tight mb-3">
						Table 4 – Eligible ITC
					</h3>
					<div className="rounded-lg overflow-hidden border border-border">
						<Table>
							<TableHeader>
								<TableRow className="bg-amber-50/80 hover:bg-amber-50/80">
									<TableHead className="text-[11px] uppercase text-muted-foreground font-medium">
										Item
									</TableHead>
									<TableHead className="text-[11px] uppercase text-muted-foreground font-medium">
										Description
									</TableHead>
									<TableHead className="text-right text-[11px] uppercase text-muted-foreground font-medium">
										Amount
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{table4Entries.map(([key, row]) => (
									<TableRow key={key} className="border-border/60">
										<TableCell className="font-mono text-xs">{key}</TableCell>
										<TableCell className="text-xs">
											{row.description ??
												(row.totalITCAvailable !== undefined &&
													"Total ITC Available") ??
												(row.itcReversals !== undefined && "ITC Reversals") ??
												(row.netITC !== undefined && "Net ITC") ??
												(row.ineligibleITC !== undefined && "Ineligible ITC") ??
												"—"}
										</TableCell>
										<TableCell className="text-right font-mono text-sm tabular-nums">
											{formatCurrency(
												row.amount ??
													row.totalITCAvailable ??
													row.itcReversals ??
													row.netITC ??
													row.ineligibleITC ??
													0,
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			</div>
		</div>
	);
}

function formatReportPeriod(data: PnLData) {
	if (data.period?.from && data.period?.to) {
		return `${new Date(data.period.from).toLocaleDateString("en-IN")} to ${new Date(data.period.to).toLocaleDateString("en-IN")}`;
	}
	if (data.periodFrom && data.periodTo)
		return `${data.periodFrom} to ${data.periodTo}`;
	return "";
}

function PnLReportResult({ data }: { data: PnLData }) {
	const periodStr = formatReportPeriod(data);
	const subtitle = data.usedDefaultConfig ? "Basis: Default config" : undefined;
	return (
		<div className="space-y-0">
			<ReportHeader
				title="Profit and Loss"
				subtitle={subtitle}
				dateRange={periodStr}
			/>
			<div className="pt-6 space-y-1">
				<ReportSectionTitle title={data.revenue.label} />
				<ReportTableHeader />
				{(data.revenue.lineItems ?? []).map((item, i) => (
					<div key={i}>
						<ReportRow
							label={item.label}
							amount={formatCurrency(item.amount)}
							indent={1}
						/>
						{item.accounts?.map((a, j) => (
							<ReportRow
								key={j}
								label={`${a.code} ${a.name}`}
								amount={formatCurrency(a.amount)}
								indent={2}
							/>
						))}
					</div>
				))}
				<ReportRow
					label={`Total for ${data.revenue.label}`}
					amount={formatCurrency(data.revenue.total)}
					bold
				/>

				<ReportSectionTitle title={data.cogs.label} />
				<ReportTableHeader />
				{(data.cogs.lineItems ?? []).map((item, i) => (
					<div key={i}>
						<ReportRow
							label={item.label}
							amount={formatCurrency(item.amount)}
							indent={1}
						/>
						{item.accounts?.map((a, j) => (
							<ReportRow
								key={j}
								label={`${a.code} ${a.name}`}
								amount={formatCurrency(a.amount)}
								indent={2}
							/>
						))}
					</div>
				))}
				<ReportRow
					label={`Total for ${data.cogs.label}`}
					amount={formatCurrency(data.cogs.total)}
					bold
				/>

				<ReportRow
					label="Gross Profit"
					amount={formatCurrency(data.grossProfit)}
					bold
				/>

				<ReportSectionTitle title="Operating Expenses" />
				<ReportTableHeader />
				{(data.operatingExpenses.lineItems ?? []).map((item, i) => (
					<div key={i}>
						<ReportRow
							label={item.label}
							amount={formatCurrency(item.amount)}
							indent={1}
						/>
						{item.accounts?.map((a, j) => (
							<ReportRow
								key={j}
								label={`${a.code} ${a.name}`}
								amount={formatCurrency(a.amount)}
								indent={2}
							/>
						))}
					</div>
				))}
				<ReportRow
					label="Total for Operating Expenses"
					amount={formatCurrency(data.operatingExpenses.total)}
					bold
				/>

				<ReportRow
					label="Operating Profit"
					amount={formatCurrency(data.operatingIncome)}
					bold
				/>

				<ReportSectionTitle title="Non Operating Income" />
				<ReportTableHeader />
				<ReportRow
					label="Other Income"
					amount={formatCurrency(data.otherIncome.total)}
					indent={1}
				/>

				<ReportSectionTitle title="Non Operating Expenses" />
				<ReportTableHeader />
				<ReportRow
					label="Other Expenses"
					amount={formatCurrency(data.otherExpenses.total)}
					indent={1}
				/>

				<div className="pt-4 border-t-2 border-border">
					<ReportRow
						label="Net Income"
						amount={formatCurrency(data.netIncome)}
						bold
					/>
				</div>
			</div>
		</div>
	);
}

function CashFlowItemsTable({ items }: { items: CashFlowItemDetail[] }) {
	if (!items?.length) return null;
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-24">Date</TableHead>
					<TableHead className="w-28">Reference</TableHead>
					<TableHead>Account</TableHead>
					<TableHead>Description</TableHead>
					<TableHead className="text-right">Amount</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((item, i) => (
					<TableRow key={i}>
						<TableCell className="text-xs">
							{item.date
								? new Date(item.date).toLocaleDateString("en-IN")
								: "—"}
						</TableCell>
						<TableCell className="font-mono text-xs">
							{item.reference ?? "—"}
						</TableCell>
						<TableCell className="text-xs">
							<span className="font-mono text-muted-foreground">
								{item.accountCode}
							</span>{" "}
							{item.accountName}
						</TableCell>
						<TableCell
							className="text-xs max-w-[200px] truncate"
							title={item.description}>
							{item.description ?? "—"}
						</TableCell>
						<TableCell className="text-right font-mono text-xs">
							{formatCurrency(item.amount)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function CashFlowReportResult({ data }: { data: CashFlowData }) {
	const periodStr =
		data.period?.from && data.period?.to
			? `From ${new Date(data.period.from).toLocaleDateString("en-IN")} To ${new Date(data.period.to).toLocaleDateString("en-IN")}`
			: data.periodFrom && data.periodTo
				? `From ${data.periodFrom} To ${data.periodTo}`
				: "";
	const subtitle = data.usedDefaultConfig ? "Basis: Default config" : undefined;
	return (
		<div className="space-y-0">
			<ReportHeader
				title="Cash Flow Statement"
				subtitle={subtitle}
				dateRange={periodStr}
			/>
			<div className="pt-6 space-y-1">
				<ReportTableHeader left="Account" right="Total" />
				<ReportRow
					label="Beginning Cash Balance"
					amount={formatCurrency(data.openingCashBalance)}
					indent={0}
				/>

				<ReportSectionTitle title={data.operating.label} />
				{(data.operating.lineItems ?? []).map((item, i) => (
					<ReportRow
						key={i}
						label={item.label}
						amount={formatCurrency(item.amount)}
						indent={1}
					/>
				))}
				{data.operating.items?.length ? (
					<div className="pl-4 py-2 space-y-1">
						{data.operating.items.map((item, i) => (
							<ReportRow
								key={i}
								label={
									item.description ??
									`${item.accountName} (${item.reference ?? item.accountCode})`
								}
								amount={formatCurrency(item.amount)}
								indent={2}
							/>
						))}
					</div>
				) : null}
				<ReportRow
					label={`Net cash provided by Operating Activities`}
					amount={formatCurrency(data.operating.total)}
					bold
				/>

				<ReportSectionTitle title={data.investing.label} />
				{(data.investing.lineItems ?? []).map((item, i) => (
					<ReportRow
						key={i}
						label={item.label}
						amount={formatCurrency(item.amount)}
						indent={1}
					/>
				))}
				{data.investing.items?.length ? (
					<div className="pl-4 py-2 space-y-1">
						{data.investing.items.map((item, i) => (
							<ReportRow
								key={i}
								label={
									item.description ??
									`${item.accountName} (${item.reference ?? item.accountCode})`
								}
								amount={formatCurrency(item.amount)}
								indent={2}
							/>
						))}
					</div>
				) : null}
				<ReportRow
					label="Net cash provided by Investing Activities"
					amount={formatCurrency(data.investing.total)}
					bold
				/>

				<ReportSectionTitle title={data.financing.label} />
				{(data.financing.lineItems ?? []).map((item, i) => (
					<ReportRow
						key={i}
						label={item.label}
						amount={formatCurrency(item.amount)}
						indent={1}
					/>
				))}
				{data.financing.items?.length ? (
					<div className="pl-4 py-2 space-y-1">
						{data.financing.items.map((item, i) => (
							<ReportRow
								key={i}
								label={
									item.description ??
									`${item.accountName} (${item.reference ?? item.accountCode})`
								}
								amount={formatCurrency(item.amount)}
								indent={2}
							/>
						))}
					</div>
				) : null}
				<ReportRow
					label="Net cash provided by Financing Activities"
					amount={formatCurrency(data.financing.total)}
					bold
				/>

				<div className="pt-4 border-t-2 border-border">
					<ReportRow
						label="Net Change in Cash"
						amount={formatCurrency(data.netCashFlow)}
						bold
					/>
					<ReportRow
						label="Ending Cash Balance"
						amount={formatCurrency(data.closingCashBalance)}
						bold
					/>
				</div>
			</div>
		</div>
	);
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────

export default function ReportsPage() {
	const [tab, setTab] = useState("trial-balance");
	const [asOfDate, setAsOfDate] = useState("");
	const [inventoryParentCode, setInventoryParentCode] = useState("");
	const [periodFrom, setPeriodFrom] = useState(
		new Date(new Date().setMonth(new Date().getMonth() - 1))
			.toISOString()
			.split("T")[0],
	); // 1 month before today
	const [periodTo, setPeriodTo] = useState(
		new Date().toISOString().split("T")[0],
	); // today
	const [pnlResult, setPnlResult] = useState<PnLData | null>(null);
	const [cashFlowResult, setCashFlowResult] = useState<CashFlowData | null>(
		null,
	);

	const pnlMut = useProfitLossMutation();
	const cashFlowMut = useCashFlowMutation();

	async function runPnL() {
		if (!periodFrom || !periodTo) return;
		try {
			const data = await pnlMut.mutateAsync({ periodFrom, periodTo });
			setPnlResult(data);
		} catch {
			setPnlResult(null);
		}
	}

	async function runCashFlow() {
		if (!periodFrom || !periodTo) return;
		try {
			const data = await cashFlowMut.mutateAsync({ periodFrom, periodTo });
			setCashFlowResult(data);
		} catch {
			setCashFlowResult(null);
		}
	}

	return (
		<div className="min-h-full flex flex-col">
			<DashboardPageHeader title="reports" />

			<div className="p-6 flex-1 flex flex-col">
				<Tabs
					value={tab}
					onValueChange={setTab}
					className="flex-1 flex flex-col">
					<TabsList className="flex-wrap h-auto gap-1 mb-4">
						<TabsTrigger value="trial-balance" className="gap-1.5">
							<LayoutGrid className="size-3.5" /> Trial Balance
						</TabsTrigger>
						<TabsTrigger value="balance-sheet" className="gap-1.5">
							<Scale className="size-3.5" /> Balance Sheet
						</TabsTrigger>
						<TabsTrigger value="net-income" className="gap-1.5">
							<PieChart className="size-3.5" /> Net Income
						</TabsTrigger>
						<TabsTrigger value="inventory" className="gap-1.5">
							<Package className="size-3.5" /> Inventory
						</TabsTrigger>
						<TabsTrigger value="gst" className="gap-1.5">
							<FileText className="size-3.5" /> GST Summary
						</TabsTrigger>
						<TabsTrigger value="pnl" className="gap-1.5">
							<TrendingUp className="size-3.5" /> P&L
						</TabsTrigger>
						<TabsTrigger value="cash-flow" className="gap-1.5">
							<Wallet className="size-3.5" /> Cash Flow
						</TabsTrigger>
					</TabsList>

					<TabsContent value="trial-balance" className="mt-0 flex-1">
						<div className="flex flex-wrap items-center gap-4 mb-4 py-3 px-4 rounded-lg bg-muted/40 border border-border/60">
							<span className="text-sm font-medium text-muted-foreground">
								Filters:
							</span>
							<Input
								type="date"
								className="w-40 h-8 text-sm"
								value={asOfDate}
								onChange={(e) => setAsOfDate(e.target.value)}
							/>
						</div>
						<Card className="shadow-sm p-0">
							<CardContent className="p-8">
								<TrialBalanceReport asOfDate={asOfDate || undefined} />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="balance-sheet" className="mt-0 flex-1">
						<div className="flex flex-wrap items-center gap-4 mb-4 py-3 px-4 rounded-lg bg-muted/40 border border-border/60">
							<span className="text-sm font-medium text-muted-foreground">
								Filters:
							</span>
							<Input
								type="date"
								className="w-40 h-8 text-sm"
								value={asOfDate}
								onChange={(e) => setAsOfDate(e.target.value)}
							/>
						</div>
						<Card className="shadow-sm p-0">
							<CardContent className="p-8">
								<BalanceSheetReport asOfDate={asOfDate || undefined} />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="net-income" className="mt-0 flex-1">
						<div className="flex flex-wrap items-center gap-4 mb-4 py-3 px-4 rounded-lg bg-muted/40 border border-border/60">
							<span className="text-sm font-medium text-muted-foreground">
								Filters:
							</span>
							<Input
								type="date"
								className="w-40 h-8 text-sm"
								value={periodFrom}
								onChange={(e) => setPeriodFrom(e.target.value)}
							/>
							<Input
								type="date"
								className="w-40 h-8 text-sm"
								value={periodTo}
								onChange={(e) => setPeriodTo(e.target.value)}
							/>
						</div>
						<Card className="shadow-sm p-0">
							<CardContent className="p-8">
								<NetIncomeReport periodFrom={periodFrom} periodTo={periodTo} />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="inventory" className="mt-0 flex-1">
						<div className="flex flex-wrap items-center gap-4 mb-4 py-3 px-4 rounded-lg bg-muted/40 border border-border/60">
							<span className="text-sm font-medium text-muted-foreground">
								Filters:
							</span>
							<Input
								type="date"
								className="w-40 h-8 text-sm"
								value={asOfDate}
								onChange={(e) => setAsOfDate(e.target.value)}
							/>
							<Input
								className="w-36 h-8 text-sm font-mono"
								placeholder="Parent code (e.g. 1300)"
								value={inventoryParentCode}
								onChange={(e) => setInventoryParentCode(e.target.value)}
							/>
						</div>
						<Card className="shadow-sm p-0">
							<CardContent className="p-8">
								<InventoryValuationReport
									asOfDate={asOfDate || undefined}
									inventoryParentCode={inventoryParentCode || undefined}
								/>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="gst" className="mt-0 flex-1">
						<div className="flex flex-wrap items-center gap-4 mb-4 py-3 px-4 rounded-lg bg-muted/40 border border-border/60">
							<span className="text-sm font-medium text-muted-foreground">
								Filters:
							</span>
							<Input
								type="date"
								className="w-40 h-8 text-sm"
								value={periodFrom}
								onChange={(e) => setPeriodFrom(e.target.value)}
							/>
							<Input
								type="date"
								className="w-40 h-8 text-sm"
								value={periodTo}
								onChange={(e) => setPeriodTo(e.target.value)}
							/>
						</div>
						<Card className="shadow-sm p-0">
							<CardContent className="p-8">
								<GstSummaryReport periodFrom={periodFrom} periodTo={periodTo} />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="pnl" className="mt-0 flex-1">
						<div className="flex flex-wrap items-center gap-4 mb-4 py-3 px-4 rounded-lg bg-muted/40 border border-border/60">
							<span className="text-sm font-medium text-muted-foreground">
								Filters:
							</span>
							<Input
								type="date"
								className="w-40 h-8 text-sm"
								value={periodFrom}
								onChange={(e) => setPeriodFrom(e.target.value)}
							/>
							<Input
								type="date"
								className="w-40 h-8 text-sm"
								value={periodTo}
								onChange={(e) => setPeriodTo(e.target.value)}
							/>
							<Button
								size="sm"
								className="h-8"
								onClick={runPnL}
								disabled={!periodFrom || !periodTo || pnlMut.isPending}>
								{pnlMut.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<Play className="size-4" />
								)}
								Run Report
							</Button>
						</div>
						<Card className="shadow-sm p-0">
							<CardContent className="p-8">
								{pnlResult ? (
									<PnLReportResult data={pnlResult} />
								) : (
									<p className="text-sm text-muted-foreground py-8 text-center">
										Set period and click Run Report to generate P&L.
									</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="cash-flow" className="mt-0 flex-1">
						<div className="flex flex-wrap items-center gap-4 mb-4 py-3 px-4 rounded-lg bg-muted/40 border border-border/60">
							<span className="text-sm font-medium text-muted-foreground">
								Filters:
							</span>
							<Input
								type="date"
								className="w-40 h-8 text-sm"
								value={periodFrom}
								onChange={(e) => setPeriodFrom(e.target.value)}
							/>
							<Input
								type="date"
								className="w-40 h-8 text-sm"
								value={periodTo}
								onChange={(e) => setPeriodTo(e.target.value)}
							/>
							<Button
								size="sm"
								className="h-8"
								onClick={runCashFlow}
								disabled={!periodFrom || !periodTo || cashFlowMut.isPending}>
								{cashFlowMut.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<Play className="size-4" />
								)}
								Run Report
							</Button>
						</div>
						<Card className="shadow-sm p-0">
							<CardContent className="p-8">
								{cashFlowResult ? (
									<CashFlowReportResult data={cashFlowResult} />
								) : (
									<p className="text-sm text-muted-foreground py-8 text-center">
										Set period and click Run Report to generate Cash Flow.
									</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
