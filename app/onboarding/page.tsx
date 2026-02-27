"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
	useChooseRole,
	useVerifyCa,
	useGenerateOrgCode,
	useCompleteOnboarding,
} from "@/lib/queries/onboarding";
import {
	useCheckSlug,
	useCreateOrganization,
	useSetActiveOrganization,
	useInviteMember,
	useAcceptInvitation,
	useListUserInvitations,
	type UserInvitation,
} from "@/lib/queries/organization";
import { useGetSession } from "@/lib/queries/auth";
import { CheckCircle, Building2, UserPlus, Loader2 } from "lucide-react";

// Step schemas (validate one step at a time)
const stepSchemas = {
	role: z.object({
		role: z.enum(["ca", "owner"], {
			message: "Please select your role",
		}),
	}),
	path: z.object({
		path: z.enum(["create_org", "join_invitation"], {
			message: "Please choose an option",
		}),
	}),
	ca_id: z.object({
		caId: z.string().min(1, "CA ID is required"),
	}),
	invitation: z.object({
		invitationCode: z.string().optional(),
	}),
	org: z.object({
		orgName: z.string().min(1, "Organization name is required"),
		slug: z
			.string()
			.min(1, "Slug is required")
			.regex(/^[a-z0-9-]+$/, "Use only lowercase letters, numbers and hyphens"),
		gstin: z.string().min(1, "GSTIN is required"),
		industry: z
			.enum(["serviceBased", "retail", "manufacturing"])
			.optional()
			.default("retail"),
		pan: z.string().optional(),
		financialYearStart: z.string().min(1, "Financial year is required"),
	}),
	invite: z.object({
		inviteEmails: z.string().optional(),
	}),
};

type StepKey = keyof typeof stepSchemas;

type OnboardingValues = {
	role: string;
	path: string;
	caId: string;
	invitationCode: string;
	orgName: string;
	slug: string;
	gstin: string;
	industry: string;
	pan: string;
	financialYearStart: string;
	inviteEmails: string;
};

const defaultValues: OnboardingValues = {
	role: "",
	path: "",
	caId: "",
	invitationCode: "",
	orgName: "",
	slug: "",
	gstin: "",
	industry: "retail",
	pan: "",
	financialYearStart: "2025-2026",
	inviteEmails: "",
};

const INDUSTRY_OPTIONS = [
	{ value: "serviceBased", label: "Service based" },
	{ value: "retail", label: "Retail" },
	{ value: "manufacturing", label: "Manufacturing" },
] as const;

function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

/** Derive PAN from GSTIN (positions 2–12). */
function panFromGstin(gstin: string): string {
	const t = gstin.trim();
	return t.length >= 12 ? t.slice(2, 12) : "";
}

const SLUG_DEBOUNCE_MS = 1000;
const SLUG_CHECK_DEBOUNCE_MS = 1000;

/**
 * Step keys for the flow. Skips ca_id when user already has caId (e.g. from session).
 */
function getStepKeys(
	role: string,
	path: string,
	userCaId?: string | null,
): StepKey[] {
	if (!role) return ["role"];
	if (!path) return ["role", "path"];
	if (path === "join_invitation") return ["role", "path", "invitation"];
	// create_org: skip ca_id if user already has caId
	const needsCaId = role === "ca" && !userCaId;
	return [
		"role",
		"path",
		...(needsCaId ? (["ca_id"] as const) : []),
		"org",
		"invite",
	];
}

const stepTitles: Record<StepKey, string> = {
	role: "Choose role",
	path: "How do you want to start?",
	ca_id: "Verify CA ID",
	invitation: "Join with invitation",
	org: "Create organization",
	invite: "Invite members",
};

type SlugStatus = "idle" | "checking" | "available" | "taken";

type StepKeyOrDone = StepKey | "done";

export default function OnboardingPage() {
	const router = useRouter();
	const [currentStepKey, setCurrentStepKey] = useState<StepKeyOrDone>("role");
	const [createdOrganizationId, setCreatedOrganizationId] = useState<
		string | null
	>(null);
	const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
	const nameToSlugTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const slugCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const form = useForm<OnboardingValues>({
		defaultValues,
		mode: "onTouched",
	});

	const { data: sessionData } = useGetSession();
	const chooseRoleMutation = useChooseRole();
	const verifyCaMutation = useVerifyCa();
	const checkSlugMutation = useCheckSlug();
	const generateOrgCodeMutation = useGenerateOrgCode();
	const createOrgMutation = useCreateOrganization();
	const setActiveOrgMutation = useSetActiveOrganization();
	const inviteMemberMutation = useInviteMember();
	const acceptInvitationMutation = useAcceptInvitation();
	const completeOnboardingMutation = useCompleteOnboarding();
	const { data: userInvitationsData, isLoading: userInvitationsLoading } =
		useListUserInvitations();

	const role = form.watch("role");
	const path = form.watch("path");
	const orgName = form.watch("orgName");
	const slug = form.watch("slug");

	const user = sessionData?.user ?? null;
	const stepKeys = useMemo(
		() => getStepKeys(role ?? "", path ?? "", user?.caId ?? null),
		[role, path, user?.caId],
	);

	// Sync form and initial step from session (user.role, user.caId) so we auto-progress
	const hasSyncedFromSession = useRef(false);
	useEffect(() => {
		if (!sessionData?.user || hasSyncedFromSession.current) return;
		const u = sessionData.user;
		if (u.role !== "ca" && u.role !== "owner") return;
		hasSyncedFromSession.current = true;
		form.setValue("role", u.role);
		if (u.caId) form.setValue("caId", u.caId);
		// Only jump to path step if still on first step (don’t override if user already progressed)
		if (currentStepKey === "role") setCurrentStepKey("path");
	}, [sessionData?.user, form]);

	useEffect(() => {
		if (currentStepKey === "done") return;
		if (stepKeys.includes(currentStepKey as StepKey)) return;
		setCurrentStepKey(
			currentStepKey === "ca_id" ? "org" : (stepKeys[0] ?? "role"),
		);
	}, [currentStepKey, stepKeys]);

	const resolvedStepKey: StepKey | null =
		currentStepKey === "done"
			? null
			: stepKeys.includes(currentStepKey as StepKey)
				? (currentStepKey as StepKey)
				: currentStepKey === "ca_id"
					? "org"
					: (stepKeys[0] ?? "role");
	const step =
		currentStepKey === "done"
			? stepKeys.length
			: stepKeys.indexOf(resolvedStepKey ?? "role");
	const isFirstStep = step <= 0;
	const isLastStep = step === stepKeys.length - 1;
	const isOnOrgStep = resolvedStepKey === "org";

	// Debounce: org name → auto-fill slug
	useEffect(() => {
		if (!isOnOrgStep || !orgName?.trim()) return;
		if (nameToSlugTimeoutRef.current)
			clearTimeout(nameToSlugTimeoutRef.current);
		nameToSlugTimeoutRef.current = setTimeout(() => {
			const next = slugify(orgName);
			if (next) form.setValue("slug", next);
			nameToSlugTimeoutRef.current = null;
		}, SLUG_DEBOUNCE_MS);
		return () => {
			if (nameToSlugTimeoutRef.current)
				clearTimeout(nameToSlugTimeoutRef.current);
		};
	}, [orgName, isOnOrgStep, form]);

	// Debounce: slug → check availability
	useEffect(() => {
		if (!isOnOrgStep || !slug?.trim()) {
			setSlugStatus("idle");
			return;
		}
		if (slugCheckTimeoutRef.current) clearTimeout(slugCheckTimeoutRef.current);
		setSlugStatus("checking");
		slugCheckTimeoutRef.current = setTimeout(async () => {
			try {
				const res = await checkSlugMutation.mutateAsync({ slug: slug.trim() });
				setSlugStatus(res.status ? "available" : "taken");
			} catch {
				setSlugStatus("idle");
			}
			slugCheckTimeoutRef.current = null;
		}, SLUG_CHECK_DEBOUNCE_MS);
		return () => {
			if (slugCheckTimeoutRef.current)
				clearTimeout(slugCheckTimeoutRef.current);
		};
	}, [slug, isOnOrgStep]);

	const userInvitations = useMemo(() => {
		if (!userInvitationsData) return [];
		if (Array.isArray(userInvitationsData)) return userInvitationsData;
		if (typeof userInvitationsData === "object" && "data" in userInvitationsData)
			return (userInvitationsData as { data: UserInvitation[] }).data ?? [];
		return [];
	}, [userInvitationsData]);

	const pendingInvitations = useMemo(
		() => userInvitations.filter((i) => i.status === "pending"),
		[userInvitations],
	);

	const isSubmitting =
		chooseRoleMutation.isPending ||
		verifyCaMutation.isPending ||
		checkSlugMutation.isPending ||
		generateOrgCodeMutation.isPending ||
		createOrgMutation.isPending ||
		setActiveOrgMutation.isPending ||
		inviteMemberMutation.isPending ||
		acceptInvitationMutation.isPending ||
		completeOnboardingMutation.isPending;

	const validateCurrentStep = async (): Promise<boolean> => {
		if (!resolvedStepKey) return true;
		const schema = stepSchemas[resolvedStepKey];
		const values = form.getValues();
		const result = schema.safeParse(values);
		if (result.success) return true;
		form.clearErrors();
		result.error.issues.forEach((issue) => {
			const pathKey = issue.path[0] as keyof OnboardingValues;
			form.setError(pathKey, { message: issue.message });
		});
		return false;
	};

	const setApiError = (message: string) => {
		toast.error(message);
	};

	const handleAcceptInvitation = async (inv: UserInvitation) => {
		try {
			const acceptRes = await acceptInvitationMutation.mutateAsync({
				invitationId: inv.id,
			});
			const orgId = acceptRes.member.organizationId;
			await setActiveOrgMutation.mutateAsync({ organizationId: orgId });
			await completeOnboardingMutation.mutateAsync({ organizationId: orgId });
			setCurrentStepKey("done");
			setTimeout(() => router.replace("/dashboard"), 1500);
		} catch (err: unknown) {
			let message = "Failed to accept invitation";
			if (err && typeof err === "object" && "response" in err) {
				const res = (err as { response?: { data?: { message?: string } } })
					.response;
				if (res?.data?.message) message = res.data.message;
			} else if (err && typeof err === "object" && "message" in err) {
				message = String((err as { message: unknown }).message);
			}
			setApiError(message);
		}
	};

	const onNext = async () => {
		const ok = await validateCurrentStep();
		if (!ok) return;

		const values = form.getValues();

		try {
			if (resolvedStepKey === "role") {
				await chooseRoleMutation.mutateAsync({
					role: values.role as "ca" | "owner",
				});
				setCurrentStepKey("path");
				return;
			}

			if (resolvedStepKey === "path") {
				const nextIdx = stepKeys.indexOf(resolvedStepKey) + 1;
				setCurrentStepKey((stepKeys[nextIdx] as StepKey) ?? "org");
				return;
			}

			if (resolvedStepKey === "ca_id") {
				await verifyCaMutation.mutateAsync({ caId: values.caId });
				setCurrentStepKey("org");
				return;
			}

			if (resolvedStepKey === "invitation") {
				return;
			}

			if (resolvedStepKey === "org") {
				const slugRes = await checkSlugMutation.mutateAsync({
					slug: values.slug.trim(),
				});
				if (!slugRes.status) {
					form.setError("slug", { message: "This slug is not available" });
					return;
				}
				const codeRes = await generateOrgCodeMutation.mutateAsync({
					name: values.orgName.trim(),
					slug: values.slug.trim(),
				});
				const orgCode = codeRes.data.orgCode;
				const createRes = await createOrgMutation.mutateAsync({
					name: values.orgName.trim(),
					slug: values.slug.trim(),
					gstin: values.gstin.trim(),
					industry: values.industry?.trim() || "retail",
					pan: panFromGstin(values.gstin),
					financialYearStart: values.financialYearStart.trim(),
					orgCode,
				});
				await setActiveOrgMutation.mutateAsync({
					organizationId: createRes.id,
				});
				setCreatedOrganizationId(createRes.id);
				setCurrentStepKey("invite");
				return;
			}

			if (resolvedStepKey === "invite") {
				const activeOrgId =
					createdOrganizationId ?? sessionData?.session?.activeOrganizationId;
				if (!activeOrgId) {
					setApiError("No active organization. Please go back and create one.");
					return;
				}
				const emails =
					values.inviteEmails
						?.split(/[\s,]+/)
						.map((e) => e.trim())
						.filter(Boolean) ?? [];
				for (const email of emails) {
					try {
						await inviteMemberMutation.mutateAsync({
							email,
							role: "owner",
							organizationId: activeOrgId,
						});
					} catch {
						// continue with other emails
					}
				}
				await completeOnboardingMutation.mutateAsync({
					organizationId: activeOrgId,
				});
				setCurrentStepKey("done");
				setTimeout(() => router.replace("/dashboard"), 1500);
			}
		} catch (err: unknown) {
			let message = "Something went wrong";
			if (err && typeof err === "object" && "response" in err) {
				const res = (err as { response?: { data?: { message?: string } } })
					.response;
				if (res?.data?.message) message = res.data.message;
			} else if (err && typeof err === "object" && "message" in err) {
				message = String((err as { message: unknown }).message);
			}
			setApiError(message);
		}
	};

	const onBack = () => {
		form.clearErrors();
		const idx = stepKeys.indexOf(resolvedStepKey ?? "role");
		if (idx > 0) setCurrentStepKey(stepKeys[idx - 1] as StepKey);
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-primary/10">
			<div className="w-full max-w-md border-t-2 border-primary bg-background p-8 shadow-sm">
				<div className="mb-6">
					<h1 className="text-xl font-semibold">
						{currentStepKey === "done"
							? "All set"
							: stepTitles[resolvedStepKey ?? "role"]}
					</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Step {step + 1} of {stepKeys.length}
					</p>
				</div>

				{currentStepKey === "done" ? (
					<div className="text-center text-sm text-muted-foreground animate-in fade-in-0 zoom-in-95 flex flex-col items-center justify-center gap-5 aspect-video">
						<CheckCircle className="size-14 text-primary animate-pulse" />
						<span>You’re all set. Redirecting…</span>
					</div>
				) : (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
							{resolvedStepKey === "role" && (
								<FormField
									control={form.control}
									name="role"
									render={({ field }) => (
										<FormItem>
											<div className="space-y-2">
												<button
													type="button"
													onClick={() => field.onChange("ca")}
													className={cn(
														"flex min-h-[80px] w-full cursor-pointer flex-col justify-center gap-1 rounded-xl border-2 bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-accent/50",
														field.value === "ca"
															? "border-primary bg-primary/5 ring-2 ring-primary/20"
															: "border-input",
													)}>
													<span className="font-semibold">
														Chartered Accountant
													</span>
													<span className="text-muted-foreground text-sm">
														I provide CA and compliance services
													</span>
												</button>
												<button
													type="button"
													onClick={() => field.onChange("owner")}
													className={cn(
														"flex min-h-[80px] w-full cursor-pointer flex-col justify-center gap-1 rounded-xl border-2 bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-accent/50",
														field.value === "owner"
															? "border-primary bg-primary/5 ring-2 ring-primary/20"
															: "border-input",
													)}>
													<span className="font-semibold">Business owner</span>
													<span className="text-muted-foreground text-sm">
														I run a business and need accounting
													</span>
												</button>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{resolvedStepKey === "path" && (
								<FormField
									control={form.control}
									name="path"
									render={({ field }) => (
										<FormItem>
											<div className="space-y-2">
												<button
													type="button"
													onClick={() => field.onChange("create_org")}
													className={cn(
														"flex min-h-[80px] w-full cursor-pointer flex-col justify-center gap-1 rounded-xl border-2 bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-accent/50",
														field.value === "create_org"
															? "border-primary bg-primary/5 ring-2 ring-primary/20"
															: "border-input",
													)}>
													<span className="font-semibold">
														Create a new organization
													</span>
													<span className="text-muted-foreground text-sm">
														I want to create a new organization
													</span>
												</button>
												<button
													type="button"
													onClick={() => field.onChange("join_invitation")}
													className={cn(
														"flex min-h-[80px] w-full cursor-pointer flex-col justify-center gap-1 rounded-xl border-2 bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-accent/50",
														field.value === "join_invitation"
															? "border-primary bg-primary/5 ring-2 ring-primary/20"
															: "border-input",
													)}>
													<span className="font-semibold">
														Join an organization
													</span>
													<span className="text-muted-foreground text-sm">
														I want to join an organization
													</span>
												</button>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{resolvedStepKey === "ca_id" && (
								<FormField
									control={form.control}
									name="caId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>CA ID</FormLabel>
											<FormControl>
												<Input
													placeholder="Enter your CA registration ID"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{resolvedStepKey === "invitation" && (
								<div className="space-y-3">
									<p className="text-muted-foreground text-sm">
										You have been invited to join the following organizations.
										Accept an invitation to continue.
									</p>
									{userInvitationsLoading ? (
										<div className="flex items-center justify-center py-8 text-muted-foreground">
											<Loader2 className="size-6 animate-spin" />
										</div>
									) : pendingInvitations.length === 0 ? (
										<div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
											<UserPlus className="size-10 mx-auto mb-2 opacity-50" />
											<p>No pending invitations.</p>
											<p className="mt-1 text-xs">
												Ask your organization admin to send you an invitation, or
												go back and create a new organization.
											</p>
										</div>
									) : (
										<div className="flex flex-col gap-2">
											{pendingInvitations.map((inv) => (
												<div
													key={inv.id}
													className={cn(
														"flex min-h-[72px] w-full cursor-default items-center justify-between gap-3 rounded-xl border-2 bg-card p-4 text-left shadow-sm transition-colors",
														"border-input hover:border-primary/30 hover:bg-accent/30",
													)}
												>
													<div className="flex min-w-0 flex-1 items-center gap-3">
														<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
															<Building2 className="size-5 text-primary" />
														</div>
														<div className="min-w-0 flex-1">
															<p className="font-semibold truncate">
																{inv.organizationName}
															</p>
															<p className="text-muted-foreground text-xs capitalize">
																Role: {inv.role}
															</p>
															{inv.expiresAt && (
																<p className="text-muted-foreground text-[10px]">
																	Expires{" "}
																	{new Date(inv.expiresAt).toLocaleDateString(
																		"en-IN",
																		{
																			day: "numeric",
																			month: "short",
																			year: "numeric",
																		},
																	)}
																</p>
															)}
														</div>
													</div>
													<Button
														size="sm"
														className="shrink-0"
														disabled={acceptInvitationMutation.isPending}
														onClick={() => handleAcceptInvitation(inv)}
													>
														{acceptInvitationMutation.isPending ? (
															<Loader2 className="size-4 animate-spin" />
														) : (
															"Accept"
														)}
													</Button>
												</div>
											))}
										</div>
									)}
								</div>
							)}

							{resolvedStepKey === "org" && (
								<>
									<FormField
										control={form.control}
										name="orgName"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Organization name</FormLabel>
												<FormControl>
													<Input placeholder="Acme Pvt Ltd" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="slug"
										render={({ field }) => (
											<FormItem>
												<FormLabel>URL slug</FormLabel>
												<FormControl>
													<Input placeholder="acme-pvt-ltd" {...field} />
												</FormControl>
												{slugStatus === "checking" && (
													<p className="text-muted-foreground text-xs">
														Checking availability…
													</p>
												)}
												{slugStatus === "available" && (
													<p className="text-emerald-600 text-xs">
														Slug available
													</p>
												)}
												{slugStatus === "taken" && (
													<p className="text-destructive text-xs">
														This slug is already taken
													</p>
												)}
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="gstin"
										render={({ field }) => (
											<FormItem>
												<FormLabel>GSTIN</FormLabel>
												<FormControl>
													<Input placeholder="22AAAAA0000A1Z5" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="industry"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Industry</FormLabel>
												<Select
													value={field.value || "retail"}
													onValueChange={field.onChange}>
													<FormControl>
														<SelectTrigger className="w-full">
															<SelectValue placeholder="Select industry" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{INDUSTRY_OPTIONS.map((opt) => (
															<SelectItem key={opt.value} value={opt.value}>
																{opt.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="financialYearStart"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Financial year</FormLabel>
												<FormControl>
													<Input placeholder="2025-2026" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</>
							)}

							{resolvedStepKey === "invite" && (
								<FormField
									control={form.control}
									name="inviteEmails"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Invite members (optional)</FormLabel>
											<FormControl>
												<Input
													placeholder="emails@example.com, other@example.com"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							<div className="flex gap-3 pt-4">
								{!isFirstStep && (
									<Button
										type="button"
										className="flex-1"
										variant="outline"
										onClick={onBack}
										disabled={isSubmitting}>
										Back
									</Button>
								)}
								{resolvedStepKey !== "invitation" && (
									<Button
										type="submit"
										className="flex-1"
										disabled={isSubmitting}>
										{isSubmitting
											? "Please wait…"
											: isLastStep
												? "Finish"
												: "Next"}
									</Button>
								)}
							</div>
						</form>
					</Form>
				)}
			</div>
		</div>
	);
}
