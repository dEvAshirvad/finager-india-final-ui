import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type AccountType =
	| "ASSET"
	| "LIABILITY"
	| "EQUITY"
	| "INCOME"
	| "EXPENSE";
export type NormalBalance = "DEBIT" | "CREDIT";
export type JournalStatus = "DRAFT" | "POSTED" | "REVERSED";

export type CoaAccount = {
	_id: string;
	organizationId: string;
	code: string;
	name: string;
	description?: string;
	type: AccountType;
	normalBalance: NormalBalance;
	parentCode?: string | null;
	isSystem?: boolean;
	openingBalance?: number;
	currentBalance?: number;
	createdAt?: string;
	updatedAt?: string;
};

export type CoaTreeNode = CoaAccount & {
	children: CoaTreeNode[];
};

export type CreateAccountBody = {
	code: string;
	name: string;
	description?: string;
	type: AccountType;
	normalBalance: NormalBalance;
	parentCode?: string | null;
};

export type UpdateAccountBody = Partial<CreateAccountBody>;

export type PaginatedResponse<T> = {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export type ListAccountsParams = {
	name?: string;
	code?: string;
	type?: AccountType;
	page?: number;
	limit?: number;
	sort?: string;
	order?: "asc" | "desc";
};

export type TemplateAccount = {
	code: string;
	name: string;
	type: AccountType;
	normalBalance: NormalBalance;
	parentCode?: string | null;
	description?: string;
};

export type TemplateResponse = {
	data: {
		industry: string;
		accounts: TemplateAccount[];
	};
};

export type CreateFromTemplateBody = {
	accounts: TemplateAccount[];
};

export type MoveAccountBody = {
	newParentCode: string | null;
};

export type CoaStatistics = {
	total: number;
	byType: Record<AccountType, number>;
	rootCount: number;
	leafCount: number;
};

export type JournalEntryLine = {
	accountId: string;
	debit: number;
	credit: number;
	description?: string;
};

export type JournalEntry = {
	_id: string;
	organizationId: string;
	date: string;
	reference?: string;
	description?: string;
	status: JournalStatus;
	lines: JournalEntryLine[];
	createdAt?: string;
	updatedAt?: string;
};

export type AccountJournalEntriesParams = {
	page?: number;
	limit?: number;
	status?: JournalStatus;
	dateFrom?: string;
	dateTo?: string;
};

export type AccountJournalEntriesResponse = {
	data: {
		entries: {
			account: Pick<CoaAccount, "_id" | "name" | "code" | "type">;
			descendantAccounts: CoaAccount[];
			journalEntries: JournalEntry[];
			totalDocs: number;
			limit: number;
			page: number;
			totalPages: number;
			nextPage: boolean;
			prevPage: boolean;
		};
	};
};

// ──────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────

export const coaKeys = {
	all: ["coa"] as const,
	list: (params?: ListAccountsParams) =>
		[...coaKeys.all, "list", params] as const,
	detail: (id: string) => [...coaKeys.all, "detail", id] as const,
	byCode: (code: string) => [...coaKeys.all, "code", code] as const,
	tree: () => [...coaKeys.all, "tree"] as const,
	roots: () => [...coaKeys.all, "roots"] as const,
	leaves: () => [...coaKeys.all, "leaves"] as const,
	ancestors: (id: string) => [...coaKeys.all, "ancestors", id] as const,
	descendants: (id: string) => [...coaKeys.all, "descendants", id] as const,
	children: (id: string) => [...coaKeys.all, "children", id] as const,
	path: (id: string) => [...coaKeys.all, "path", id] as const,
	level: (id: string) => [...coaKeys.all, "level", id] as const,
	statistics: () => [...coaKeys.all, "statistics"] as const,
	template: (industry: string) =>
		[...coaKeys.all, "template", industry] as const,
	journalEntries: (id: string, params?: AccountJournalEntriesParams) =>
		[...coaKeys.all, "journal-entries", id, params] as const,
};

// ──────────────────────────────────────────────
// API functions
// ──────────────────────────────────────────────

const BASE = "/api/v1/accounting/coa";

async function createAccount(body: CreateAccountBody): Promise<CoaAccount> {
	const { data } = await api.post<CoaAccount>(BASE, body);
	return data;
}

async function listAccounts(
	params?: ListAccountsParams,
): Promise<PaginatedResponse<CoaAccount>> {
	const { data } = await api.get<PaginatedResponse<CoaAccount>>(BASE, {
		params,
	});
	return data;
}

async function getAccountById(id: string): Promise<CoaAccount> {
	try {
		const { data } = await api.get<{ data: CoaAccount }>(`${BASE}/${id}`);
		return data.data;
	} catch (error) {
		throw error;
	}
}

async function getAccountByCode(code: string): Promise<CoaAccount> {
	const { data } = await api.get<CoaAccount>(`${BASE}/code/${code}`);
	return data;
}

async function updateAccount(
	id: string,
	body: UpdateAccountBody,
): Promise<CoaAccount> {
	const { data } = await api.put<CoaAccount>(`${BASE}/${id}`, body);
	return data;
}

async function patchAccount(
	id: string,
	body: UpdateAccountBody,
): Promise<CoaAccount> {
	const { data } = await api.patch<CoaAccount>(`${BASE}/${id}`, body);
	return data;
}

async function deleteAccount(id: string): Promise<{ message: string }> {
	const { data } = await api.delete<{ message: string }>(`${BASE}/${id}`);
	return data;
}

async function getTemplate(industry: string): Promise<TemplateResponse> {
	const { data } = await api.get<TemplateResponse>(
		`${BASE}/templates/${industry}`,
	);
	return data;
}

async function createFromTemplate(
	body: CreateFromTemplateBody,
): Promise<CoaAccount[]> {
	const { data } = await api.post<CoaAccount[]>(`${BASE}/template`, body);
	return data;
}

async function getTree(): Promise<CoaTreeNode[]> {
	const { data } = await api.get<CoaTreeNode[]>(`${BASE}/tree/all`);
	return data;
}

async function getRoots(): Promise<CoaAccount[]> {
	const { data } = await api.get<CoaAccount[]>(`${BASE}/tree/roots`);
	return data;
}

async function getLeaves(): Promise<CoaAccount[]> {
	const { data } = await api.get<CoaAccount[]>(`${BASE}/tree/leaves`);
	return data;
}

async function getAncestors(id: string): Promise<CoaAccount[]> {
	const { data } = await api.get<CoaAccount[]>(`${BASE}/${id}/ancestors`);
	return data;
}

async function getDescendants(id: string): Promise<CoaAccount[]> {
	const { data } = await api.get<CoaAccount[]>(`${BASE}/${id}/descendants`);
	return data;
}

async function getChildren(id: string): Promise<CoaAccount[]> {
	const { data } = await api.get<CoaAccount[]>(`${BASE}/${id}/children`);
	return data;
}

async function getPath(id: string): Promise<CoaAccount[]> {
	const { data } = await api.get<CoaAccount[]>(`${BASE}/${id}/path`);
	return data;
}

async function getLevel(id: string): Promise<{ level: number }> {
	const { data } = await api.get<{ level: number }>(`${BASE}/${id}/level`);
	return data;
}

async function moveAccount(
	id: string,
	body: MoveAccountBody,
): Promise<CoaAccount> {
	const { data } = await api.patch<CoaAccount>(`${BASE}/${id}/move`, body);
	return data;
}

async function getStatistics(): Promise<CoaStatistics> {
	const { data } = await api.get<CoaStatistics>(`${BASE}/statistics/overview`);
	return data;
}

async function getJournalEntries(
	id: string,
	params?: AccountJournalEntriesParams,
): Promise<AccountJournalEntriesResponse> {
	const { data } = await api.get<AccountJournalEntriesResponse>(
		`${BASE}/${id}/journal-entries`,
		{ params },
	);
	return data;
}

// ──────────────────────────────────────────────
// React Query hooks — Queries
// ──────────────────────────────────────────────

export function useListAccounts(params?: ListAccountsParams) {
	return useQuery({
		queryKey: coaKeys.list(params),
		queryFn: () => listAccounts(params),
	});
}

export function useGetAccount(id: string | null) {
	return useQuery({
		queryKey: coaKeys.detail(id!),
		queryFn: () => getAccountById(id!),
		enabled: !!id,
	});
}

export function useGetAccountByCode(code: string | null) {
	return useQuery({
		queryKey: coaKeys.byCode(code!),
		queryFn: () => getAccountByCode(code!),
		enabled: !!code,
	});
}

export function useGetTree() {
	return useQuery({
		queryKey: coaKeys.tree(),
		queryFn: getTree,
	});
}

export function useGetRoots() {
	return useQuery({
		queryKey: coaKeys.roots(),
		queryFn: getRoots,
	});
}

export function useGetLeaves() {
	return useQuery({
		queryKey: coaKeys.leaves(),
		queryFn: getLeaves,
	});
}

export function useGetAncestors(id: string | null) {
	return useQuery({
		queryKey: coaKeys.ancestors(id!),
		queryFn: () => getAncestors(id!),
		enabled: !!id,
	});
}

export function useGetDescendants(id: string | null) {
	return useQuery({
		queryKey: coaKeys.descendants(id!),
		queryFn: () => getDescendants(id!),
		enabled: !!id,
	});
}

export function useGetChildren(id: string | null) {
	return useQuery({
		queryKey: coaKeys.children(id!),
		queryFn: () => getChildren(id!),
		enabled: !!id,
	});
}

export function useGetPath(id: string | null) {
	return useQuery({
		queryKey: coaKeys.path(id!),
		queryFn: () => getPath(id!),
		enabled: !!id,
	});
}

export function useGetLevel(id: string | null) {
	return useQuery({
		queryKey: coaKeys.level(id!),
		queryFn: () => getLevel(id!),
		enabled: !!id,
	});
}

export function useGetStatistics() {
	return useQuery({
		queryKey: coaKeys.statistics(),
		queryFn: getStatistics,
	});
}

export function useGetTemplate(industry: string | null) {
	return useQuery({
		queryKey: coaKeys.template(industry!),
		queryFn: () => getTemplate(industry!),
		enabled: !!industry,
	});
}

export function useGetJournalEntries(
	id: string | null,
	params?: AccountJournalEntriesParams,
) {
	return useQuery({
		queryKey: coaKeys.journalEntries(id!, params),
		queryFn: () => getJournalEntries(id!, params),
		enabled: !!id,
	});
}

// ──────────────────────────────────────────────
// React Query hooks — Mutations
// ──────────────────────────────────────────────

export function useCreateAccount() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: createAccount,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}

export function useUpdateAccount() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateAccountBody }) =>
			updateAccount(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}

export function usePatchAccount() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateAccountBody }) =>
			patchAccount(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}

export function useDeleteAccount() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deleteAccount,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}

export function useCreateFromTemplate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: createFromTemplate,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}

export function useMoveAccount() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: MoveAccountBody }) =>
			moveAccount(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}
