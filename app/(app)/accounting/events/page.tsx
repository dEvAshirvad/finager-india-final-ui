"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import {
	Plus,
	Trash2,
	Loader2,
	Eye,
	Pencil,
	CheckCircle2,
	XCircle,
	Clock,
	Send,
	LayoutTemplate,
	Activity,
	Power,
	PowerOff,
} from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
	useListTemplates,
	useCreateTemplate,
	usePatchTemplate,
	useDeleteTemplate,
	useDispatch,
	useListInstances,
	useGetInstance,
	type EventTemplate,
	type EventInstance,
	type LineRule,
	type ListInstancesParams,
	type InstanceStatus,
} from "@/lib/queries/events";
import { useListAccounts, type CoaAccount } from "@/lib/queries/coa";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatDate(iso?: string) {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});
}

const INSTANCE_STATUS: Record<
	InstanceStatus,
	{ label: string; className: string; icon: typeof Clock }
> = {
	PENDING: {
		label: "Pending",
		className: "bg-amber-100 text-amber-700",
		icon: Clock,
	},
	PROCESSED: {
		label: "Processed",
		className: "bg-green-100 text-green-700",
		icon: CheckCircle2,
	},
	FAILED: {
		label: "Failed",
		className: "bg-red-100 text-red-700",
		icon: XCircle,
	},
};

function InstanceStatusBadge({
	status,
}: {
	status?: InstanceStatus | string | null;
}) {
	const cfg =
		status && status in INSTANCE_STATUS
			? INSTANCE_STATUS[status as InstanceStatus]
			: {
					label: String(status ?? "Unknown"),
					className: "bg-muted text-muted-foreground",
					icon: Clock,
				};
	const Icon = cfg.icon;
	return (
		<Badge
			variant="secondary"
			className={cn("gap-1 text-[10px]", cfg.className)}>
			<Icon className="size-3" />
			{cfg.label}
		</Badge>
	);
}

// ──────────────────────────────────────────────
// Template Form Dialog
// ──────────────────────────────────────────────

type LineRuleForm = {
	accountId: string;
	direction: string;
	field: string;
	operator: string;
	operand: string;
	narrationConfig: string;
};

type TemplateFormValues = {
	name: string;
	orchid: string;
	prefix: string;
	serialMethod: string;
	length: string;
	narrationConfig: string;
	requiredFields: string;
	linesRule: LineRuleForm[];
};

/** Extract %field_name% placeholders from a string. */
function extractPlaceholders(str: string): string[] {
	if (!str?.trim()) return [];
	const matches = str.match(/%([^%]+)%/g);
	if (!matches) return [];
	return [
		...new Set(matches.map((m) => m.slice(1, -1).trim()).filter(Boolean)),
	];
}

function TemplateFormDialog({
	open,
	onOpenChange,
	editTemplate,
	accounts,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	editTemplate?: EventTemplate | null;
	accounts: CoaAccount[];
}) {
	const createMut = useCreateTemplate();
	const patchMut = usePatchTemplate();
	const isEdit = !!editTemplate;

	const form = useForm<TemplateFormValues>({
		defaultValues: editTemplate
			? {
					name: editTemplate.name,
					orchid: editTemplate.orchid,
					prefix: editTemplate.referenceConfig.prefix,
					serialMethod: editTemplate.referenceConfig.serialMethod,
					length: String(editTemplate.referenceConfig.length),
					narrationConfig: editTemplate.narrationConfig ?? "",
					requiredFields: Array.isArray(editTemplate.inputSchema?.required)
						? (editTemplate.inputSchema.required as string[]).join(", ")
						: "",
					linesRule: editTemplate.linesRule.map((l) => ({
						accountId: l.accountId,
						direction: l.direction,
						field: l.amountConfig.field,
						operator: l.amountConfig.operator,
						operand:
							l.amountConfig.operand !== undefined
								? String(l.amountConfig.operand)
								: "",
						narrationConfig: l.narrationConfig?.join(", ") ?? "",
					})),
				}
			: {
					name: "",
					orchid: "",
					prefix: "",
					serialMethod: "incrementor",
					length: "6",
					narrationConfig: "",
					requiredFields: "",
					linesRule: [
						{
							accountId: "",
							direction: "debit",
							field: "",
							operator: "direct",
							operand: "",
							narrationConfig: "",
						},
						{
							accountId: "",
							direction: "credit",
							field: "",
							operator: "direct",
							operand: "",
							narrationConfig: "",
						},
					],
				},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "linesRule",
	});

	async function onSubmit(values: TemplateFormValues) {
		if (!values.name.trim()) {
			form.setError("name", { message: "Required" });
			return;
		}
		if (!values.orchid.trim()) {
			form.setError("orchid", { message: "Required" });
			return;
		}
		if (!values.prefix.trim()) {
			form.setError("prefix", { message: "Required" });
			return;
		}
		const lengthNum = parseInt(values.length, 10);
		if (
			!values.length.trim() ||
			Number.isNaN(lengthNum) ||
			lengthNum < 1 ||
			lengthNum > 20
		) {
			form.setError("length", { message: "Required (1–20)" });
			return;
		}
		if (!values.narrationConfig.trim()) {
			form.setError("narrationConfig", { message: "Required" });
			return;
		}

		const required = values.requiredFields
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		if (required.length === 0) {
			form.setError("requiredFields", {
				message: "At least one required payload field is needed",
			});
			return;
		}
		const requiredSet = new Set(required);
		const inputSchema = { required };

		// Validate template narrationConfig: every %field% must be in required
		const narrationPlaceholders = extractPlaceholders(values.narrationConfig);
		for (const p of narrationPlaceholders) {
			if (!requiredSet.has(p)) {
				form.setError("narrationConfig", {
					message: `Placeholder %${p}% must be one of: ${required.join(", ")}`,
				});
				return;
			}
		}

		// Validate each line: field must be in required; line narrationConfig placeholders must be in required
		for (let i = 0; i < values.linesRule.length; i++) {
			const l = values.linesRule[i];
			if (!l.accountId?.trim()) {
				form.setError(`linesRule.${i}.accountId`, { message: "Required" });
				toast.error(
					"Fill all required fields in Journal Line Rules (e.g. Account, Field).",
				);
				return;
			}
			if (!l.field?.trim()) {
				form.setError(`linesRule.${i}.field`, { message: "Required" });
				toast.error(
					"Each line rule must have a Field from the required payload list.",
				);
				return;
			}
			if (!requiredSet.has(l.field.trim())) {
				form.setError(`linesRule.${i}.field`, {
					message: `Must be one of: ${required.join(", ")}`,
				});
				toast.error(
					`Line ${i + 1} field must be one of: ${required.join(", ")}`,
				);
				return;
			}
			const linePlaceholders = extractPlaceholders(l.narrationConfig ?? "");
			for (const p of linePlaceholders) {
				if (!requiredSet.has(p)) {
					form.setError(`linesRule.${i}.narrationConfig`, {
						message: `Placeholder %${p}% must be one of: ${required.join(", ")}`,
					});
					toast.error(
						`Line ${i + 1} narration: %${p}% must be in required payload fields.`,
					);
					return;
				}
			}
		}

		const linesRule: LineRule[] = values.linesRule.map((l) => ({
			accountId: l.accountId,
			direction: l.direction as "debit" | "credit",
			amountConfig: {
				field: l.field,
				operator: l.operator as LineRule["amountConfig"]["operator"],
				operand: l.operand ? parseFloat(l.operand) : undefined,
			},
			narrationConfig: l.narrationConfig
				? l.narrationConfig
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean)
				: undefined,
		}));

		const body = {
			name: values.name.trim(),
			orchid: values.orchid.trim().toUpperCase(),
			referenceConfig: {
				prefix: values.prefix.trim(),
				serialMethod: values.serialMethod as "incrementor" | "randomHex",
				length: parseInt(values.length) || 6,
			},
			narrationConfig: values.narrationConfig || undefined,
			inputSchema,
			plugins: ["journal"],
			linesRule,
			isActive: true,
		};

		try {
			if (isEdit) {
				await patchMut.mutateAsync({ orchid: editTemplate.orchid, body });
				toast.success("Template updated.");
			} else {
				await createMut.mutateAsync(body);
				toast.success("Template created.");
			}
			onOpenChange(false);
		} catch {
			toast.error(
				isEdit ? "Failed to update template." : "Failed to create template.",
			);
		}
	}

	const isPending = createMut.isPending || patchMut.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit Template" : "New Event Template"}
					</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name (Required)</FormLabel>
										<FormControl>
											<Input placeholder="Sales Invoice" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="orchid"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Orchid / Code (Required)</FormLabel>
										<FormControl>
											<Input
												placeholder="INVOICE"
												{...field}
												onChange={(e) =>
													field.onChange(e.target.value.toUpperCase())
												}
												disabled={isEdit}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<FormField
								control={form.control}
								name="prefix"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Ref. Prefix (Required)</FormLabel>
										<FormControl>
											<Input placeholder="INV" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="serialMethod"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Serial Method (Required)</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="incrementor">Incrementor</SelectItem>
												<SelectItem value="randomHex">Random Hex</SelectItem>
											</SelectContent>
										</Select>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="length"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Serial Length (Required)</FormLabel>
										<FormControl>
											<Input type="number" min="1" max="20" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="narrationConfig"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Narration Template (Required)</FormLabel>
									<FormControl>
										<Input
											placeholder="Invoice %field_name% — %field_name%"
											{...field}
										/>
									</FormControl>
									<p className="text-[10px] text-muted-foreground">
										Supports placeholders: %reference%, %field_name%
									</p>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="requiredFields"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Required payload fields (Required)</FormLabel>
									<FormControl>
										<Input
											placeholder="totalAmount, contactId, contactName"
											{...field}
										/>
									</FormControl>
									<FormMessage />
									<p className="text-[10px] text-muted-foreground">
										Comma-separated field names that must be present when
										dispatching. Used for validation and for %field_name% in
										narrations.
									</p>
								</FormItem>
							)}
						/>

						<Separator />

						<div>
							<div className="flex items-center justify-between mb-3">
								<h4 className="text-sm font-semibold">Journal Line Rules</h4>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-7 text-xs"
									onClick={() =>
										append({
											accountId: "",
											direction: "",
											field: "",
											operator: "direct",
											operand: "",
											narrationConfig: "",
										})
									}>
									<Plus className="size-3" /> Add Rule
								</Button>
							</div>

							<div className="rounded-lg border">
								<Table>
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead className="text-xs pl-3 w-[25%]">
												Account
											</TableHead>
											<TableHead className="text-xs w-[10%]">Dir.</TableHead>
											<TableHead className="text-xs w-[14%]">Field</TableHead>
											<TableHead className="text-xs w-[10%]">Op.</TableHead>
											<TableHead className="text-xs w-[8%]">Val</TableHead>
											<TableHead className="text-xs w-[25%]">
												Narration
											</TableHead>
											{fields.length > 2 && (
												<TableHead className="text-xs w-8 pr-3" />
											)}
										</TableRow>
									</TableHeader>
									<TableBody>
										{fields.map((f, index) => (
											<TableRow key={f.id} className="hover:bg-transparent">
												<TableCell className="pl-3 py-1.5">
													<FormField
														control={form.control}
														name={`linesRule.${index}.accountId`}
														render={({ field: ff }) => (
															<Select
																value={ff.value}
																onValueChange={ff.onChange}>
																<SelectTrigger className="h-8 text-xs w-full">
																	<SelectValue placeholder="Account" />
																</SelectTrigger>
																<SelectContent className="max-h-60">
																	{accounts.map((a) => (
																		<SelectItem
																			key={a._id}
																			value={a._id}
																			className="text-xs">
																			<span className="font-mono text-muted-foreground mr-1">
																				{a.code}
																			</span>
																			{a.name}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
														)}
													/>
												</TableCell>
												<TableCell className="py-1.5">
													<FormField
														control={form.control}
														name={`linesRule.${index}.direction`}
														render={({ field: ff }) => (
															<Select
																value={ff.value}
																onValueChange={ff.onChange}>
																<SelectTrigger className="h-8 text-xs w-full">
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="debit">Dr</SelectItem>
																	<SelectItem value="credit">Cr</SelectItem>
																</SelectContent>
															</Select>
														)}
													/>
												</TableCell>
												<TableCell className="py-1.5">
													<FormField
														control={form.control}
														name={`linesRule.${index}.field`}
														render={({ field: ff }) => (
															<Input
																className="h-8 text-xs"
																placeholder="field_name"
																{...ff}
															/>
														)}
													/>
												</TableCell>
												<TableCell className="py-1.5">
													<FormField
														control={form.control}
														name={`linesRule.${index}.operator`}
														render={({ field: ff }) => (
															<Select
																value={ff.value}
																onValueChange={ff.onChange}>
																<SelectTrigger className="h-8 text-xs w-full">
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="direct">Direct</SelectItem>
																	<SelectItem value="%">%</SelectItem>
																	<SelectItem value="+">+</SelectItem>
																	<SelectItem value="-">-</SelectItem>
																	<SelectItem value="*">*</SelectItem>
																</SelectContent>
															</Select>
														)}
													/>
												</TableCell>
												<TableCell className="py-1.5">
													<FormField
														control={form.control}
														name={`linesRule.${index}.operand`}
														render={({ field: ff }) => (
															<Input
																type="number"
																className="h-8 text-xs"
																placeholder="—"
																{...ff}
															/>
														)}
													/>
												</TableCell>
												<TableCell className="py-1.5">
													<FormField
														control={form.control}
														name={`linesRule.${index}.narrationConfig`}
														render={({ field: ff }) => (
															<Input
																className="h-8 text-xs w-full"
																placeholder="Invoice %field_name%"
																{...ff}
															/>
														)}
													/>
												</TableCell>
												{fields.length > 2 && (
													<TableCell className="pr-3 py-1.5">
														<button
															type="button"
															className="text-muted-foreground hover:text-destructive cursor-pointer"
															onClick={() => remove(index)}>
															<Trash2 className="size-3.5" />
														</button>
													</TableCell>
												)}
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>

						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" type="button">
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit" disabled={isPending}>
								{isPending ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										{isEdit ? "Saving..." : "Creating..."}
									</>
								) : isEdit ? (
									"Save Changes"
								) : (
									"Create Template"
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

// ──────────────────────────────────────────────
// Dispatch Dialog
// ──────────────────────────────────────────────

const REQUIRED_FIELD_NAMES = [
	"totalAmount",
	"amount",
	"quantity",
	"qty",
	"count",
];

function isLikelyNumericField(fieldName: string): boolean {
	const lower = fieldName.toLowerCase();
	return (
		REQUIRED_FIELD_NAMES.some((n) => lower.includes(n)) ||
		/^(amount|total|price|qty|quantity|count|number|num)/i.test(lower)
	);
}

function DispatchDialog({
	open,
	onOpenChange,
	template,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	template: EventTemplate;
}) {
	const dispatchMut = useDispatch();
	const requiredFields = useMemo(() => {
		const r = template.inputSchema?.required;
		return Array.isArray(r) ? (r as string[]) : [];
	}, [template.inputSchema?.required]);

	const [formValues, setFormValues] = useState<Record<string, string>>({});
	const [result, setResult] = useState<EventInstance | null>(null);

	useEffect(() => {
		if (!open) return;
		setResult(null);
		const initial: Record<string, string> = {};
		requiredFields.forEach((f) => {
			initial[f] = "";
		});
		setFormValues(initial);
	}, [open, requiredFields]);

	function setField(name: string, value: string) {
		setFormValues((prev) => ({ ...prev, [name]: value }));
	}

	async function handleDispatch() {
		const missing = requiredFields.filter(
			(f) => !String(formValues[f] ?? "").trim(),
		);
		if (missing.length > 0) {
			toast.error(`Missing required fields: ${missing.join(", ")}`);
			return;
		}
		const payload: Record<string, unknown> = {};
		for (const key of requiredFields) {
			const raw = String(formValues[key] ?? "").trim();
			if (isLikelyNumericField(key)) {
				const num = Number(raw);
				payload[key] = Number.isNaN(num) ? raw : num;
			} else {
				payload[key] = raw;
			}
		}
		try {
			const event = await dispatchMut.mutateAsync({
				orchid: template.orchid,
				payload,
			});
			setResult(event);
			toast.success(`Event dispatched: ${event.reference}`);
		} catch {
			toast.error("Dispatch failed.");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						Dispatch: {template.name} ({template.orchid})
					</DialogTitle>
				</DialogHeader>

				{result ? (
					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<InstanceStatusBadge status={result.status} />
							<span className="font-mono text-sm">{result.reference}</span>
						</div>
						{(result.results ?? []).map((r, i) => (
							<div
								key={i}
								className={cn(
									"text-sm rounded-lg p-3",
									r.success
										? "bg-green-50 text-green-700"
										: "bg-red-50 text-red-700",
								)}>
								<span className="font-medium">{r.plugin}:</span>{" "}
								{r.success ? `Success (${r.resultId})` : r.error}
							</div>
						))}
						<DialogFooter>
							<Button
								onClick={() => {
									setResult(null);
									onOpenChange(false);
								}}>
								Done
							</Button>
						</DialogFooter>
					</div>
				) : requiredFields.length === 0 ? (
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							This template has no required payload fields defined. Dispatch
							with an empty payload or add required fields in the template.
						</p>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" type="button">
									Cancel
								</Button>
							</DialogClose>
							<Button
								onClick={async () => {
									try {
										const event = await dispatchMut.mutateAsync({
											orchid: template.orchid,
											payload: {},
										});
										setResult(event);
										toast.success(`Event dispatched: ${event.reference}`);
									} catch {
										toast.error("Dispatch failed.");
									}
								}}
								disabled={dispatchMut.isPending}>
								{dispatchMut.isPending ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Dispatching...
									</>
								) : (
									<>
										<Send className="size-4" />
										Dispatch
									</>
								)}
							</Button>
						</DialogFooter>
					</div>
				) : (
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Fill the required payload fields. They are defined by the
							template&apos;s input schema.
						</p>
						<div className="space-y-3">
							{requiredFields.map((fieldName) => (
								<div key={fieldName} className="space-y-1.5">
									<label
										htmlFor={`dispatch-${fieldName}`}
										className="text-xs font-medium text-muted-foreground">
										{fieldName}
									</label>
									<Input
										id={`dispatch-${fieldName}`}
										className="font-mono text-sm"
										placeholder={fieldName}
										value={formValues[fieldName] ?? ""}
										onChange={(e) => setField(fieldName, e.target.value)}
										type={isLikelyNumericField(fieldName) ? "number" : "text"}
									/>
								</div>
							))}
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" type="button">
									Cancel
								</Button>
							</DialogClose>
							<Button onClick={handleDispatch} disabled={dispatchMut.isPending}>
								{dispatchMut.isPending ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Dispatching...
									</>
								) : (
									<>
										<Send className="size-4" />
										Dispatch
									</>
								)}
							</Button>
						</DialogFooter>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

// ──────────────────────────────────────────────
// Instance Detail Dialog
// ──────────────────────────────────────────────

function InstanceDetailDialog({
	open,
	onOpenChange,
	instanceId,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	instanceId: string;
}) {
	const { data: inst, isLoading } = useGetInstance(instanceId);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Event Instance</DialogTitle>
				</DialogHeader>
				{isLoading || !inst ? (
					<div className="space-y-3 py-4">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-20 w-full" />
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-center gap-3 flex-wrap">
							<InstanceStatusBadge status={inst.status} />
							<span className="font-mono text-sm">{inst.reference}</span>
							<Badge variant="outline" className="text-[10px]">
								{inst.type}
							</Badge>
						</div>

						{inst.errorMessage && (
							<div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
								{inst.errorMessage}
							</div>
						)}

						<div className="space-y-2 text-sm">
							<div>
								<span className="text-muted-foreground">Processed:</span>{" "}
								{formatDate(inst.processedAt)}
							</div>
							<div>
								<span className="text-muted-foreground">Created:</span>{" "}
								{formatDate(inst.createdAt)}
							</div>
						</div>

						{(inst.results?.length ?? 0) > 0 && (
							<div className="space-y-2">
								<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Plugin Results
								</h4>
								{(inst.results ?? []).map((r, i) => (
									<div
										key={i}
										className={cn(
											"text-xs rounded-lg p-2.5",
											r.success
												? "bg-green-50 text-green-700"
												: "bg-red-50 text-red-700",
										)}>
										<span className="font-medium">{r.plugin}:</span>{" "}
										{r.success ? (
											<span>
												Success
												{(r.resultId ?? (r as { _id?: string })._id) && (
													<span className="font-mono ml-1">
														({r.resultId ?? (r as { _id?: string })._id})
													</span>
												)}
											</span>
										) : (
											r.error
										)}
									</div>
								))}
							</div>
						)}

						<details className="text-xs text-muted-foreground">
							<summary className="cursor-pointer hover:text-foreground font-medium">
								Payload
							</summary>
							<pre className="mt-1 p-2 bg-muted rounded overflow-x-auto text-[10px]">
								{JSON.stringify(inst.payload, null, 2)}
							</pre>
						</details>
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
// Main Page
// ──────────────────────────────────────────────

export default function EventsPage() {
	const [tab, setTab] = useState("templates");

	// Templates state
	const { data: tplData, isLoading: tplLoading } = useListTemplates();
	const [tplFormOpen, setTplFormOpen] = useState(false);
	const [editTpl, setEditTpl] = useState<EventTemplate | null>(null);
	const [dispatchTpl, setDispatchTpl] = useState<EventTemplate | null>(null);
	const deleteTplMut = useDeleteTemplate();

	// Instances state
	const [instStatusFilter, setInstStatusFilter] = useState("all");
	const instQueryParams = useMemo<ListInstancesParams>(() => {
		const p: ListInstancesParams = {};
		if (instStatusFilter !== "all")
			p.status = instStatusFilter as InstanceStatus;
		return p;
	}, [instStatusFilter]);
	const { data: instData, isLoading: instLoading } =
		useListInstances(instQueryParams);
	const [viewInstId, setViewInstId] = useState<string | null>(null);

	// Accounts for template form
	const { data: accountData } = useListAccounts({ limit: 500 });
	const accounts = useMemo(() => {
		if (!accountData) return [];
		if (Array.isArray(accountData)) return accountData as CoaAccount[];
		if (accountData.data && Array.isArray(accountData.data))
			return accountData.data;
		return [];
	}, [accountData]);

	const templates = tplData ?? [];
	const instances = instData ?? [];

	return (
		<div className="min-h-full flex flex-col">
			<DashboardPageHeader title="events" />

			<div className="p-6 flex-1 flex flex-col">
				<Tabs
					value={tab}
					onValueChange={setTab}
					className="flex-1 flex flex-col">
					<TabsList className="w-fit mb-4">
						<TabsTrigger value="templates" className="gap-1.5">
							<LayoutTemplate className="size-3.5" /> Templates
						</TabsTrigger>
						<TabsTrigger value="instances" className="gap-1.5">
							<Activity className="size-3.5" /> Instances
						</TabsTrigger>
					</TabsList>

					{/* ─── Templates Tab ─── */}
					<TabsContent
						value="templates"
						className="flex-1 flex flex-col gap-4 mt-0">
						<div className="flex items-center justify-between">
							<p className="text-sm text-muted-foreground">
								Manage event templates that define how business events produce
								journal entries.
							</p>
							<Button
								size="sm"
								className="h-8 text-xs"
								onClick={() => {
									setEditTpl(null);
									setTplFormOpen(true);
								}}>
								<Plus className="size-3.5" /> New Template
							</Button>
						</div>

						<div className="rounded-xl border bg-card shadow-sm flex-1">
							{tplLoading ? (
								<div className="p-6 space-y-4">
									{Array.from({ length: 5 }).map((_, i) => (
										<div key={i} className="flex items-center gap-4">
											<Skeleton className="h-4 w-28" />
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-4 flex-1" />
											<Skeleton className="h-4 w-16" />
										</div>
									))}
								</div>
							) : templates.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-20 text-center">
									<div className="size-16 rounded-full bg-muted flex items-center justify-center mb-3">
										<LayoutTemplate className="size-7 text-muted-foreground" />
									</div>
									<h3 className="text-base font-medium mb-1">
										No templates yet
									</h3>
									<p className="text-sm text-muted-foreground max-w-xs mb-4">
										Create event templates to automate journal entries from
										business actions.
									</p>
									<Button
										size="sm"
										onClick={() => {
											setEditTpl(null);
											setTplFormOpen(true);
										}}>
										<Plus className="size-3.5" /> New Template
									</Button>
								</div>
							) : (
								<>
									<Table>
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead className="font-medium text-xs pl-6">
													Name
												</TableHead>
												<TableHead className="font-medium text-xs">
													Orchid
												</TableHead>
												<TableHead className="font-medium text-xs">
													Prefix
												</TableHead>
												<TableHead className="font-medium text-xs">
													Plugins
												</TableHead>
												<TableHead className="font-medium text-xs">
													Lines
												</TableHead>
												<TableHead className="font-medium text-xs">
													Status
												</TableHead>
												<TableHead className="font-medium text-xs pr-6 w-36" />
											</TableRow>
										</TableHeader>
										<TableBody>
											{templates.map((tpl) => (
												<TableRow key={tpl._id}>
													<TableCell className="pl-6 text-sm font-medium">
														{tpl.name}
													</TableCell>
													<TableCell>
														<Badge
															variant="outline"
															className="font-mono text-[10px]">
															{tpl.orchid}
														</Badge>
													</TableCell>
													<TableCell className="text-sm font-mono text-muted-foreground">
														{tpl.referenceConfig.prefix}-
													</TableCell>
													<TableCell className="text-xs">
														{tpl.plugins.join(", ")}
													</TableCell>
													<TableCell className="text-xs text-muted-foreground">
														{tpl.linesRule.length} rules
													</TableCell>
													<TableCell>
														{tpl.isActive ? (
															<Badge
																variant="secondary"
																className="text-[10px] bg-green-100 text-green-700 gap-1">
																<Power className="size-3" />
																Active
															</Badge>
														) : (
															<Badge
																variant="secondary"
																className="text-[10px] gap-1">
																<PowerOff className="size-3" />
																Disabled
															</Badge>
														)}
													</TableCell>
													<TableCell className="pr-6">
														<div className="flex items-center gap-1 justify-end">
															<Button
																variant="ghost"
																size="sm"
																className="h-7 text-xs gap-1"
																onClick={() => setDispatchTpl(tpl)}>
																<Send className="size-3" /> Dispatch
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="size-7"
																onClick={() => {
																	setEditTpl(tpl);
																	setTplFormOpen(true);
																}}>
																<Pencil className="size-3.5" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="size-7 text-destructive hover:text-destructive"
																disabled={deleteTplMut.isPending}
																onClick={async () => {
																	try {
																		await deleteTplMut.mutateAsync(tpl.orchid);
																		toast.success("Template disabled.");
																	} catch {
																		toast.error("Failed to delete template.");
																	}
																}}>
																<Trash2 className="size-3.5" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</>
							)}
						</div>

						{/* TODO: server pagination when API supports it */}
					</TabsContent>

					{/* ─── Instances Tab ─── */}
					<TabsContent
						value="instances"
						className="flex-1 flex flex-col gap-4 mt-0">
						<div className="flex items-center justify-between">
							<p className="text-sm text-muted-foreground">
								Event instances created by dispatching templates.
							</p>
							<Select
								value={instStatusFilter}
								onValueChange={setInstStatusFilter}>
								<SelectTrigger className="h-8 w-36 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="PENDING">Pending</SelectItem>
									<SelectItem value="PROCESSED">Processed</SelectItem>
									<SelectItem value="FAILED">Failed</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="rounded-xl border bg-card shadow-sm flex-1">
							{instLoading ? (
								<div className="p-6 space-y-4">
									{Array.from({ length: 5 }).map((_, i) => (
										<div key={i} className="flex items-center gap-4">
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-4 flex-1" />
											<Skeleton className="h-4 w-16" />
										</div>
									))}
								</div>
							) : instances.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-20 text-center">
									<div className="size-16 rounded-full bg-muted flex items-center justify-center mb-3">
										<Activity className="size-7 text-muted-foreground" />
									</div>
									<h3 className="text-base font-medium mb-1">No instances</h3>
									<p className="text-sm text-muted-foreground max-w-xs">
										Dispatch an event template to see instances here.
									</p>
								</div>
							) : (
								<>
									<Table>
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead className="font-medium text-xs pl-6">
													Reference
												</TableHead>
												<TableHead className="font-medium text-xs">
													Type
												</TableHead>
												<TableHead className="font-medium text-xs">
													Status
												</TableHead>
												<TableHead className="font-medium text-xs">
													Plugins
												</TableHead>
												<TableHead className="font-medium text-xs">
													Processed
												</TableHead>
												<TableHead className="font-medium text-xs pr-6 w-16" />
											</TableRow>
										</TableHeader>
										<TableBody>
											{instances.map((inst) => (
												<TableRow key={inst._id}>
													<TableCell className="pl-6 text-sm font-mono">
														{inst.reference}
													</TableCell>
													<TableCell>
														<Badge
															variant="outline"
															className="font-mono text-[10px]">
															{inst.type}
														</Badge>
													</TableCell>
													<TableCell>
														<InstanceStatusBadge status={inst.status} />
													</TableCell>
													<TableCell className="text-xs">
														{(inst.results ?? []).map((r, i) => (
															<span
																key={i}
																className={cn(
																	"inline-block mr-1",
																	r.success ? "text-green-600" : "text-red-600",
																)}>
																{r.plugin}
																{r.success ? "✓" : "✗"}
															</span>
														))}
													</TableCell>
													<TableCell className="text-xs text-muted-foreground">
														{formatDate(inst.processedAt)}
													</TableCell>
													<TableCell className="pr-6">
														<Button
															variant="ghost"
															size="icon"
															className="size-7"
															onClick={() => setViewInstId(inst._id)}>
															<Eye className="size-3.5" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</>
							)}
						</div>
					</TabsContent>
				</Tabs>
			</div>

			{/* Dialogs */}
			{tplFormOpen && (
				<TemplateFormDialog
					open
					onOpenChange={(v) => {
						if (!v) {
							setTplFormOpen(false);
							setEditTpl(null);
						}
					}}
					editTemplate={editTpl}
					accounts={accounts}
				/>
			)}
			{dispatchTpl && (
				<DispatchDialog
					open
					onOpenChange={(v) => {
						if (!v) setDispatchTpl(null);
					}}
					template={dispatchTpl}
				/>
			)}
			{viewInstId && (
				<InstanceDetailDialog
					open
					onOpenChange={(v) => {
						if (!v) setViewInstId(null);
					}}
					instanceId={viewInstId}
				/>
			)}
		</div>
	);
}
