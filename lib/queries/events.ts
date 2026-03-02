import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { journalKeys } from "./journal";
import { coaKeys } from "./coa";

// ──────────────────────────────────────────────
// Types — Template
// ──────────────────────────────────────────────

export type ReferenceConfig = {
	prefix: string;
	serialMethod: "incrementor" | "randomHex";
	length: number;
};

export type AmountConfig = {
	field: string;
	operator: "direct" | "%" | "+" | "-" | "*";
	operand?: number;
};

export type LineRule = {
	accountId: string;
	direction: "debit" | "credit";
	amountConfig: AmountConfig;
	narrationConfig?: string[];
};

export type EventTemplate = {
	_id: string;
	organizationId: string;
	name: string;
	orchid: string;
	referenceConfig: ReferenceConfig;
	narrationConfig?: string;
	isSystemGenerated?: boolean;
	inputSchema?: Record<string, unknown>;
	plugins: string[];
	linesRule: LineRule[];
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
};

export type CreateTemplateBody = Omit<
	EventTemplate,
	"_id" | "organizationId" | "createdAt" | "updatedAt"
>;

export type UpdateTemplateBody = Partial<CreateTemplateBody>;

export type ListTemplatesParams = {
	orchid?: string;
	name?: string;
	isActive?: boolean;
	page?: number;
	limit?: number;
};

// ──────────────────────────────────────────────
// Types — Instance
// ──────────────────────────────────────────────

export type InstanceStatus = "PENDING" | "PROCESSED" | "FAILED";

export type PluginResult = {
	plugin: string;
	success: boolean;
	resultId?: string;
	error?: string;
};

export type EventInstance = {
	_id: string;
	organizationId: string;
	templateId: string;
	type: string;
	reference: string;
	payload: Record<string, unknown>;
	status: InstanceStatus;
	processedAt?: string;
	errorMessage?: string;
	results: PluginResult[];
	createdAt?: string;
	updatedAt?: string;
};

export type ListInstancesParams = {
	status?: InstanceStatus;
	templateId?: string;
	page?: number;
	limit?: number;
};

// ──────────────────────────────────────────────
// Types — Recurring
// ──────────────────────────────────────────────

export type ScheduleType = "daily" | "weekly" | "monthly" | "calendar_monthly";

export type RecurringSchedule = {
	type: ScheduleType;
	time?: string;
	dayOfWeek?: number;
	dayOfMonth?: number;
};

export type RecurringEvent = {
	_id: string;
	templateId: string;
	organizationId: string;
	payload: Record<string, unknown>;
	schedule: RecurringSchedule;
	startAt: string;
	endAt?: string;
	nextRun?: string;
	lastRun?: string;
	enabled: boolean;
	runCount: number;
	maxRuns?: number;
	createdAt?: string;
	updatedAt?: string;
};

export type CreateRecurringBody = {
	templateId: string;
	schedule: RecurringSchedule;
	payload: Record<string, unknown>;
	startAt: string;
	endAt?: string;
	maxRuns?: number;
};

// ──────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────

export const eventKeys = {
	all: ["events"] as const,
	templates: (params?: ListTemplatesParams) =>
		[...eventKeys.all, "templates", params] as const,
	template: (orchid: string) => [...eventKeys.all, "template", orchid] as const,
	instances: (params?: ListInstancesParams) =>
		[...eventKeys.all, "instances", params] as const,
	instance: (id: string) => [...eventKeys.all, "instance", id] as const,
	recurring: () => [...eventKeys.all, "recurring"] as const,
};

// ──────────────────────────────────────────────
// Envelope helper — unwraps { success, data: { ... } }
// ──────────────────────────────────────────────

type ApiEnvelope<T = unknown> = {
	success: boolean;
	status: number;
	data: T;
	[key: string]: unknown;
};

function unwrap<T>(raw: unknown, key?: string): T {
	const envelope = raw as ApiEnvelope;
	if (
		envelope &&
		typeof envelope === "object" &&
		"success" in envelope &&
		"data" in envelope
	) {
		const inner = envelope.data as Record<string, unknown>;
		if (key && inner && typeof inner === "object" && key in inner) {
			return inner[key] as T;
		}
		return envelope.data as T;
	}
	return raw as T;
}

// ──────────────────────────────────────────────
// API functions — Templates
// ──────────────────────────────────────────────

const BASE = "/api/v1/business/events";

async function listTemplates(
	params?: ListTemplatesParams,
): Promise<EventTemplate[]> {
	const { data } = await api.get(`${BASE}/templates`, { params });
	const inner = unwrap<{ templates?: EventTemplate[] } | EventTemplate[]>(
		data,
		"templates",
	);
	if (Array.isArray(inner)) return inner;
	if (inner && typeof inner === "object" && "templates" in inner)
		return (inner as { templates: EventTemplate[] }).templates;
	return Array.isArray(data) ? data : [];
}

async function getTemplate(orchid: string): Promise<EventTemplate> {
	const { data } = await api.get(`${BASE}/templates/${orchid}`);
	return unwrap<EventTemplate>(data, "template");
}

async function createTemplate(
	body: CreateTemplateBody,
): Promise<EventTemplate> {
	const { data } = await api.post(`${BASE}/templates`, body);
	return unwrap<EventTemplate>(data, "template");
}

async function updateTemplate(
	orchid: string,
	body: UpdateTemplateBody,
): Promise<EventTemplate> {
	const { data } = await api.put(`${BASE}/templates/${orchid}`, body);
	return unwrap<EventTemplate>(data, "template");
}

async function patchTemplate(
	orchid: string,
	body: UpdateTemplateBody,
): Promise<EventTemplate> {
	const { data } = await api.patch(`${BASE}/templates/${orchid}`, body);
	return unwrap<EventTemplate>(data, "template");
}

async function deleteTemplate(orchid: string): Promise<void> {
	await api.delete(`${BASE}/templates/${orchid}`);
}

// ──────────────────────────────────────────────
// API functions — Dispatch
// ──────────────────────────────────────────────

async function dispatch(
	orchid: string,
	payload: Record<string, unknown>,
): Promise<EventInstance> {
	const { data } = await api.post(`${BASE}/dispatch/${orchid}`, { payload });
	return unwrap<EventInstance>(data, "event");
}

// ──────────────────────────────────────────────
// API functions — Instances
// ──────────────────────────────────────────────

async function listInstances(
	params?: ListInstancesParams,
): Promise<EventInstance[]> {
	const { data } = await api.get(`${BASE}/instances`, { params });
	// New envelope: { success, data: EventInstance[], pagination, ... }
	if (
		data &&
		typeof data === "object" &&
		"data" in data &&
		Array.isArray((data as { data: unknown }).data)
	) {
		return (data as { data: EventInstance[] }).data;
	}
	const inner = unwrap<{ instances?: EventInstance[] } | EventInstance[]>(
		data,
		"instances",
	);
	if (Array.isArray(inner)) return inner;
	if (inner && typeof inner === "object" && "instances" in inner)
		return (inner as { instances: EventInstance[] }).instances;
	return Array.isArray(data) ? data : [];
}

async function getInstance(id: string): Promise<EventInstance> {
	const { data } = await api.get(`${BASE}/instances/${id}`);
	return data.data.event;
}

// ──────────────────────────────────────────────
// API functions — Recurring
// ──────────────────────────────────────────────

async function listRecurring(): Promise<RecurringEvent[]> {
	const { data } = await api.get(`${BASE}/recurring`);
	const inner = unwrap<{ recurrences?: RecurringEvent[] } | RecurringEvent[]>(
		data,
		"recurrences",
	);
	if (Array.isArray(inner)) return inner;
	if (inner && typeof inner === "object" && "recurrences" in inner)
		return (inner as { recurrences: RecurringEvent[] }).recurrences;
	return Array.isArray(data) ? data : [];
}

async function createRecurring(
	body: CreateRecurringBody,
): Promise<RecurringEvent> {
	const { data } = await api.post(`${BASE}/recurring`, body);
	return unwrap<RecurringEvent>(data, "recurrence");
}

async function deleteRecurring(id: string): Promise<void> {
	await api.delete(`${BASE}/recurring/${id}`);
}

// ──────────────────────────────────────────────
// React Query hooks — Templates
// ──────────────────────────────────────────────

export function useListTemplates(params?: ListTemplatesParams) {
	return useQuery<EventTemplate[]>({
		queryKey: eventKeys.templates(params),
		queryFn: () => listTemplates(params),
	});
}

export function useGetTemplate(orchid: string | null) {
	return useQuery({
		queryKey: eventKeys.template(orchid!),
		queryFn: () => getTemplate(orchid!),
		enabled: !!orchid,
	});
}

export function useCreateTemplate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: createTemplate,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: eventKeys.all });
		},
	});
}

export function useUpdateTemplate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			orchid,
			body,
		}: {
			orchid: string;
			body: UpdateTemplateBody;
		}) => updateTemplate(orchid, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: eventKeys.all });
		},
	});
}

export function usePatchTemplate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			orchid,
			body,
		}: {
			orchid: string;
			body: UpdateTemplateBody;
		}) => patchTemplate(orchid, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: eventKeys.all });
		},
	});
}

export function useDeleteTemplate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deleteTemplate,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: eventKeys.all });
		},
	});
}

// ──────────────────────────────────────────────
// React Query hooks — Dispatch
// ──────────────────────────────────────────────

export function useDispatch() {
	const qc = useQueryClient();
	return useMutation<
		EventInstance,
		Error,
		{ orchid: string; payload: Record<string, unknown> }
	>({
		mutationFn: ({ orchid, payload }) => dispatch(orchid, payload),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: eventKeys.all });
			qc.invalidateQueries({ queryKey: journalKeys.all });
			qc.invalidateQueries({ queryKey: coaKeys.all });
		},
	});
}

// ──────────────────────────────────────────────
// React Query hooks — Instances
// ──────────────────────────────────────────────

export function useListInstances(params?: ListInstancesParams) {
	return useQuery<EventInstance[]>({
		queryKey: eventKeys.instances(params),
		queryFn: () => listInstances(params),
	});
}

export function useGetInstance(id: string | null) {
	return useQuery<EventInstance>({
		queryKey: eventKeys.instance(id!),
		queryFn: () => getInstance(id!),
		enabled: !!id,
	});
}

// ──────────────────────────────────────────────
// React Query hooks — Recurring
// ──────────────────────────────────────────────

export function useListRecurring() {
	return useQuery<RecurringEvent[]>({
		queryKey: eventKeys.recurring(),
		queryFn: listRecurring,
	});
}

export function useCreateRecurring() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: createRecurring,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: eventKeys.recurring() });
		},
	});
}

export function useDeleteRecurring() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deleteRecurring,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: eventKeys.recurring() });
		},
	});
}
