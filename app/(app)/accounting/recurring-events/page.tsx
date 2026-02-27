"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	Plus,
	Loader2,
	RefreshCw,
	Trash2,
	Clock,
	CalendarDays,
	Power,
	PowerOff,
	Timer,
} from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
	useListRecurring,
	useCreateRecurring,
	useDeleteRecurring,
	useListTemplates,
	type RecurringEvent,
	type EventTemplate,
	type ScheduleType,
} from "@/lib/queries/events";

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

const SCHEDULE_LABELS: Record<ScheduleType, string> = {
	daily: "Daily",
	weekly: "Weekly",
	monthly: "Monthly",
	calendar_monthly: "Calendar Monthly",
};

function scheduleDescription(rec: RecurringEvent) {
	const s = rec.schedule;
	const label = SCHEDULE_LABELS[s.type] ?? s.type;
	const time = s.time ? ` at ${s.time}` : "";
	if (s.type === "weekly" && s.dayOfWeek !== undefined) {
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		return `${label} on ${days[s.dayOfWeek]}${time}`;
	}
	if ((s.type === "monthly" || s.type === "calendar_monthly") && s.dayOfMonth) {
		return `${label} on day ${s.dayOfMonth}${time}`;
	}
	return `${label}${time}`;
}

// ──────────────────────────────────────────────
// Create Recurring Dialog
// ──────────────────────────────────────────────

type RecurringFormValues = {
	templateId: string;
	scheduleType: string;
	time: string;
	dayOfWeek: string;
	dayOfMonth: string;
	startAt: string;
	endAt: string;
	maxRuns: string;
	payloadJson: string;
};

function CreateRecurringDialog({
	open,
	onOpenChange,
	templates,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	templates: EventTemplate[];
}) {
	const createMut = useCreateRecurring();

	const form = useForm<RecurringFormValues>({
		defaultValues: {
			templateId: "",
			scheduleType: "daily",
			time: "02:30",
			dayOfWeek: "1",
			dayOfMonth: "1",
			startAt: new Date().toISOString().slice(0, 10),
			endAt: "",
			maxRuns: "",
			payloadJson: "{\n  \n}",
		},
	});

	const scheduleType = form.watch("scheduleType");

	async function onSubmit(values: RecurringFormValues) {
		if (!values.templateId) {
			form.setError("templateId", { message: "Select a template." });
			return;
		}

		let payload: Record<string, unknown>;
		try {
			payload = JSON.parse(values.payloadJson);
		} catch {
			toast.error("Invalid JSON payload.");
			return;
		}

		const schedule: Record<string, unknown> = {
			type: values.scheduleType,
		};
		if (values.time) schedule.time = values.time;
		if (values.scheduleType === "weekly") schedule.dayOfWeek = parseInt(values.dayOfWeek);
		if (values.scheduleType === "monthly" || values.scheduleType === "calendar_monthly")
			schedule.dayOfMonth = parseInt(values.dayOfMonth);

		try {
			await createMut.mutateAsync({
				templateId: values.templateId,
				schedule: schedule as RecurringEvent["schedule"],
				payload,
				startAt: new Date(values.startAt).toISOString(),
				endAt: values.endAt ? new Date(values.endAt).toISOString() : undefined,
				maxRuns: values.maxRuns ? parseInt(values.maxRuns) : undefined,
			});
			toast.success("Recurring event created.");
			onOpenChange(false);
		} catch {
			toast.error("Failed to create recurring event.");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>New Recurring Event</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField control={form.control} name="templateId" render={({ field }) => (
							<FormItem>
								<FormLabel>Event Template</FormLabel>
								<Select value={field.value} onValueChange={field.onChange}>
									<FormControl>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select template" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{templates.filter((t) => t.isActive).map((t) => (
											<SelectItem key={t._id} value={t._id}>
												{t.name} ({t.orchid})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)} />

						<div className="grid grid-cols-2 gap-4">
							<FormField control={form.control} name="scheduleType" render={({ field }) => (
								<FormItem>
									<FormLabel>Schedule</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
										<SelectContent>
											<SelectItem value="daily">Daily</SelectItem>
											<SelectItem value="weekly">Weekly</SelectItem>
											<SelectItem value="monthly">Monthly</SelectItem>
											<SelectItem value="calendar_monthly">Calendar Monthly</SelectItem>
										</SelectContent>
									</Select>
								</FormItem>
							)} />
							<FormField control={form.control} name="time" render={({ field }) => (
								<FormItem>
									<FormLabel>Time</FormLabel>
									<FormControl><Input type="time" {...field} /></FormControl>
								</FormItem>
							)} />
						</div>

						{scheduleType === "weekly" && (
							<FormField control={form.control} name="dayOfWeek" render={({ field }) => (
								<FormItem>
									<FormLabel>Day of Week</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
										<SelectContent>
											{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
												<SelectItem key={i} value={String(i)}>{d}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormItem>
							)} />
						)}

						{(scheduleType === "monthly" || scheduleType === "calendar_monthly") && (
							<FormField control={form.control} name="dayOfMonth" render={({ field }) => (
								<FormItem>
									<FormLabel>Day of Month</FormLabel>
									<FormControl><Input type="number" min="1" max="31" {...field} /></FormControl>
								</FormItem>
							)} />
						)}

						<div className="grid grid-cols-2 gap-4">
							<FormField control={form.control} name="startAt" render={({ field }) => (
								<FormItem>
									<FormLabel>Start Date</FormLabel>
									<FormControl><Input type="date" {...field} /></FormControl>
								</FormItem>
							)} />
							<FormField control={form.control} name="endAt" render={({ field }) => (
								<FormItem>
									<FormLabel>End Date (optional)</FormLabel>
									<FormControl><Input type="date" {...field} /></FormControl>
								</FormItem>
							)} />
						</div>

						<FormField control={form.control} name="maxRuns" render={({ field }) => (
							<FormItem>
								<FormLabel>Max Runs (optional)</FormLabel>
								<FormControl><Input type="number" min="1" placeholder="Unlimited" {...field} /></FormControl>
							</FormItem>
						)} />

						<FormField control={form.control} name="payloadJson" render={({ field }) => (
							<FormItem>
								<FormLabel>Event Payload (JSON)</FormLabel>
								<FormControl>
									<Textarea className="font-mono text-xs min-h-[100px]" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)} />

						<DialogFooter>
							<DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
							<Button type="submit" disabled={createMut.isPending}>
								{createMut.isPending
									? <><Loader2 className="size-4 animate-spin" />Creating...</>
									: <><Timer className="size-4" />Create Schedule</>}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function RecurringEventsPage() {
	const { data: recurringData, isLoading, refetch } = useListRecurring();
	const { data: tplData } = useListTemplates();
	const deleteMut = useDeleteRecurring();
	const [createOpen, setCreateOpen] = useState(false);

	const recurrences = recurringData ?? [];
	const templates = tplData ?? [];

	const templateMap = useMemo(() => {
		const m = new Map<string, EventTemplate>();
		templates.forEach((t) => m.set(t._id, t));
		return m;
	}, [templates]);

	return (
		<div className="min-h-full flex flex-col">
			<DashboardPageHeader title="recurring events" />

			<div className="p-6 flex-1 flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold">Scheduled Recurrences</h2>
						<p className="text-sm text-muted-foreground">
							Automatically dispatch events on a schedule.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()} disabled={isLoading}>
							<RefreshCw className="size-3.5" /> Refresh
						</Button>
						<Button size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
							<Plus className="size-3.5" /> New Schedule
						</Button>
					</div>
				</div>

				<div className="rounded-xl border bg-card shadow-sm flex-1">
					{isLoading ? (
						<div className="p-6 space-y-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="flex items-center gap-4">
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-4 w-36" />
									<Skeleton className="h-4 flex-1" />
									<Skeleton className="h-4 w-16" />
								</div>
							))}
						</div>
					) : recurrences.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 text-center">
							<div className="size-16 rounded-full bg-muted flex items-center justify-center mb-3">
								<CalendarDays className="size-7 text-muted-foreground" />
							</div>
							<h3 className="text-base font-medium mb-1">No recurring events</h3>
							<p className="text-sm text-muted-foreground max-w-xs mb-4">
								Create a schedule to automatically dispatch events at regular intervals.
							</p>
							<Button size="sm" onClick={() => setCreateOpen(true)}>
								<Plus className="size-3.5" /> New Schedule
							</Button>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="font-medium text-xs pl-6">Template</TableHead>
									<TableHead className="font-medium text-xs">Schedule</TableHead>
									<TableHead className="font-medium text-xs">Next Run</TableHead>
									<TableHead className="font-medium text-xs">Last Run</TableHead>
									<TableHead className="font-medium text-xs">Runs</TableHead>
									<TableHead className="font-medium text-xs">Status</TableHead>
									<TableHead className="font-medium text-xs pr-6 w-16" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{recurrences.map((rec) => {
									const tpl = templateMap.get(rec.templateId);
									return (
										<TableRow key={rec._id}>
											<TableCell className="pl-6">
												<div>
													<span className="text-sm font-medium">{tpl?.name ?? "Unknown"}</span>
													{tpl && <Badge variant="outline" className="ml-2 font-mono text-[10px]">{tpl.orchid}</Badge>}
												</div>
											</TableCell>
											<TableCell className="text-sm">
												<div className="flex items-center gap-1.5">
													<Clock className="size-3.5 text-muted-foreground" />
													{scheduleDescription(rec)}
												</div>
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">{formatDate(rec.nextRun)}</TableCell>
											<TableCell className="text-xs text-muted-foreground">{formatDate(rec.lastRun)}</TableCell>
											<TableCell className="text-xs font-mono">
												{rec.runCount}{rec.maxRuns ? ` / ${rec.maxRuns}` : ""}
											</TableCell>
											<TableCell>
												{rec.enabled
													? <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 gap-1"><Power className="size-3" />Enabled</Badge>
													: <Badge variant="secondary" className="text-[10px] gap-1"><PowerOff className="size-3" />Disabled</Badge>}
											</TableCell>
											<TableCell className="pr-6">
												<Button
													variant="ghost" size="icon"
													className="size-7 text-destructive hover:text-destructive"
													disabled={deleteMut.isPending}
													onClick={async () => {
														try {
															await deleteMut.mutateAsync(rec._id);
															toast.success("Recurring event disabled.");
														} catch { toast.error("Failed to disable schedule."); }
													}}
												>
													<Trash2 className="size-3.5" />
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</div>
			</div>

			{createOpen && (
				<CreateRecurringDialog
					open
					onOpenChange={(v) => { if (!v) setCreateOpen(false); }}
					templates={templates}
				/>
			)}
		</div>
	);
}
