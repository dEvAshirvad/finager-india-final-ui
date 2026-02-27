"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Spinner } from "@/components/ui/spinner";
import {
	isPublicRoute,
	ONBOARDING_PATH,
	SIGN_IN_PATH,
} from "@/lib/auth-config";
import { useGetSession } from "@/lib/queries/auth";

export function ProtectProvider({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const { data, isLoading, isPending } = useGetSession();

	const user = data?.user;
	const isAuthenticated = !!user;
	const needsOnboarding = isAuthenticated && !user?.isOnboarded;
	const isOnOnboardingPage = pathname === ONBOARDING_PATH;

	useEffect(() => {
		if (isLoading || isPending) return;

		// Session fetch failed or no user -> treat as unauthenticated
		if (!isAuthenticated) {
			if (!isPublicRoute(pathname ?? "")) {
				router.replace(SIGN_IN_PATH);
			}
			return;
		}

		// Authenticated but not onboarded -> must be on onboarding
		if (needsOnboarding && !isOnOnboardingPage) {
			router.replace(ONBOARDING_PATH);
		}
	}, [
		isLoading,
		isPending,
		isAuthenticated,
		needsOnboarding,
		isOnOnboardingPage,
		pathname,
		router,
	]);

	const shouldRedirectToSignIn =
		!isLoading &&
		!isPending &&
		!isAuthenticated &&
		pathname != null &&
		!isPublicRoute(pathname);

	const shouldRedirectToOnboarding =
		!isLoading &&
		!isPending &&
		needsOnboarding &&
		!isOnOnboardingPage;

	const isRedirecting =
		shouldRedirectToSignIn || shouldRedirectToOnboarding;

	// Loading or redirecting: show full-screen spinner (no flash of protected content)
	if (isLoading || isPending || isRedirecting) {
		return (
			<div
				className="flex min-h-screen items-center justify-center bg-background"
				aria-live="polite"
				aria-busy="true"
			>
				<div className="flex flex-col items-center gap-4">
					<Spinner className="size-10 text-primary" />
					<p className="text-muted-foreground text-sm">
						{isRedirecting ? "Redirecting…" : "Loading…"}
					</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
