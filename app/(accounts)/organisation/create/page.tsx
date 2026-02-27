"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, CheckCircle, Loader2, XCircle } from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
	useCheckSlug,
	useCreateOrganization,
	useSetActiveOrganization,
} from "@/lib/queries/organization";
import { useGenerateOrgCode } from "@/lib/queries/onboarding";
import { useGetSession } from "@/lib/queries/auth";

const INDUSTRY_OPTIONS = [
	{ value: "serviceBased", label: "Service Based" },
	{ value: "retail", label: "Retail" },
	{ value: "manufacturing", label: "Manufacturing" },
] as const;

const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d{1}[A-Z]{1}[A-Z\d]{1}$/;
const SLUG_REGEX = /^[a-z0-9-]+$/;
const FY_REGEX = /^\d{4}-\d{4}$/;

type FormValues = {
	orgName: string;
	slug: string;
	gstin: string;
	industry: string;
	financialYearStart: string;
	setActive: boolean;
};

function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function panFromGstin(gstin: string): string {
	const t = gstin.trim();
	return t.length >= 12 ? t.slice(2, 12) : "";
}

const SLUG_DEBOUNCE_MS = 500;
const SLUG_CHECK_DEBOUNCE_MS = 800;

type SlugStatus = "idle" | "checking" | "available" | "taken";

export default function CreateOrganisationPage() {
	const router = useRouter();
	const { data: sessionData } = useGetSession();
	const checkSlugMutation = useCheckSlug();
	const generateOrgCodeMutation = useGenerateOrgCode();
	const createOrgMutation = useCreateOrganization();
	const setActiveOrgMutation = useSetActiveOrganization();

	const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
	const nameToSlugTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const slugCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const form = useForm<FormValues>({
		defaultValues: {
			orgName: "",
			slug: "",
			gstin: "",
			industry: "retail",
			financialYearStart: "2025-2026",
			setActive: true,
		},
		mode: "onTouched",
	});

	const orgName = form.watch("orgName");
	const slug = form.watch("slug");

	useEffect(() => {
		if (nameToSlugTimeoutRef.current)
			clearTimeout(nameToSlugTimeoutRef.current);
		if (!orgName) return;
		nameToSlugTimeoutRef.current = setTimeout(() => {
			const generated = slugify(orgName);
			if (generated) form.setValue("slug", generated, { shouldValidate: true });
		}, SLUG_DEBOUNCE_MS);
		return () => {
			if (nameToSlugTimeoutRef.current)
				clearTimeout(nameToSlugTimeoutRef.current);
		};
	}, [orgName, form]);

	useEffect(() => {
		if (slugCheckTimeoutRef.current) clearTimeout(slugCheckTimeoutRef.current);
		if (!slug || !SLUG_REGEX.test(slug)) {
			setSlugStatus("idle");
			return;
		}
		setSlugStatus("checking");
		slugCheckTimeoutRef.current = setTimeout(async () => {
			try {
				const res = await checkSlugMutation.mutateAsync({ slug });
				setSlugStatus(res.status ? "available" : "taken");
			} catch {
				setSlugStatus("idle");
			}
		}, SLUG_CHECK_DEBOUNCE_MS);
		return () => {
			if (slugCheckTimeoutRef.current)
				clearTimeout(slugCheckTimeoutRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [slug]);

	function validate(values: FormValues): string | null {
		if (values.orgName.trim().length < 2)
			return "Organization name must be at least 2 characters.";
		if (!SLUG_REGEX.test(values.slug))
			return "Slug can only contain lowercase letters, numbers, and hyphens.";
		if (values.slug.length < 2) return "Slug must be at least 2 characters.";
		if (!GSTIN_REGEX.test(values.gstin)) return "Invalid GSTIN format.";
		if (!values.industry) return "Please select an industry.";
		if (!FY_REGEX.test(values.financialYearStart))
			return "Financial year must be in YYYY-YYYY format.";
		if (slugStatus === "taken") return "This slug is already taken.";
		return null;
	}

	async function onSubmit(values: FormValues) {
		const error = validate(values);
		if (error) {
			toast.error(error);
			return;
		}

		try {
			const orgCodeRes = await generateOrgCodeMutation.mutateAsync({
				name: values.orgName,
				slug: values.slug,
			});

			const pan = panFromGstin(values.gstin);
			const org = await createOrgMutation.mutateAsync({
				name: values.orgName,
				slug: values.slug,
				gstin: values.gstin,
				industry: values.industry,
				pan,
				financialYearStart: values.financialYearStart,
				orgCode: orgCodeRes.data.orgCode,
			});

			if (values.setActive) {
				await setActiveOrgMutation.mutateAsync({ organizationId: org.id });
				toast.success(`"${org.name}" created and set as active organization.`);
			} else {
				toast.success(`"${org.name}" created successfully.`);
			}

			router.push("/organisation");
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Failed to create organization.";
			toast.error(message);
		}
	}

	const isSubmitting =
		generateOrgCodeMutation.isPending ||
		createOrgMutation.isPending ||
		setActiveOrgMutation.isPending;

	if (!sessionData) {
		return (
			<div className="min-h-full flex items-center justify-center">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="min-h-full">
			<DashboardPageHeader title="create organisation" />

			<div className="p-10 max-w-2xl mx-auto">
				<div className="border p-8">
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
							<FormField
								control={form.control}
								name="orgName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Organization Name</FormLabel>
										<FormControl>
											<Input placeholder="Trendy Wools" {...field} />
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
										<FormLabel>Slug</FormLabel>
										<div className="relative">
											<FormControl>
												<Input
													placeholder="trendy-wools"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value.toLowerCase().replace(/\s/g, "-"),
														)
													}
												/>
											</FormControl>
											<div className="absolute right-3 top-1/2 -translate-y-1/2">
												{slugStatus === "checking" && (
													<Loader2 className="size-4 animate-spin text-muted-foreground" />
												)}
												{slugStatus === "available" && (
													<CheckCircle className="size-4 text-green-500" />
												)}
												{slugStatus === "taken" && (
													<XCircle className="size-4 text-destructive" />
												)}
											</div>
										</div>
										{slugStatus === "taken" && (
											<p className="text-xs text-destructive">
												This slug is already taken.
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
											<Input
												placeholder="27AAACR5055K1Z7"
												maxLength={15}
												{...field}
												onChange={(e) =>
													field.onChange(e.target.value.toUpperCase())
												}
											/>
										</FormControl>
										{field.value && field.value.length >= 12 && (
											<p className="text-xs text-muted-foreground">
												PAN (auto-derived):{" "}
												<span className="font-mono">
													{panFromGstin(field.value)}
												</span>
											</p>
										)}
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex items-center justify-between gap-4">
								<FormField
									control={form.control}
									name="industry"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>Industry</FormLabel>
											<Select
												value={field.value}
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
										<FormItem className="flex-1">
											<FormLabel>Financial Year</FormLabel>
											<FormControl>
												<Input placeholder="2025-2026" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<Separator />

							<FormField
								control={form.control}
								name="setActive"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between gap-4">
										<div>
											<FormLabel className="text-sm font-medium">
												Set as active organization
											</FormLabel>
											<p className="text-xs text-muted-foreground">
												Switch your current session to this organization after
												creation.
											</p>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<div className="flex items-center gap-3 pt-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => router.back()}
									disabled={isSubmitting}>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={isSubmitting || slugStatus === "taken"}>
									{isSubmitting ? (
										<>
											<Loader2 className="size-4 animate-spin" />
											Creating...
										</>
									) : (
										<>
											<Building2 className="size-4" />
											Create Organization
										</>
									)}
								</Button>
							</div>
						</form>
					</Form>
				</div>
			</div>
		</div>
	);
}
