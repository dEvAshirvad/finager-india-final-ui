/**
 * Routes that do not require authentication.
 * Unauthenticated users can access these without being redirected.
 */
export const PUBLIC_ROUTES = ["/", "/onboarding"] as const;

export function isPublicRoute(pathname: string): boolean {
	if (!pathname) return true;
	const normalized = pathname.replace(/\/$/, "") || "/";
	return PUBLIC_ROUTES.some(
		(route) => normalized === route || normalized.startsWith(`${route}/`),
	);
}

/** Path to send unauthenticated users (e.g. landing with sign-in). */
export const SIGN_IN_PATH = "/";

/** Path to send authenticated users who have not completed onboarding. */
export const ONBOARDING_PATH = "/onboarding";
