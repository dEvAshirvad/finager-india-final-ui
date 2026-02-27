import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

const BASE = "/api/v1/business/transactions/expenses";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ExpenseStatus =
	| "DRAFT"
	| "POSTED"
	| "PAID"
	| "PARTIAL"
	| "CANCELLED";

export type PaymentMode = "CASH" | "ONLINE" | "CREDIT";

export type ExpenseItem = {
	description?: string;
	amount: number;
	category?: string;
};

/** Base transaction + expense-specific fields per Expenses API. */
export type Expense = {
	_id: string;
	organizationId: string;
	type: string;
	reference: string;
	date: string;
	contactId: string;
	totalAmount: number;
	taxableAmount?: number;
	gstAmount?: number;
	status: ExpenseStatus;
	journalId?: string;
	placeOfSupply?: string;
	paymentDue?: string;
	narration?: string;
	autoPosting?: boolean;
	category?: string;
	expenseType?: string;
	paymentMode?: PaymentMode;
	items?: ExpenseItem[];
	receiptRef?: string;
	attachmentUrl?: string;
	createdBy?: string;
	updatedBy?: string;
	createdAt?: string;
	updatedAt?: string;
};

/** Minimal create: reference, date, contactId, totalAmount. When items[] is sent, server may set totalAmount from sum(items.amount) if omitted. */
export type CreateExpenseBody = {
	reference: string;
	date: string;
	contactId: string;
	/** Required when no items; when items present server can compute from sum(items.amount). */
	totalAmount?: number;
	category?: string;
	expenseType?: string;
	paymentMode?: PaymentMode;
	items?: Array<{ description?: string; amount: number; category?: string }>;
	receiptRef?: string;
	attachmentUrl?: string;
	placeOfSupply?: string;
	paymentDue?: string;
	narration?: string;
};

export type UpdateExpenseBody = Partial<{
	reference: string;
	date: string;
	contactId: string;
	totalAmount: number;
	category: string;
	expenseType: string;
	paymentMode: PaymentMode;
	items: ExpenseItem[];
	receiptRef: string;
	attachmentUrl: string;
	placeOfSupply: string;
	paymentDue: string;
	narration: string;
}>;

export type RecordPaymentBody = {
	amount: number;
	date?: string;
	paymentMode?: PaymentMode;
	reference?: string;
	notes?: string;
};

export type ListExpensesParams = {
	status?: ExpenseStatus;
	contactId?: string;
	category?: string;
	from?: string;
	to?: string;
	paymentDueBy?: string;
	page?: number;
	limit?: number;
	sort?: string;
	order?: "asc" | "desc";
};

export type PaginatedExpensesResponse = {
	data: Expense[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export type ExpenseImportError = {
	row?: number;
	field?: string;
	reason?: string;
};

export type ExpenseImportResponse = {
	message?: string;
	hit?: number;
	created?: number;
	updated?: number;
	errors: ExpenseImportError[];
	imported?: Expense[];
};

// ──────────────────────────────────────────────
// Envelope unwrap
// ──────────────────────────────────────────────

function unwrap<T>(raw: unknown, key?: string): T {
	const envelope = raw as { success?: boolean; data?: T | Record<string, unknown> };
	if (envelope && typeof envelope === "object" && "data" in envelope) {
		const inner = envelope.data;
		if (key && inner && typeof inner === "object" && key in inner) {
			return (inner as Record<string, T>)[key] as T;
		}
		return inner as T;
	}
	return raw as T;
}

// ──────────────────────────────────────────────
// API functions
// ──────────────────────────────────────────────

async function listExpenses(
	params?: ListExpensesParams,
): Promise<PaginatedExpensesResponse> {
	const { data } = await api.get(BASE, { params });
	const raw = data as
		| { data?: Expense[]; pagination?: PaginatedExpensesResponse["pagination"] }
		| unknown;
	if (
		raw &&
		typeof raw === "object" &&
		"data" in raw &&
		Array.isArray((raw as { data: Expense[] }).data)
	) {
		const r = raw as {
			data: Expense[];
			pagination?: PaginatedExpensesResponse["pagination"];
		};
		return {
			data: r.data,
			pagination:
				r.pagination ?? {
					page: params?.page ?? 1,
					limit: params?.limit ?? 20,
					total: r.data.length,
					totalPages: 1,
				},
		};
	}
	const list = (unwrap<Expense[]>(data) ?? []) as Expense[];
	return {
		data: Array.isArray(list) ? list : [],
		pagination: {
			page: params?.page ?? 1,
			limit: params?.limit ?? 20,
			total: Array.isArray(list) ? list.length : 0,
			totalPages: 1,
		},
	};
}

async function getExpense(id: string): Promise<Expense> {
	const { data } = await api.get(`${BASE}/${id}`);
	return unwrap<Expense>(data, "expense");
}

async function createExpense(body: CreateExpenseBody): Promise<Expense> {
	const { data } = await api.post(BASE, body);
	return unwrap<Expense>(data, "expense");
}

async function updateExpense(
	id: string,
	body: UpdateExpenseBody,
): Promise<Expense> {
	const { data } = await api.patch(`${BASE}/${id}`, body);
	return unwrap<Expense>(data, "expense");
}

async function postExpense(
	id: string,
	body?: { orchid?: string },
): Promise<Expense> {
	const { data } = await api.post<unknown>(`${BASE}/${id}/post`, body ?? {});
	return unwrap<Expense>(data, "expense");
}

async function recordPayment(
	id: string,
	body: RecordPaymentBody,
): Promise<Expense> {
	const { data } = await api.post<unknown>(`${BASE}/${id}/pay`, body);
	return unwrap<Expense>(data, "expense");
}

async function deleteExpense(id: string): Promise<void> {
	await api.delete(`${BASE}/${id}`);
}

async function downloadExpenseTemplate(): Promise<void> {
	const { data } = await api.get<Blob>(`${BASE}/template`, {
		responseType: "blob",
	});
	const url = URL.createObjectURL(data);
	const a = document.createElement("a");
	a.href = url;
	a.download = "expenses-import-template.csv";
	a.click();
	URL.revokeObjectURL(url);
}

async function importExpensesFromCsv(
	file: File,
): Promise<ExpenseImportResponse> {
	const formData = new FormData();
	formData.append("file", file);
	const { data } = await api.post<ExpenseImportResponse>(`${BASE}/import`, formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
	if (typeof data === "object" && data !== null && "data" in data) {
		return (data as { data: ExpenseImportResponse }).data;
	}
	return data as ExpenseImportResponse;
}

async function exportExpensesJson(
	params?: ListExpensesParams,
): Promise<Blob> {
	const { data } = await api.get<Blob>(`${BASE}/export/json`, {
		params,
		responseType: "blob",
	});
	return data;
}

async function exportExpensesCsv(
	params?: ListExpensesParams,
): Promise<Blob> {
	const { data } = await api.get<Blob>(`${BASE}/export/csv`, {
		params,
		responseType: "blob",
	});
	return data;
}

export { exportExpensesJson, exportExpensesCsv };

// ──────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────

export const expenseKeys = {
	all: ["business", "transactions", "expenses"] as const,
	lists: () => [...expenseKeys.all, "list"] as const,
	list: (params?: ListExpensesParams) =>
		[...expenseKeys.lists(), params] as const,
	detail: (id: string) => [...expenseKeys.all, "detail", id] as const,
};

// ──────────────────────────────────────────────
// React Query hooks
// ──────────────────────────────────────────────

export function useListExpenses(params?: ListExpensesParams) {
	return useQuery({
		queryKey: expenseKeys.list(params),
		queryFn: () => listExpenses(params),
	});
}

export function useGetExpense(id: string | null) {
	return useQuery({
		queryKey: expenseKeys.detail(id!),
		queryFn: () => getExpense(id!),
		enabled: !!id,
	});
}

export function useCreateExpense() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: createExpense,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: expenseKeys.all });
		},
	});
}

export function useUpdateExpense() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateExpenseBody }) =>
			updateExpense(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: expenseKeys.all });
		},
	});
}

export function usePostExpense() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string;
			body?: { orchid?: string };
		}) => postExpense(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: expenseKeys.all });
		},
	});
}

export function useRecordExpensePayment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string;
			body: RecordPaymentBody;
		}) => recordPayment(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: expenseKeys.all });
		},
	});
}

export function useDeleteExpense() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deleteExpense,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: expenseKeys.all });
		},
	});
}

export function useDownloadExpenseTemplate() {
	return useMutation({
		mutationFn: downloadExpenseTemplate,
	});
}

export function useImportExpensesFromCsv() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: importExpensesFromCsv,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: expenseKeys.all });
		},
	});
}
