import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Session = {
	id: string;
	expiresAt: string;
	token: string;
	createdAt: string;
	updatedAt: string;
	ipAddress: string;
	userAgent: string;
	userId: string;
	impersonatedBy: string | null;
	activeOrganizationId: string | null;
};

export type User = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image: string | null;
	createdAt: string;
	updatedAt: string;
	role: string;
	banned: boolean;
	banReason: string | null;
	banExpires: string | null;
	isOnboarded: boolean;
	caId: string | null;
};

export type GetSessionResponse = {
	session: Session | null;
	user: User | null;
};

export type SocialSignInBody = {
	callbackURL: string;
	newUserCallbackURL: string;
	provider: "google";
};

export type SocialSignInResponse = {
	url: string;
	redirect: boolean;
};

export type SignOutResponse = {
	success: boolean;
};

export type SignUpEmailBody = {
	name: string;
	email: string;
	password: string;
	image?: string;
	callbackURL?: string;
	rememberMe?: boolean;
};

export type SignUpEmailResponse = {
	token: string | null;
	user: User;
};

export type SignInEmailBody = {
	email: string;
	password: string;
	callbackURL?: string | null;
	rememberMe?: boolean | null;
};

export type SignInEmailResponse = {
	redirect: boolean;
	token: string;
	url?: string | null;
	user: User;
};

export type ResetPasswordBody = {
	newPassword: string;
	token?: string | null;
};

export type ResetPasswordResponse = {
	status: boolean;
};

export type VerifyPasswordBody = {
	password: string;
};

export type VerifyPasswordResponse = {
	status: boolean;
};

export type VerifyEmailResponse = {
	user: User;
	status: boolean;
};

export type SendVerificationEmailBody = {
	email: string;
	callbackURL?: string | null;
};

export type SendVerificationEmailResponse = {
	status: boolean;
};

export type ChangeEmailBody = {
	newEmail: string;
	callbackURL?: string | null;
};

export type ChangeEmailResponse = {
	user?: User;
	status: boolean;
	message?: "Email updated" | "Verification email sent" | null;
};

export type ChangePasswordBody = {
	newPassword: string;
	currentPassword: string;
	revokeOtherSessions?: boolean | null;
};

export type ChangePasswordResponse = {
	token: string | null;
	user: User;
};

export type UpdateUserBody = {
	name?: string;
	image?: string | null;
};

export type UpdateUserResponse = {
	user: User;
};

export type DeleteUserBody = {
	callbackURL?: string;
	password?: string;
	token?: string;
};

export type DeleteUserResponse = {
	success: boolean;
	message: "User deleted" | "Verification email sent";
};

export type RequestPasswordResetBody = {
	email: string;
	redirectTo?: string | null;
};

export type RequestPasswordResetResponse = {
	status: boolean;
	message?: string;
};

export type RevokeSessionBody = {
	token: string;
};

export type RevokeSessionResponse = {
	status: boolean;
};

export type RevokeSessionsResponse = {
	status: boolean;
};

export type RevokeOtherSessionsResponse = {
	status: boolean;
};

export type LinkSocialBody = {
	callbackURL?: string | null;
	provider: string;
	disableRedirect?: boolean | null;
	errorCallbackURL?: string | null;
};

export type LinkSocialResponse = {
	url?: string;
	redirect: boolean;
	status?: boolean;
};

export type LinkedAccount = {
	id: string;
	providerId: string;
	createdAt: string;
	updatedAt: string;
	accountId: string;
	userId: string;
	scopes: string[];
};

export type UnlinkAccountBody = {
	providerId: string;
	accountId?: string | null;
};

export type UnlinkAccountResponse = {
	status: boolean;
};

export type RefreshTokenBody = {
	providerId: string;
	accountId?: string | null;
	userId?: string | null;
};

export type RefreshTokenResponse = {
	tokenType?: string;
	idToken?: string;
	accessToken?: string;
	refreshToken?: string;
	accessTokenExpiresAt?: string;
	refreshTokenExpiresAt?: string;
};

export type GetAccessTokenBody = {
	providerId: string;
	accountId?: string | null;
	userId?: string | null;
};

export type GetAccessTokenResponse = {
	tokenType?: string;
	idToken?: string;
	accessToken?: string;
	accessTokenExpiresAt?: string;
};

export type AccountInfoResponse = {
	user: {
		id: string;
		name?: string;
		email?: string;
		image?: string;
		emailVerified: boolean;
	};
	data: Record<string, unknown>;
};

export type OkResponse = {
	ok: boolean;
};

// ──────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────

export const authKeys = {
	all: ["auth"] as const,
	getSession: () => [...authKeys.all, "session"] as const,
	listSessions: () => [...authKeys.all, "sessions"] as const,
	listAccounts: () => [...authKeys.all, "accounts"] as const,
	accountInfo: () => [...authKeys.all, "account-info"] as const,
};

// ──────────────────────────────────────────────
// API functions
// ──────────────────────────────────────────────

async function getSession(): Promise<GetSessionResponse> {
	const { data } = await api.get<GetSessionResponse>("/api/auth/get-session");
	return data;
}

async function signInSocial(
	body: SocialSignInBody,
): Promise<SocialSignInResponse> {
	const { data } = await api.post<SocialSignInResponse>(
		"/api/auth/sign-in/social",
		{
			callbackURL: process.env.NEXT_PUBLIC_FRONTEND + body.callbackURL,
			newUserCallbackURL:
				process.env.NEXT_PUBLIC_FRONTEND + body.newUserCallbackURL,
			provider: body.provider,
		},
	);
	return data;
}

async function signOut(): Promise<SignOutResponse> {
	const { data } = await api.post<SignOutResponse>("/api/auth/sign-out", {});
	return data;
}

async function signUpEmail(body: SignUpEmailBody): Promise<SignUpEmailResponse> {
	const { data } = await api.post<SignUpEmailResponse>(
		"/api/auth/sign-up/email",
		body,
	);
	return data;
}

async function signInEmail(body: SignInEmailBody): Promise<SignInEmailResponse> {
	const { data } = await api.post<SignInEmailResponse>(
		"/api/auth/sign-in/email",
		body,
	);
	return data;
}

async function resetPassword(
	body: ResetPasswordBody,
): Promise<ResetPasswordResponse> {
	const { data } = await api.post<ResetPasswordResponse>(
		"/api/auth/reset-password",
		body,
	);
	return data;
}

async function verifyPassword(
	body: VerifyPasswordBody,
): Promise<VerifyPasswordResponse> {
	const { data } = await api.post<VerifyPasswordResponse>(
		"/api/auth/verify-password",
		body,
	);
	return data;
}

async function verifyEmail(token: string, callbackURL?: string): Promise<VerifyEmailResponse> {
	const { data } = await api.get<VerifyEmailResponse>(
		"/api/auth/verify-email",
		{ params: { token, callbackURL } },
	);
	return data;
}

async function sendVerificationEmail(
	body: SendVerificationEmailBody,
): Promise<SendVerificationEmailResponse> {
	const { data } = await api.post<SendVerificationEmailResponse>(
		"/api/auth/send-verification-email",
		body,
	);
	return data;
}

async function changeEmail(
	body: ChangeEmailBody,
): Promise<ChangeEmailResponse> {
	const { data } = await api.post<ChangeEmailResponse>(
		"/api/auth/change-email",
		body,
	);
	return data;
}

async function changePassword(
	body: ChangePasswordBody,
): Promise<ChangePasswordResponse> {
	const { data } = await api.post<ChangePasswordResponse>(
		"/api/auth/change-password",
		body,
	);
	return data;
}

async function updateUser(body: UpdateUserBody): Promise<UpdateUserResponse> {
	const { data } = await api.post<UpdateUserResponse>(
		"/api/auth/update-user",
		body,
	);
	return data;
}

async function deleteUser(body: DeleteUserBody): Promise<DeleteUserResponse> {
	const { data } = await api.post<DeleteUserResponse>(
		"/api/auth/delete-user",
		body,
	);
	return data;
}

async function requestPasswordReset(
	body: RequestPasswordResetBody,
): Promise<RequestPasswordResetResponse> {
	const { data } = await api.post<RequestPasswordResetResponse>(
		"/api/auth/request-password-reset",
		body,
	);
	return data;
}

async function listSessions(): Promise<Session[]> {
	const { data } = await api.get<Session[]>("/api/auth/list-sessions");
	return data;
}

async function revokeSession(
	body: RevokeSessionBody,
): Promise<RevokeSessionResponse> {
	const { data } = await api.post<RevokeSessionResponse>(
		"/api/auth/revoke-session",
		body,
	);
	return data;
}

async function revokeSessions(): Promise<RevokeSessionsResponse> {
	const { data } = await api.post<RevokeSessionsResponse>(
		"/api/auth/revoke-sessions",
		{},
	);
	return data;
}

async function revokeOtherSessions(): Promise<RevokeOtherSessionsResponse> {
	const { data } = await api.post<RevokeOtherSessionsResponse>(
		"/api/auth/revoke-other-sessions",
		{},
	);
	return data;
}

async function linkSocial(body: LinkSocialBody): Promise<LinkSocialResponse> {
	const { data } = await api.post<LinkSocialResponse>(
		"/api/auth/link-social",
		body,
	);
	return data;
}

async function listAccounts(): Promise<LinkedAccount[]> {
	const { data } = await api.get<LinkedAccount[]>("/api/auth/list-accounts");
	return data;
}

async function unlinkAccount(
	body: UnlinkAccountBody,
): Promise<UnlinkAccountResponse> {
	const { data } = await api.post<UnlinkAccountResponse>(
		"/api/auth/unlink-account",
		body,
	);
	return data;
}

async function refreshToken(
	body: RefreshTokenBody,
): Promise<RefreshTokenResponse> {
	const { data } = await api.post<RefreshTokenResponse>(
		"/api/auth/refresh-token",
		body,
	);
	return data;
}

async function getAccessToken(
	body: GetAccessTokenBody,
): Promise<GetAccessTokenResponse> {
	const { data } = await api.post<GetAccessTokenResponse>(
		"/api/auth/get-access-token",
		body,
	);
	return data;
}

async function getAccountInfo(): Promise<AccountInfoResponse> {
	const { data } = await api.get<AccountInfoResponse>(
		"/api/auth/account-info",
	);
	return data;
}

async function checkOk(): Promise<OkResponse> {
	const { data } = await api.get<OkResponse>("/api/auth/ok");
	return data;
}

// ──────────────────────────────────────────────
// React Query hooks
// ──────────────────────────────────────────────

export function useGetSession() {
	return useQuery({
		queryKey: authKeys.getSession(),
		queryFn: getSession,
	});
}

export function useSignInSocial() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: signInSocial,
		onSuccess: (res) => {
			if (res.redirect && res.url) {
				window.location.href = res.url;
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
		},
	});
}

export function useSignOut() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: signOut,
		onSuccess: () => {
			queryClient.removeQueries({ queryKey: authKeys.all });
		},
	});
}

export function useSignUpEmail() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: signUpEmail,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
		},
	});
}

export function useSignInEmail() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: signInEmail,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
		},
	});
}

export function useResetPassword() {
	return useMutation({
		mutationFn: resetPassword,
	});
}

export function useVerifyPassword() {
	return useMutation({
		mutationFn: verifyPassword,
	});
}

export function useVerifyEmail() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ token, callbackURL }: { token: string; callbackURL?: string }) =>
			verifyEmail(token, callbackURL),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
		},
	});
}

export function useSendVerificationEmail() {
	return useMutation({
		mutationFn: sendVerificationEmail,
	});
}

export function useChangeEmail() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: changeEmail,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.getSession() });
		},
	});
}

export function useChangePassword() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: changePassword,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
		},
	});
}

export function useUpdateUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateUser,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.getSession() });
		},
	});
}

export function useDeleteUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteUser,
		onSuccess: () => {
			queryClient.removeQueries({ queryKey: authKeys.all });
		},
	});
}

export function useRequestPasswordReset() {
	return useMutation({
		mutationFn: requestPasswordReset,
	});
}

export function useListSessions() {
	return useQuery({
		queryKey: authKeys.listSessions(),
		queryFn: listSessions,
	});
}

export function useRevokeSession() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: revokeSession,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.listSessions() });
		},
	});
}

export function useRevokeSessions() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: revokeSessions,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
		},
	});
}

export function useRevokeOtherSessions() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: revokeOtherSessions,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.listSessions() });
		},
	});
}

export function useLinkSocial() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: linkSocial,
		onSuccess: (res) => {
			if (res.redirect && res.url) {
				window.location.href = res.url;
			}
			queryClient.invalidateQueries({ queryKey: authKeys.listAccounts() });
		},
	});
}

export function useListAccounts() {
	return useQuery({
		queryKey: authKeys.listAccounts(),
		queryFn: listAccounts,
	});
}

export function useUnlinkAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: unlinkAccount,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.listAccounts() });
		},
	});
}

export function useRefreshToken() {
	return useMutation({
		mutationFn: refreshToken,
	});
}

export function useGetAccessToken() {
	return useMutation({
		mutationFn: getAccessToken,
	});
}

export function useAccountInfo() {
	return useQuery({
		queryKey: authKeys.accountInfo(),
		queryFn: getAccountInfo,
	});
}

export function useCheckOk() {
	return useQuery({
		queryKey: ["auth", "ok"] as const,
		queryFn: checkOk,
	});
}
