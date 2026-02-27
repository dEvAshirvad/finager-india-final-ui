import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { authKeys } from "./auth";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type CheckSlugBody = { slug: string };

export type CheckSlugResponse = { status: boolean };

export type Organization = {
	id: string;
	name: string;
	slug: string;
	logo?: string | null;
	createdAt: string;
	metadata?: string | null;
	gstin?: string;
	industry?: string;
	pan?: string;
	financialYearStart?: string;
	assignedRoleCA?: string | null;
	assignedRoleOwner?: string | null;
	orgCode?: string;
};

export type OrganizationMember = {
	organizationId: string;
	userId: string;
	role: string;
	createdAt: string;
	id: string;
};

export type CreateOrganizationBody = {
	name: string;
	slug: string;
	gstin: string;
	industry: string;
	pan?: string;
	financialYearStart: string;
	orgCode: string;
	logo?: string | null;
	metadata?: string | null;
	keepCurrentActiveOrganization?: boolean | null;
	userId?: string | null;
	assignedRoleCA?: string | null;
	assignedRoleOwner?: string | null;
};

export type CreateOrganizationResponse = Organization & {
	members: OrganizationMember[];
};

export type UpdateOrganizationBody = {
	data: {
		name?: string | null;
		slug?: string | null;
		logo?: string | null;
		metadata?: string | null;
		gstin?: string | null;
		industry?: string | null;
		pan?: string | null;
		financialYearStart?: string | null;
		assignedRoleCA?: string | null;
		assignedRoleOwner?: string | null;
		orgCode?: string | null;
	};
	organizationId?: string | null;
};

export type DeleteOrganizationBody = {
	organizationId: string;
};

export type SetActiveBody = {
	organizationId?: string | null;
	organizationSlug?: string | null;
};

export type SetActiveResponse = Organization;

export type InviteMemberBody = {
	email: string;
	role: string;
	organizationId?: string | null;
	resend?: boolean | null;
	teamId?: string | null;
};

export type Invitation = {
	organizationId: string;
	email: string;
	role: string;
	status: string;
	expiresAt: string;
	inviterId: string;
	id: string;
	createdAt?: string;
};

export type InviteMemberResponse = Invitation;

export type GetInvitationResponse = Invitation & {
	organizationName: string;
	organizationSlug: string;
	inviterEmail: string;
};

export type AcceptInvitationBody = { invitationId: string };

export type AcceptInvitationResponse = {
	invitation: Invitation;
	member: OrganizationMember;
};

export type CancelInvitationBody = { invitationId: string };

export type RejectInvitationBody = { invitationId: string };

export type RejectInvitationResponse = {
	invitation: Record<string, unknown>;
	member: Record<string, unknown> | null;
};

export type RemoveMemberBody = {
	memberIdOrEmail: string;
	organizationId?: string | null;
};

export type RemoveMemberResponse = {
	member: OrganizationMember;
};

export type UpdateMemberRoleBody = {
	role: string;
	memberId: string;
	organizationId?: string | null;
};

export type UpdateMemberRoleResponse = {
	member: OrganizationMember;
};

export type LeaveOrganizationBody = {
	organizationId: string;
};

export type ActiveMember = {
	id: string;
	userId: string;
	organizationId: string;
	role: string;
};

export type UserInvitation = {
	id: string;
	email: string;
	role: string;
	organizationId: string;
	organizationName: string;
	inviterId: string;
	teamId?: string | null;
	status: string;
	expiresAt: string;
	createdAt: string;
};

export type HasPermissionBody = {
	permissions: Record<string, unknown>;
};

export type HasPermissionResponse = {
	error?: string;
	success: boolean;
};

// ──────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────

export const organizationKeys = {
	all: ["organization"] as const,
	fullOrganization: () => [...organizationKeys.all, "full"] as const,
	list: () => [...organizationKeys.all, "list"] as const,
	invitation: (id: string | null) =>
		[...organizationKeys.all, "invitation", id] as const,
	listInvitations: () => [...organizationKeys.all, "invitations"] as const,
	listUserInvitations: () =>
		[...organizationKeys.all, "user-invitations"] as const,
	activeMember: () => [...organizationKeys.all, "active-member"] as const,
	activeMemberRole: () =>
		[...organizationKeys.all, "active-member-role"] as const,
	listMembers: () => [...organizationKeys.all, "members"] as const,
};

// ──────────────────────────────────────────────
// API functions
// ──────────────────────────────────────────────

async function checkSlug(body: CheckSlugBody): Promise<CheckSlugResponse> {
	const { data } = await api.post<CheckSlugResponse>(
		"/api/auth/organization/check-slug",
		body,
	);
	return data;
}

async function createOrganization(
	body: CreateOrganizationBody,
): Promise<CreateOrganizationResponse> {
	const { data } = await api.post<CreateOrganizationResponse>(
		"/api/auth/organization/create",
		body,
	);
	return data;
}

async function updateOrganization(
	body: UpdateOrganizationBody,
): Promise<Organization> {
	const { data } = await api.post<Organization>(
		"/api/auth/organization/update",
		body,
	);
	return data;
}

async function deleteOrganization(
	body: DeleteOrganizationBody,
): Promise<string> {
	const { data } = await api.post<string>(
		"/api/auth/organization/delete",
		body,
	);
	return data;
}

async function setActiveOrganization(
	body: SetActiveBody,
): Promise<SetActiveResponse> {
	const { data } = await api.post<SetActiveResponse>(
		"/api/auth/organization/set-active",
		body,
	);
	return data;
}

async function getFullOrganization(): Promise<Organization> {
	const { data } = await api.get<Organization>(
		"/api/auth/organization/get-full-organization",
	);
	return data;
}

async function listOrganizations(): Promise<Organization[]> {
	const { data } = await api.get<Organization[]>("/api/auth/organization/list");
	return data;
}

async function inviteMember(
	body: InviteMemberBody,
): Promise<InviteMemberResponse> {
	const { data } = await api.post<InviteMemberResponse>(
		"/api/auth/organization/invite-member",
		body,
	);
	return data;
}

async function cancelInvitation(body: CancelInvitationBody): Promise<void> {
	await api.post("/api/auth/organization/cancel-invitation", body);
}

async function getInvitation(
	invitationId: string | null,
): Promise<GetInvitationResponse | null> {
	if (!invitationId) return null;
	const { data } = await api.get<GetInvitationResponse>(
		"/api/auth/organization/get-invitation",
		{ params: { id: invitationId } },
	);
	return data;
}

async function acceptInvitation(
	body: AcceptInvitationBody,
): Promise<AcceptInvitationResponse> {
	const { data } = await api.post<AcceptInvitationResponse>(
		"/api/auth/organization/accept-invitation",
		body,
	);
	return data;
}

async function rejectInvitation(
	body: RejectInvitationBody,
): Promise<RejectInvitationResponse> {
	const { data } = await api.post<RejectInvitationResponse>(
		"/api/auth/organization/reject-invitation",
		body,
	);
	return data;
}

async function listInvitations(): Promise<Invitation[]> {
	const { data } = await api.get<Invitation[]>(
		"/api/auth/organization/list-invitations",
	);
	return data;
}

async function getActiveMember(): Promise<ActiveMember> {
	const { data } = await api.get<ActiveMember>(
		"/api/auth/organization/get-active-member",
	);
	return data;
}

async function removeMember(
	body: RemoveMemberBody,
): Promise<RemoveMemberResponse> {
	const { data } = await api.post<RemoveMemberResponse>(
		"/api/auth/organization/remove-member",
		body,
	);
	return data;
}

async function updateMemberRole(
	body: UpdateMemberRoleBody,
): Promise<UpdateMemberRoleResponse> {
	const { data } = await api.post<UpdateMemberRoleResponse>(
		"/api/auth/organization/update-member-role",
		body,
	);
	return data;
}

async function leaveOrganization(body: LeaveOrganizationBody): Promise<void> {
	await api.post("/api/auth/organization/leave", body);
}

async function listUserInvitations(): Promise<UserInvitation[]> {
	const { data } = await api.get<UserInvitation[]>(
		"/api/auth/organization/list-user-invitations",
	);
	return data;
}

async function listMembers(): Promise<OrganizationMember[]> {
	const { data } = await api.get<OrganizationMember[]>(
		"/api/auth/organization/list-members",
	);
	return data;
}

async function getActiveMemberRole(): Promise<Record<string, unknown>> {
	const { data } = await api.get<Record<string, unknown>>(
		"/api/auth/organization/get-active-member-role",
	);
	return data;
}

async function hasPermission(
	body: HasPermissionBody,
): Promise<HasPermissionResponse> {
	const { data } = await api.post<HasPermissionResponse>(
		"/api/auth/organization/has-permission",
		body,
	);
	return data;
}

// ──────────────────────────────────────────────
// React Query hooks
// ──────────────────────────────────────────────

export function useCheckSlug() {
	return useMutation({
		mutationFn: checkSlug,
	});
}

export function useCreateOrganization() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createOrganization,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
			queryClient.invalidateQueries({ queryKey: organizationKeys.all });
		},
	});
}

export function useUpdateOrganization() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateOrganization,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: organizationKeys.fullOrganization(),
			});
			queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
		},
	});
}

export function useDeleteOrganization() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteOrganization,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
			queryClient.invalidateQueries({ queryKey: organizationKeys.all });
		},
	});
}

export function useSetActiveOrganization() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: setActiveOrganization,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
			queryClient.invalidateQueries({ queryKey: organizationKeys.all });
		},
	});
}

export function useGetFullOrganization() {
	return useQuery({
		queryKey: organizationKeys.fullOrganization(),
		queryFn: getFullOrganization,
	});
}

export function useListOrganizations() {
	return useQuery({
		queryKey: organizationKeys.list(),
		queryFn: listOrganizations,
	});
}

export function useInviteMember() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: inviteMember,
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: organizationKeys.listInvitations(),
			});
		},
	});
}

export function useCancelInvitation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: cancelInvitation,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: organizationKeys.listInvitations(),
			});
		},
	});
}

export function useGetInvitation(invitationId: string | null) {
	return useQuery({
		queryKey: organizationKeys.invitation(invitationId),
		queryFn: () => getInvitation(invitationId),
		enabled: !!invitationId,
	});
}

export function useAcceptInvitation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: acceptInvitation,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
			queryClient.invalidateQueries({ queryKey: organizationKeys.all });
		},
	});
}

export function useRejectInvitation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: rejectInvitation,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: organizationKeys.listUserInvitations(),
			});
		},
	});
}

export function useListInvitations() {
	return useQuery({
		queryKey: organizationKeys.listInvitations(),
		queryFn: listInvitations,
	});
}

export function useGetActiveMember() {
	return useQuery({
		queryKey: organizationKeys.activeMember(),
		queryFn: getActiveMember,
	});
}

export function useRemoveMember() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: removeMember,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: organizationKeys.listMembers(),
			});
		},
	});
}

export function useUpdateMemberRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateMemberRole,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: organizationKeys.listMembers(),
			});
			queryClient.invalidateQueries({
				queryKey: organizationKeys.activeMember(),
			});
		},
	});
}

export function useLeaveOrganization() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: leaveOrganization,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all });
			queryClient.invalidateQueries({ queryKey: organizationKeys.all });
		},
	});
}

export function useListUserInvitations() {
	return useQuery({
		queryKey: organizationKeys.listUserInvitations(),
		queryFn: listUserInvitations,
	});
}

export function useListMembers() {
	return useQuery({
		queryKey: organizationKeys.listMembers(),
		queryFn: listMembers,
	});
}

export function useGetActiveMemberRole() {
	return useQuery({
		queryKey: organizationKeys.activeMemberRole(),
		queryFn: getActiveMemberRole,
	});
}

export function useHasPermission() {
	return useMutation({
		mutationFn: hasPermission,
	});
}
