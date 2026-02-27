import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { coaKeys, type JournalStatus } from "./coa";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type { JournalStatus };

export type JournalLine = {
	accountId: string;
	debit: number;
	credit: number;
	narration?: string;
};

export type JournalEntry = {
	_id: string;
	organizationId: string;
	date: string;
	reference?: string;
	description?: string;
	status: JournalStatus;
	lines: JournalLine[];
	createdBy?: string;
	updatedBy?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type CreateJournalBody = {
	date: string;
	reference?: string;
	description?: string;
	lines: JournalLine[];
};

export type UpdateJournalBody = Partial<CreateJournalBody>;

export type BulkCreateBody = {
	entries: CreateJournalBody[];
};

export type BulkCreateResponse = {
	created: JournalEntry[];
	count: number;
};

export type ListJournalParams = {
	reference?: string;
	dateFrom?: string;
	dateTo?: string;
	description?: string;
	status?: JournalStatus;
	createdBy?: string;
	updatedBy?: string;
	page?: number;
	limit?: number;
	sort?: string;
	order?: "asc" | "desc";
};

export type PaginatedJournalResponse = {
	data: JournalEntry[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export type PostReverseBody = {
	ids: string[];
};

export type PostResponse = {
	message: string;
	posted: JournalEntry[];
	failed: string[];
};

export type ReverseResponse = {
	message: string;
	reversed: JournalEntry[];
	failed: string[];
};

export type ValidateBody = {
	lines: Omit<JournalLine, "narration">[];
	organizationId?: string;
};

export type ValidateResponse = {
	isValid: boolean;
	errors: string[];
	balanceSheetBalanced: boolean;
	totalAssets: number;
	totalLiabilities: number;
	totalEquity: number;
	totalRevenue: number;
	totalExpenses: number;
};

/** CSV import: one row per journal line; rows with same date+reference = one entry. */
export type JournalImportError = {
	row?: number;
	reference?: string;
	message: string;
};

export type JournalImportResponse = {
	message: string;
	created: JournalEntry[];
	count: number;
	errors: JournalImportError[];
};

// ──────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────

export const journalKeys = {
	all: ["journal"] as const,
	list: (params?: ListJournalParams) => [...journalKeys.all, "list", params] as const,
	detail: (id: string) => [...journalKeys.all, "detail", id] as const,
};

// ──────────────────────────────────────────────
// API functions
// ──────────────────────────────────────────────

const BASE = "/api/v1/accounting/journal";

async function createJournal(body: CreateJournalBody): Promise<JournalEntry> {
	const { data } = await api.post<JournalEntry>(BASE, body);
	return data;
}

async function bulkCreateJournals(body: BulkCreateBody): Promise<BulkCreateResponse> {
	const { data } = await api.post<BulkCreateResponse>(`${BASE}/bulk`, body);
	return data;
}

async function listJournals(params?: ListJournalParams): Promise<PaginatedJournalResponse> {
	const { data } = await api.get<PaginatedJournalResponse>(BASE, { params });
	return data;
}

async function getJournal(id: string): Promise<JournalEntry> {
	const { data } = await api.get<JournalEntry>(`${BASE}/${id}`);
	return data;
}

async function updateJournal(id: string, body: UpdateJournalBody): Promise<JournalEntry> {
	const { data } = await api.put<JournalEntry>(`${BASE}/${id}`, body);
	return data;
}

async function patchJournal(id: string, body: UpdateJournalBody): Promise<JournalEntry> {
	const { data } = await api.patch<JournalEntry>(`${BASE}/${id}`, body);
	return data;
}

async function deleteJournal(id: string): Promise<{ message: string }> {
	const { data } = await api.delete<{ message: string }>(`${BASE}/${id}`);
	return data;
}

async function postJournals(body: PostReverseBody): Promise<PostResponse> {
	const { data } = await api.post<PostResponse>(`${BASE}/post`, body);
	return data;
}

async function reverseJournals(body: PostReverseBody): Promise<ReverseResponse> {
	const { data } = await api.post<ReverseResponse>(`${BASE}/reverse`, body);
	return data;
}

async function validateJournal(body: ValidateBody): Promise<ValidateResponse> {
	const { data } = await api.post<ValidateResponse>(`${BASE}/validate`, body);
	return data;
}

/** Download the CSV import template (GET returns CSV file). */
async function downloadJournalImportTemplate(): Promise<void> {
	const { data } = await api.get<Blob>(`${BASE}/template`, {
		responseType: "blob",
	});
	const url = URL.createObjectURL(data);
	const a = document.createElement("a");
	a.href = url;
	a.download = "journal-import-template.csv";
	a.click();
	URL.revokeObjectURL(url);
}

/** Import journal entries from a CSV file (multipart/form-data, field: file). */
async function importJournalsFromCsv(file: File): Promise<JournalImportResponse> {
	const formData = new FormData();
	formData.append("file", file);
	const { data } = await api.post<JournalImportResponse>(`${BASE}/import`, formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
	if (typeof data === "object" && data !== null && "data" in data) {
		const inner = (data as { data: JournalImportResponse }).data;
		return inner;
	}
	return data as JournalImportResponse;
}

// ──────────────────────────────────────────────
// React Query hooks — Queries
// ──────────────────────────────────────────────

export function useListJournals(params?: ListJournalParams) {
	return useQuery({
		queryKey: journalKeys.list(params),
		queryFn: () => listJournals(params),
	});
}

export function useGetJournal(id: string | null) {
	return useQuery({
		queryKey: journalKeys.detail(id!),
		queryFn: () => getJournal(id!),
		enabled: !!id,
	});
}

// ──────────────────────────────────────────────
// React Query hooks — Mutations
// ──────────────────────────────────────────────

export function useCreateJournal() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: createJournal,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: journalKeys.all });
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}

export function useBulkCreateJournals() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: bulkCreateJournals,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: journalKeys.all });
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}

export function useUpdateJournal() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateJournalBody }) =>
			updateJournal(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: journalKeys.all });
		},
	});
}

export function usePatchJournal() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateJournalBody }) =>
			patchJournal(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: journalKeys.all });
		},
	});
}

export function useDeleteJournal() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deleteJournal,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: journalKeys.all });
		},
	});
}

export function usePostJournals() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: postJournals,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: journalKeys.all });
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}

export function useReverseJournals() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: reverseJournals,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: journalKeys.all });
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}

export function useValidateJournal() {
	return useMutation({
		mutationFn: validateJournal,
	});
}

export function useDownloadJournalImportTemplate() {
	return useMutation({
		mutationFn: downloadJournalImportTemplate,
	});
}

export function useImportJournalsFromCsv() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: importJournalsFromCsv,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: journalKeys.all });
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}
