import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

const BASE = "/api/v1/business/contacts";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ContactType = "customer" | "vendor";

export type ContactAddress = {
	line1?: string;
	line2?: string;
	city?: string;
	state?: string;
	pincode?: string;
	country?: string;
};

export type Contact = {
	_id: string;
	organizationId: string;
	type: ContactType;
	name: string;
	email?: string;
	phone?: string;
	address?: ContactAddress;
	gstin?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type CreateContactBody = {
	type: ContactType;
	name: string;
	email?: string;
	phone?: string;
	address?: ContactAddress;
	gstin?: string;
};

export type UpdateContactBody = Partial<Omit<CreateContactBody, "type">>;

export type ListContactsParams = {
	type: ContactType;
	search?: string;
	page?: number;
	limit?: number;
};

export type PaginatedContactsResponse = {
	data: Contact[];
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext?: boolean;
		hasPrev?: boolean;
	};
};

export type ContactImportError = {
	row?: number;
	message: string;
};

export type ContactImportResponse = {
	message: string;
	created?: Contact[];
	count: number;
	errors: ContactImportError[];
};

// ──────────────────────────────────────────────
// Envelope unwrap
// ──────────────────────────────────────────────

function unwrap<T>(raw: unknown): T {
	const envelope = raw as { success?: boolean; data?: T };
	if (envelope && typeof envelope === "object" && "data" in envelope) {
		return envelope.data as T;
	}
	return raw as T;
}

// ──────────────────────────────────────────────
// API functions
// ──────────────────────────────────────────────

async function listContacts(params: ListContactsParams): Promise<Contact[] | PaginatedContactsResponse> {
	const apiParams =
		params && params.type
			? { ...params, type: params.type.toUpperCase() }
			: params;
	const { data } = await api.get(BASE, { params: apiParams });
	const inner = unwrap<Contact[] | PaginatedContactsResponse>(data);
	if (Array.isArray(inner)) return inner;
	if (inner && typeof inner === "object" && "data" in inner) {
		return inner as PaginatedContactsResponse;
	}
	return [];
}

async function getContact(id: string): Promise<Contact> {
	const { data } = await api.get(`${BASE}/${id}`);
	return unwrap<Contact>(data);
}

async function createContact(body: CreateContactBody): Promise<Contact> {
	const { data } = await api.post(BASE, body);
	return unwrap<Contact>(data);
}

async function updateContact(id: string, body: UpdateContactBody): Promise<Contact> {
	const { data } = await api.patch(`${BASE}/${id}`, body);
	return unwrap<Contact>(data);
}

async function deleteContact(id: string): Promise<void> {
	await api.delete(`${BASE}/${id}`);
}

/** Download the CSV import template (GET returns CSV file). Optional type for customer/vendor-specific template. */
async function downloadContactImportTemplate(type: ContactType): Promise<void> {
	const { data } = await api.get<Blob>(`${BASE}/template`, {
		params: { type: type.toUpperCase() },
		responseType: "blob",
	});
	const url = URL.createObjectURL(data);
	const a = document.createElement("a");
	a.href = url;
	a.download = `contacts-import-${type}-template.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

/** Import contacts from CSV (multipart/form-data: file, optional type hint). */
async function importContactsFromCsv(
	file: File,
	type: ContactType,
): Promise<ContactImportResponse> {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("type", type);
	const { data } = await api.post<ContactImportResponse>(`${BASE}/import/csv`, formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
	if (typeof data === "object" && data !== null && "data" in data) {
		return (data as { data: ContactImportResponse }).data;
	}
	return data as ContactImportResponse;
}

// ──────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────

export const contactKeys = {
	all: ["business", "contacts"] as const,
	lists: () => [...contactKeys.all, "list"] as const,
	list: (params: ListContactsParams) => [...contactKeys.lists(), params] as const,
	detail: (id: string) => [...contactKeys.all, "detail", id] as const,
};

// ──────────────────────────────────────────────
// React Query hooks
// ──────────────────────────────────────────────

export function useListContacts(params: ListContactsParams) {
	return useQuery({
		queryKey: contactKeys.list(params),
		queryFn: async () => {
			const result = await listContacts(params);
			if (Array.isArray(result)) return { data: result, pagination: undefined };
			return result;
		},
	});
}

export function useGetContact(id: string | null) {
	return useQuery({
		queryKey: contactKeys.detail(id!),
		queryFn: () => getContact(id!),
		enabled: !!id,
	});
}

export function useCreateContact() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createContact,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
	});
}

export function useUpdateContact() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateContactBody }) =>
			updateContact(id, body),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
	});
}

export function useDeleteContact() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteContact,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
	});
}

export function useDownloadContactImportTemplate() {
	return useMutation({
		mutationFn: (type: ContactType) => downloadContactImportTemplate(type),
	});
}

export function useImportContactsFromCsv() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ file, type }: { file: File; type: ContactType }) =>
			importContactsFromCsv(file, type),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
	});
}
