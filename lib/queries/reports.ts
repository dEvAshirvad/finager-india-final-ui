import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

const BASE = "/api/v1/accounting/reports";

// ──────────────────────────────────────────────
// Envelope
// ──────────────────────────────────────────────

function unwrap<T>(raw: unknown): T {
	const envelope = raw as { success?: boolean; data?: T };
	if (envelope && typeof envelope === "object" && "data" in envelope) {
		return envelope.data as T;
	}
	return raw as T;
}

// ──────────────────────────────────────────────
// Trial Balance
// ──────────────────────────────────────────────

export type TrialBalanceAccount = {
	accountId: string;
	accountCode: string;
	accountName: string;
	accountType: string;
	debitBalance: number;
	creditBalance: number;
};

export type TrialBalanceData = {
	message?: string;
	asOf: string;
	accounts: TrialBalanceAccount[];
	totalDebits: number;
	totalCredits: number;
	isBalanced: boolean;
	difference?: number;
};

export type TrialBalanceParams = { asOfDate?: string };

async function fetchTrialBalance(params?: TrialBalanceParams): Promise<TrialBalanceData> {
	const { data } = await api.get(`${BASE}/trial-balance`, { params });
	return unwrap<TrialBalanceData>(data);
}

// ──────────────────────────────────────────────
// Balance Sheet
// ──────────────────────────────────────────────

export type AccountBalance = {
	accountId: string;
	accountCode: string;
	accountName: string;
	accountType: string;
	balance: number;
	parentCode?: string | null;
	children?: AccountBalance[];
};

export type BalanceSheetSection = {
	type: string;
	label: string;
	accounts: AccountBalance[];
	total: number;
};

export type BalanceSheetData = {
	message?: string;
	asOf: string;
	assets: BalanceSheetSection;
	liabilities: BalanceSheetSection;
	equity: BalanceSheetSection;
	netIncome: number;
	totalLiabilitiesAndEquity: number;
	isBalanced: boolean;
	difference?: number;
};

export type BalanceSheetParams = { asOfDate?: string };

async function fetchBalanceSheet(params?: BalanceSheetParams): Promise<BalanceSheetData> {
	const { data } = await api.get(`${BASE}/balance-sheet`, { params });
	return unwrap<BalanceSheetData>(data);
}

// ──────────────────────────────────────────────
// Inventory Valuation
// ──────────────────────────────────────────────

export type InventoryValuationRow = {
	accountId: string;
	code: string;
	name: string;
	balance: number;
};

export type InventoryValuationData = {
	asOfDate: string;
	rows: InventoryValuationRow[];
	totalValue: number;
};

export type InventoryValuationParams = {
	asOfDate?: string;
	inventoryParentCode?: string;
};

async function fetchInventoryValuation(
	params?: InventoryValuationParams,
): Promise<InventoryValuationData> {
	const { data } = await api.get(`${BASE}/inventory-valuation`, { params });
	return unwrap<InventoryValuationData>(data);
}

// ──────────────────────────────────────────────
// Net Income
// ──────────────────────────────────────────────

export type NetIncomeData = {
	message?: string;
	period: { from: string; to: string };
	revenue: number;
	expenses: number;
	netIncome: number;
};

export type NetIncomeParams = { periodFrom: string; periodTo: string };

async function fetchNetIncome(params: NetIncomeParams): Promise<NetIncomeData> {
	const { data } = await api.get(`${BASE}/net-income`, { params });
	return unwrap<NetIncomeData>(data);
}

// ──────────────────────────────────────────────
// GST Summary
// ──────────────────────────────────────────────

export type GstTable31Item = {
	description?: string;
	taxableValue: number;
	tax: number;
};

export type GstTable4Item = {
	description?: string;
	totalITCAvailable?: number;
	amount?: number;
	itcReversals?: number;
	netITC?: number;
	ineligibleITC?: number;
};

export type GstSummaryData = {
	periodFrom: string;
	periodTo: string;
	table31: Record<string, GstTable31Item>;
	table4: Record<string, GstTable4Item>;
	note?: string;
};

export type GstSummaryParams = { periodFrom: string; periodTo: string };

async function fetchGstSummary(params: GstSummaryParams): Promise<GstSummaryData> {
	const { data } = await api.get(`${BASE}/gst-summary`, { params });
	return unwrap<GstSummaryData>(data);
}

// ──────────────────────────────────────────────
// P&L (Profit & Loss)
// ──────────────────────────────────────────────

export type PnLLineItemConfig = { label: string; accountCodes: string[] };

export type PnLConfig = {
	revenue?: PnLLineItemConfig[];
	cogs?: PnLLineItemConfig[];
	operatingExpenses?: PnLLineItemConfig[];
	otherIncome?: PnLLineItemConfig[];
	otherExpenses?: PnLLineItemConfig[];
};

export type PnLAccountAmount = { code: string; name: string; amount: number };

export type PnLLineItem = {
	label: string;
	accountCodes?: string[];
	accountIds?: string[];
	amount: number;
	accounts?: PnLAccountAmount[];
};

export type PnLSection = {
	label: string;
	lineItems: PnLLineItem[];
	total: number;
};

export type PnLData = {
	periodFrom?: string;
	periodTo?: string;
	period?: { from: string; to: string };
	revenue: PnLSection;
	cogs: PnLSection;
	grossProfit: number;
	operatingExpenses: PnLSection;
	operatingIncome: number;
	otherIncome: PnLSection;
	otherExpenses: PnLSection;
	netIncome: number;
	usedDefaultConfig: boolean;
};

export type PnLBody = {
	periodFrom: string;
	periodTo: string;
	config?: PnLConfig;
};

async function fetchProfitLoss(body: PnLBody): Promise<PnLData> {
	const { data } = await api.post(`${BASE}/profit-loss`, body);
	return unwrap<PnLData>(data);
}

// ──────────────────────────────────────────────
// Cash Flow
// ──────────────────────────────────────────────

export type CashFlowLineItemConfig = {
	label: string;
	accountCodes: string[];
	sign?: "positive" | "negative";
};

export type CashFlowConfig = {
	operating?: CashFlowLineItemConfig[];
	investing?: CashFlowLineItemConfig[];
	financing?: CashFlowLineItemConfig[];
};

export type CashFlowItemDetail = {
	accountId: string;
	accountCode: string;
	accountName: string;
	accountType: string;
	amount: number;
	description?: string;
	date?: string;
	reference?: string;
};

export type CashFlowLineItem = {
	label: string;
	accountCodes?: string[];
	amount: number;
	accounts?: { code: string; name: string; amount: number }[];
};

export type CashFlowSection = {
	label: string;
	lineItems: CashFlowLineItem[];
	items?: CashFlowItemDetail[];
	total: number;
};

export type CashFlowData = {
	message?: string;
	period?: { from: string; to: string };
	periodFrom?: string;
	periodTo?: string;
	openingCashBalance: number;
	operating: CashFlowSection;
	investing: CashFlowSection;
	financing: CashFlowSection;
	netCashFlow: number;
	closingCashBalance: number;
	usedDefaultConfig: boolean;
};

export type CashFlowBody = {
	periodFrom: string;
	periodTo: string;
	config?: CashFlowConfig;
};

async function fetchCashFlow(body: CashFlowBody): Promise<CashFlowData> {
	const { data } = await api.post(`${BASE}/cash-flow`, body);
	return unwrap<CashFlowData>(data);
}

// ──────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────

export const reportKeys = {
	all: ["accounting", "reports"] as const,
	trialBalance: (params?: TrialBalanceParams) =>
		[...reportKeys.all, "trial-balance", params] as const,
	balanceSheet: (params?: BalanceSheetParams) =>
		[...reportKeys.all, "balance-sheet", params] as const,
	inventoryValuation: (params?: InventoryValuationParams) =>
		[...reportKeys.all, "inventory-valuation", params] as const,
	gstSummary: (params: GstSummaryParams) =>
		[...reportKeys.all, "gst-summary", params] as const,
	netIncome: (params: NetIncomeParams) =>
		[...reportKeys.all, "net-income", params] as const,
	profitLoss: (body: PnLBody) => [...reportKeys.all, "profit-loss", body] as const,
	cashFlow: (body: CashFlowBody) => [...reportKeys.all, "cash-flow", body] as const,
};

// ──────────────────────────────────────────────
// React Query hooks
// ──────────────────────────────────────────────

export function useTrialBalance(params?: TrialBalanceParams) {
	return useQuery({
		queryKey: reportKeys.trialBalance(params),
		queryFn: () => fetchTrialBalance(params),
	});
}

export function useBalanceSheet(params?: BalanceSheetParams) {
	return useQuery({
		queryKey: reportKeys.balanceSheet(params),
		queryFn: () => fetchBalanceSheet(params),
	});
}

export function useInventoryValuation(params?: InventoryValuationParams) {
	return useQuery({
		queryKey: reportKeys.inventoryValuation(params),
		queryFn: () => fetchInventoryValuation(params),
	});
}

export function useGstSummary(params: GstSummaryParams | null) {
	return useQuery({
		queryKey: reportKeys.gstSummary(params!),
		queryFn: () => fetchGstSummary(params!),
		enabled: !!params?.periodFrom && !!params?.periodTo,
	});
}

export function useNetIncome(params: NetIncomeParams | null) {
	return useQuery({
		queryKey: reportKeys.netIncome(params!),
		queryFn: () => fetchNetIncome(params!),
		enabled: !!params?.periodFrom && !!params?.periodTo,
	});
}

export function useProfitLossMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: fetchProfitLoss,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: reportKeys.all });
		},
	});
}

export function useCashFlowMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: fetchCashFlow,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: reportKeys.all });
		},
	});
}
