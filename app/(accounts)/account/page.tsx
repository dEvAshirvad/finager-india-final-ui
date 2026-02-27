"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	Chrome,
	Globe,
	Loader2,
	KeyRound,
	ShieldCheck,
	X,
	Monitor,
} from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
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
import {
	useGetSession,
	useUpdateUser,
	useListSessions,
	useRevokeSession,
	useRevokeSessions,
	useChangePassword,
	type Session,
} from "@/lib/queries/auth";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function parseBrowser(ua: string): { name: string; icon: typeof Chrome } {
	const lower = ua.toLowerCase();
	if (lower.includes("firefox"))
		return { name: "Mozilla Firefox", icon: Globe };
	if (lower.includes("safari") && !lower.includes("chrome"))
		return { name: "Safari", icon: Globe };
	if (lower.includes("edg")) return { name: "Microsoft Edge", icon: Globe };
	if (lower.includes("chrome")) return { name: "Google Chrome", icon: Chrome };
	return { name: "Unknown Browser", icon: Monitor };
}

function formatActivity(session: Session, currentToken: string | undefined) {
	if (session.token === currentToken) return "Current Session";
	return new Date(session.updatedAt).toLocaleDateString("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

// ──────────────────────────────────────────────
// Setting row (reusable)
// ──────────────────────────────────────────────

function SettingRow({
	label,
	description,
	action,
}: {
	label: string;
	description: string;
	action: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-8 py-5 px-6">
			<div className="flex-1 min-w-0 space-y-0.5">
				<p className="font-medium text-sm">{label}</p>
				<p className="text-xs text-muted-foreground">{description}</p>
			</div>
			<div className="shrink-0">{action}</div>
		</div>
	);
}

// ──────────────────────────────────────────────
// Edit Name Dialog
// ──────────────────────────────────────────────

function EditNameDialog({
	open,
	onOpenChange,
	currentName,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	currentName: string;
}) {
	const updateUser = useUpdateUser();
	const form = useForm({ defaultValues: { name: currentName } });

	async function onSubmit(values: { name: string }) {
		if (values.name.trim().length < 2) {
			form.setError("name", { message: "Name must be at least 2 characters." });
			return;
		}
		try {
			await updateUser.mutateAsync({ name: values.name.trim() });
			toast.success("Name updated successfully.");
			onOpenChange(false);
		} catch {
			toast.error("Failed to update name.");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Name</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Full Name</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" type="button">
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit" disabled={updateUser.isPending}>
								{updateUser.isPending ? "Saving..." : "Save"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

// ──────────────────────────────────────────────
// Change Password Dialog
// ──────────────────────────────────────────────

function ChangePasswordDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const changePassword = useChangePassword();
	const form = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	});

	async function onSubmit(values: {
		currentPassword: string;
		newPassword: string;
		confirmPassword: string;
	}) {
		if (values.newPassword.length < 8) {
			form.setError("newPassword", {
				message: "Must be at least 8 characters.",
			});
			return;
		}
		if (values.newPassword !== values.confirmPassword) {
			form.setError("confirmPassword", { message: "Passwords do not match." });
			return;
		}
		try {
			await changePassword.mutateAsync({
				currentPassword: values.currentPassword,
				newPassword: values.newPassword,
				revokeOtherSessions: true,
			});
			toast.success("Password changed successfully.");
			form.reset();
			onOpenChange(false);
		} catch {
			toast.error("Failed to change password. Check your current password.");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Change Password</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="currentPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Current Password</FormLabel>
									<FormControl>
										<Input type="password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="newPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>New Password</FormLabel>
									<FormControl>
										<Input type="password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm New Password</FormLabel>
									<FormControl>
										<Input type="password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" type="button">
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit" disabled={changePassword.isPending}>
								{changePassword.isPending ? "Updating..." : "Change Password"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

// ──────────────────────────────────────────────
// Sessions Table
// ──────────────────────────────────────────────

function SessionsTable({
	sessions,
	currentToken,
	isLoading,
}: {
	sessions: Session[];
	currentToken: string | undefined;
	isLoading: boolean;
}) {
	const revokeSession = useRevokeSession();

	if (isLoading) {
		return (
			<div className="space-y-4 px-6 py-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="flex items-center gap-6">
						<Skeleton className="size-8 rounded-full" />
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-4 w-24" />
					</div>
				))}
			</div>
		);
	}

	if (!sessions.length) {
		return (
			<div className="px-6 py-8 text-center text-sm text-muted-foreground">
				No active sessions found.
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow className="hover:bg-transparent">
					<TableHead className="font-medium py-3 pl-6">Browser</TableHead>
					<TableHead className="font-medium py-3">
						Most recent activity
					</TableHead>
					<TableHead className="font-medium py-3">IP Address</TableHead>
					<TableHead className="font-medium py-3 pr-6 w-12" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{sessions.map((session) => {
					const browser = parseBrowser(session.userAgent);
					const isCurrent = session.token === currentToken;
					const BrowserIcon = browser.icon;

					return (
						<TableRow key={session.id}>
							<TableCell className="pl-6">
								<div className="flex items-center gap-3">
									<div className="size-8 rounded-full bg-accent flex items-center justify-center shrink-0">
										<BrowserIcon className="size-4 text-muted-foreground" />
									</div>
									<div>
										<span className="text-sm font-medium">{browser.name}</span>
										{isCurrent && (
											<Badge variant="secondary" className="ml-2 text-[10px]">
												Current
											</Badge>
										)}
									</div>
								</div>
							</TableCell>
							<TableCell className="text-sm text-muted-foreground">
								{formatActivity(session, currentToken)}
							</TableCell>
							<TableCell className="text-sm font-mono text-muted-foreground">
								{session.ipAddress || "—"}
							</TableCell>
							<TableCell className="pr-6">
								{!isCurrent && (
									<button
										type="button"
										className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer disabled:opacity-50"
										disabled={revokeSession.isPending}
										onClick={async () => {
											try {
												await revokeSession.mutateAsync({
													token: session.token,
												});
												toast.success("Session revoked.");
											} catch {
												toast.error("Failed to revoke session.");
											}
										}}>
										<X className="size-4" />
									</button>
								)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function AccountPage() {
	const { data: sessionData, isLoading: sessionLoading } = useGetSession();
	const { data: sessions, isLoading: sessionsLoading } = useListSessions();
	const revokeSessions = useRevokeSessions();

	const [editNameOpen, setEditNameOpen] = useState(false);
	const [changePasswordOpen, setChangePasswordOpen] = useState(false);

	const user = sessionData?.user;
	const currentToken = sessionData?.session?.token;

	return (
		<div className="min-h-full">
			<DashboardPageHeader title="account" />

			<div className="p-6 space-y-6">
				{/* Profile Section */}
				<div>
					<h2 className="text-lg font-semibold">Profile</h2>
					<p className="text-sm text-muted-foreground mb-4">
						Manage your personal information.
					</p>

					<div className="rounded-xl border bg-card shadow-sm divide-y">
						{sessionLoading ? (
							<div className="py-5 px-6 space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-56" />
							</div>
						) : (
							<>
								<SettingRow
									label="Full Name"
									description="Your display name across the platform."
									action={
										<div className="flex items-center gap-4">
											<span className="text-sm">{user?.name ?? "—"}</span>
											<Button
												variant="outline"
												size="sm"
												onClick={() => setEditNameOpen(true)}>
												Edit
											</Button>
										</div>
									}
								/>
								<SettingRow
									label="Email"
									description="Your primary email address."
									action={
										<div className="flex items-center gap-2">
											<span className="text-sm">{user?.email ?? "—"}</span>
											{user?.emailVerified && (
												<Badge
													variant="secondary"
													className="text-[10px] bg-green-100 text-green-700">
													Verified
												</Badge>
											)}
										</div>
									}
								/>
								<SettingRow
									label="Role"
									description="Your role in the system."
									action={
										<Badge variant="outline" className="uppercase">
											{user?.role ?? "—"}
										</Badge>
									}
								/>
							</>
						)}
					</div>
				</div>

				<Separator />

				{/* Security Section */}
				<div>
					<h2 className="text-lg font-semibold">Security</h2>
					<p className="text-sm text-muted-foreground mb-4">
						Manage your account security settings.
					</p>

					<div className="rounded-xl border bg-card shadow-sm divide-y">
						<SettingRow
							label="Change Password"
							description="Update password for enhanced account security."
							action={
								<Button
									variant="outline"
									size="sm"
									onClick={() => setChangePasswordOpen(true)}>
									<KeyRound className="size-3.5" />
									Change Password
								</Button>
							}
						/>
						<SettingRow
							label="Two-factor Authentication"
							description="Add an extra layer of protection to your account."
							action={
								<Button
									variant="outline"
									size="sm"
									onClick={() => toast.info("Coming soon.")}>
									<ShieldCheck className="size-3.5" />
									Manage Authentication
								</Button>
							}
						/>
					</div>
				</div>

				<Separator />

				{/* Active Sessions Section */}
				<div>
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-lg font-semibold">Active Sessions</h2>
							<p className="text-sm text-muted-foreground">
								Monitor and manage all your active sessions.
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
							disabled={revokeSessions.isPending}
							onClick={async () => {
								try {
									await revokeSessions.mutateAsync();
									toast.success("All sessions logged out.");
								} catch {
									toast.error("Failed to log out all sessions.");
								}
							}}>
							{revokeSessions.isPending ? (
								<>
									<Loader2 className="size-3.5 animate-spin" />
									Logging out...
								</>
							) : (
								"Log Out All Sessions"
							)}
						</Button>
					</div>

					<div className="rounded-xl border bg-card shadow-sm">
						<SessionsTable
							sessions={sessions ?? []}
							currentToken={currentToken}
							isLoading={sessionsLoading}
						/>
					</div>
				</div>
			</div>

			{/* Dialogs */}
			{user && editNameOpen && (
				<EditNameDialog
					open
					onOpenChange={(v) => !v && setEditNameOpen(false)}
					currentName={user.name}
				/>
			)}
			{changePasswordOpen && (
				<ChangePasswordDialog
					open
					onOpenChange={(v) => !v && setChangePasswordOpen(false)}
				/>
			)}
		</div>
	);
}
