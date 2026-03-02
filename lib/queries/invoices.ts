import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

const BASE = "/api/v1/business/transactions/invoices";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type InvoiceStatus =
	| "DRAFT"
	| "POSTED"
	| "PAID"
	| "PARTIAL"
	| "CANCELLED";

export type PaymentMode = "CASH" | "ONLINE" | "CREDIT";

export type InvoiceItem = {
	productId?: string;
	qty: number;
	rate: number;
	discount?: number;
	name?: string;
	hsnOrSacCode?: string;
	taxableAmount?: number;
	gstAmount?: number;
	gstRate?: number;
	lineTotal?: number;
};

/** paymentDue = amount due to complete payment (totalAmount − sum(payments)); dueDate = when payment is due (CREDIT). */
export type Invoice = {
	_id: string;
	organizationId: string;
	type: string;
	reference: string;
	date: string;
	contactId: string;
	totalAmount: number;
	taxableAmount?: number;
	gstAmount?: number;
	cgst?: number;
	sgst?: number;
	igst?: number;
	status: InvoiceStatus;
	journalId?: string;
	placeOfSupply?: string;
	autoPosting?: boolean;
	narration?: string;
	/** Amount due to complete payment (totalAmount − sum(payments)). */
	paymentDue?: number;
	/** When payment is due (for CREDIT). */
	dueDate?: string;
	paymentMode?: PaymentMode;
	paymentTerms?: string;
	items: InvoiceItem[];
	discountTotal?: number;
	totalCost?: number;
	totalPaid?: number;
	createdBy?: string;
	updatedBy?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type PaymentAtCreate = {
	amount: number;
	date: string;
	reference: string;
	notes?: string;
};

/** Minimal create; server computes line totals, GST, invoice totals. CASH/ONLINE + payment → post and record payment in one request. */
export type CreateInvoiceBody = {
	date: string;
	contactId: string;
	paymentMode: PaymentMode;
	placeOfSupply: string;
	/** When payment is due (for CREDIT). Optional; can default from contact. */
	dueDate?: string;
	items: Array<{
		productId?: string;
		qty: number;
		rate: number;
		discount?: number;
		gstRate?: number;
		name?: string;
		hsnOrSacCode?: string;
	}>;
	/** For CASH/ONLINE: post + record full payment in one request. */
	payment?: PaymentAtCreate;
	paymentTerms?: string;
	narration?: string;
};

export type UpdateInvoiceBody = Partial<{
	reference: string;
	date: string;
	contactId: string;
	paymentMode: PaymentMode;
	placeOfSupply: string;
	items: InvoiceItem[];
	dueDate: string;
	paymentTerms: string;
	narration: string;
}>;

export type RecordPaymentBody = {
	amount: number;
	date: string;
	paymentMode?: PaymentMode;
	reference: string;
	notes?: string;
};

export type ListInvoicesParams = {
	status?: InvoiceStatus;
	contactId?: string;
	from?: string;
	to?: string;
	paymentDueBy?: string;
	page?: number;
	limit?: number;
	sort?: string;
	order?: "asc" | "desc";
};

export type PaginatedInvoicesResponse = {
	data: Invoice[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export type InvoiceImportError = {
	row?: number;
	field?: string;
	reason?: string;
};

export type InvoiceImportResponse = {
	message?: string;
	hit?: number;
	created?: number;
	updated?: number;
	errors: InvoiceImportError[];
	imported?: Invoice[];
};

// ──────────────────────────────────────────────
// Envelope unwrap
// ──────────────────────────────────────────────

function unwrap<T>(raw: unknown, key?: string): T {
	const envelope = raw as {
		success?: boolean;
		data?: T | Record<string, unknown>;
	};
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

async function listInvoices(
	params?: ListInvoicesParams,
): Promise<PaginatedInvoicesResponse> {
	const { data } = await api.get(BASE, { params });
	const raw = data as
		| { data?: Invoice[]; pagination?: PaginatedInvoicesResponse["pagination"] }
		| unknown;
	if (
		raw &&
		typeof raw === "object" &&
		"data" in raw &&
		Array.isArray((raw as { data: Invoice[] }).data)
	) {
		const r = raw as {
			data: Invoice[];
			pagination?: PaginatedInvoicesResponse["pagination"];
		};
		return {
			data: r.data,
			pagination: r.pagination ?? {
				page: params?.page ?? 1,
				limit: params?.limit ?? 20,
				total: r.data.length,
				totalPages: 1,
			},
		};
	}
	const list = (unwrap<Invoice[]>(data) ?? []) as Invoice[];
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

async function getInvoice(id: string): Promise<Invoice> {
	const { data } = await api.get(`${BASE}/${id}`);
	return unwrap<Invoice>(data, "invoice");
}

async function createInvoice(body: CreateInvoiceBody): Promise<Invoice> {
	const { data } = await api.post(BASE, body);
	return unwrap<Invoice>(data, "invoice");
}

async function updateInvoice(
	id: string,
	body: UpdateInvoiceBody,
): Promise<Invoice> {
	const { data } = await api.patch(`${BASE}/${id}`, body);
	return unwrap<Invoice>(data, "invoice");
}

async function postInvoice(
	id: string,
	body?: { orchid?: string },
): Promise<Invoice> {
	const { data } = await api.post<unknown>(`${BASE}/${id}/post`, body ?? {});
	return unwrap<Invoice>(data, "invoice");
}

async function recordPayment(
	id: string,
	body: RecordPaymentBody,
): Promise<Invoice> {
	const { data } = await api.post<unknown>(`${BASE}/${id}/pay`, body);
	return unwrap<Invoice>(data, "invoice");
}

async function deleteInvoice(id: string): Promise<void> {
	await api.delete(`${BASE}/${id}`);
}

async function downloadInvoiceTemplate(): Promise<void> {
	const { data } = await api.get<Blob>(`${BASE}/template`, {
		responseType: "blob",
	});
	const url = URL.createObjectURL(data);
	const a = document.createElement("a");
	a.href = url;
	a.download = "invoices-import-template.csv";
	a.click();
	URL.revokeObjectURL(url);
}

async function importInvoicesFromCsv(
	file: File,
): Promise<InvoiceImportResponse> {
	const formData = new FormData();
	formData.append("file", file);
	const { data } = await api.post<InvoiceImportResponse>(
		`${BASE}/import`,
		formData,
		{
			headers: { "Content-Type": "multipart/form-data" },
		},
	);
	if (typeof data === "object" && data !== null && "data" in data) {
		return (data as { data: InvoiceImportResponse }).data;
	}
	return data as InvoiceImportResponse;
}

async function exportInvoicesJson(params?: ListInvoicesParams): Promise<Blob> {
	const { data } = await api.get<Blob>(`${BASE}/export/json`, {
		params,
		responseType: "blob",
	});
	return data;
}

async function exportInvoicesCsv(params?: ListInvoicesParams): Promise<Blob> {
	const { data } = await api.get<Blob>(`${BASE}/export/csv`, {
		params,
		responseType: "blob",
	});
	return data;
}

export { exportInvoicesJson, exportInvoicesCsv };

// ──────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────

export const invoiceKeys = {
	all: ["business", "transactions", "invoices"] as const,
	lists: () => [...invoiceKeys.all, "list"] as const,
	list: (params?: ListInvoicesParams) =>
		[...invoiceKeys.lists(), params] as const,
	detail: (id: string) => [...invoiceKeys.all, "detail", id] as const,
};

// ──────────────────────────────────────────────
// React Query hooks
// ──────────────────────────────────────────────

export function useListInvoices(params?: ListInvoicesParams) {
	return useQuery({
		queryKey: invoiceKeys.list(params),
		queryFn: () => listInvoices(params),
	});
}

export function useGetInvoice(id: string | null) {
	return useQuery({
		queryKey: invoiceKeys.detail(id!),
		queryFn: () => getInvoice(id!),
		enabled: !!id,
	});
}

export function useCreateInvoice() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: createInvoice,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: invoiceKeys.all });
		},
	});
}

export function useUpdateInvoice() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateInvoiceBody }) =>
			updateInvoice(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: invoiceKeys.all });
		},
	});
}

export function usePostInvoice() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body?: { orchid?: string } }) =>
			postInvoice(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: invoiceKeys.all });
		},
	});
}

export function useRecordPayment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: RecordPaymentBody }) =>
			recordPayment(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: invoiceKeys.all });
		},
	});
}

export function useDeleteInvoice() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deleteInvoice,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: invoiceKeys.all });
		},
	});
}

export function useDownloadInvoiceTemplate() {
	return useMutation({
		mutationFn: downloadInvoiceTemplate,
	});
}

export function useImportInvoicesFromCsv() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: importInvoicesFromCsv,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: invoiceKeys.all });
		},
	});
}
