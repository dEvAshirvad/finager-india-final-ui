import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { authKeys } from "./auth";

// --- Types ---

export type OnboardingRole = "ca" | "owner" | "staff";

export type ChooseRoleBody = { role: OnboardingRole };

export type ChooseRoleResponse = {
	success: boolean;
	status: number;
	data: { message: string };
};

export type VerifyCaBody = { caId: string };

export type VerifyCaResponse = {
	success: boolean;
	status: number;
	data: { message: string };
};

export type GenerateOrgCodeBody = { name: string; slug: string };

export type GenerateOrgCodeResponse = {
	success: boolean;
	status: number;
	data: { message: string; orgCode: string };
};

export type CompleteOnboardingBody = { organizationId: string };

export type CompleteOnboardingResponse = {
	success: boolean;
	status: number;
	data: { message: string };
};

// --- API functions ---

async function chooseRole(body: ChooseRoleBody): Promise<ChooseRoleResponse> {
	const { data } = await api.post<ChooseRoleResponse>(
		"/api/v1/onboarding/choose-role",
		body,
	);
	return data;
}

async function verifyCa(body: VerifyCaBody): Promise<VerifyCaResponse> {
	const { data } = await api.post<VerifyCaResponse>(
		"/api/v1/onboarding/get-verify-ca",
		body,
	);
	return data;
}

async function generateOrgCode(
	body: GenerateOrgCodeBody,
): Promise<GenerateOrgCodeResponse> {
	const { data } = await api.post<GenerateOrgCodeResponse>(
		"/api/v1/onboarding/generate-org-code",
		body,
	);
	return data;
}

async function completeOnboarding(
	body: CompleteOnboardingBody,
): Promise<CompleteOnboardingResponse> {
	const { data } = await api.post<CompleteOnboardingResponse>(
		"/api/v1/onboarding/complete-onboarding",
		body,
	);
	return data;
}

// --- Query keys ---

export const onboardingKeys = {
	all: ["onboarding"] as const,
};

// --- React Query hooks ---

export function useChooseRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: chooseRole,
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
		},
	});
}

export function useVerifyCa() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: verifyCa,
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
		},
	});
}

export function useGenerateOrgCode() {
	return useMutation({
		mutationFn: generateOrgCode,
	});
}

export function useCompleteOnboarding() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: completeOnboarding,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
		},
	});
}
