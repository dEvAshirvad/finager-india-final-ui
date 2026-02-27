"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	ChevronRight,
	ChevronDown,
	Plus,
	Search,
	FileText,
	Pencil,
	Trash2,
	X,
	Loader2,
	ArrowUpDown,
	Landmark,
} from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
	useGetTree,
	useGetAccount,
	useGetJournalEntries,
	useCreateAccount,
	usePatchAccount,
	useDeleteAccount,
	type CoaTreeNode,
	type AccountType,
	type NormalBalance,
	type CreateAccountBody,
	type AccountJournalEntriesParams,
} from "@/lib/queries/coa";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
	{ value: "ASSET", label: "Asset" },
	{ value: "LIABILITY", label: "Liability" },
	{ value: "EQUITY", label: "Equity" },
	{ value: "INCOME", label: "Income" },
	{ value: "EXPENSE", label: "Expense" },
];

const TYPE_COLORS: Record<AccountType, string> = {
	ASSET: "bg-blue-100 text-blue-700",
	LIABILITY: "bg-orange-100 text-orange-700",
	EQUITY: "bg-purple-100 text-purple-700",
	INCOME: "bg-green-100 text-green-700",
	EXPENSE: "bg-red-100 text-red-700",
};

function normalBalanceForType(type: AccountType): NormalBalance {
	return type === "ASSET" || type === "EXPENSE" ? "DEBIT" : "CREDIT";
}

function formatCurrency(amount: number | undefined) {
	if (amount === undefined || amount === null) return "₹0.00";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
	}).format(amount);
}

// ──────────────────────────────────────────────
// Tree node filtering helper
// ──────────────────────────────────────────────

function filterTree(nodes: CoaTreeNode[], query: string): CoaTreeNode[] {
	if (!query) return nodes;
	const lower = query.toLowerCase();

	return nodes.reduce<CoaTreeNode[]>((acc, node) => {
		const childMatches = filterTree(node.children, query);
		const selfMatches =
			node.name.toLowerCase().includes(lower) ||
			node.code.toLowerCase().includes(lower);

		if (selfMatches || childMatches.length > 0) {
			acc.push({ ...node, children: childMatches });
		}
		return acc;
	}, []);
}

function collectExpandedIds(nodes: CoaTreeNode[]): Set<string> {
	const ids = new Set<string>();
	for (const node of nodes) {
		if (node.children.length > 0) {
			ids.add(node._id);
			for (const id of collectExpandedIds(node.children)) {
				ids.add(id);
			}
		}
	}
	return ids;
}

// ──────────────────────────────────────────────
// Tree node component
// ──────────────────────────────────────────────

function TreeNode({
	node,
	depth,
	selectedId,
	onSelect,
	expanded,
	onToggle,
}: {
	node: CoaTreeNode;
	depth: number;
	selectedId: string | null;
	onSelect: (id: string) => void;
	expanded: Set<string>;
	onToggle: (id: string) => void;
}) {
	const hasChildren = node.children.length > 0;
	const isExpanded = expanded.has(node._id);
	const isSelected = selectedId === node._id;

	return (
		<div>
			<button
				type="button"
				className={cn(
					"w-full flex items-center gap-1.5 py-2 pr-3 text-left text-sm transition-colors cursor-pointer rounded-md",
					isSelected
						? "bg-primary/10 text-primary font-medium"
						: "hover:bg-accent text-foreground",
				)}
				style={{ paddingLeft: `${depth * 16 + 8}px` }}
				onClick={() => {
					onSelect(node._id);
					if (hasChildren) onToggle(node._id);
				}}>
				<span className="shrink-0 size-4 flex items-center justify-center">
					{hasChildren ? (
						isExpanded ? (
							<ChevronDown className="size-3.5 text-muted-foreground" />
						) : (
							<ChevronRight className="size-3.5 text-muted-foreground" />
						)
					) : (
						<span className="size-1.5 rounded-full bg-muted-foreground/40" />
					)}
				</span>
				<span className="truncate flex-1">{node.name}</span>
				<span className="text-[10px] text-muted-foreground font-mono shrink-0">
					{node.code}
				</span>
			</button>

			{hasChildren && isExpanded && (
				<div>
					{node.children.map((child) => (
						<TreeNode
							key={child._id}
							node={child}
							depth={depth + 1}
							selectedId={selectedId}
							onSelect={onSelect}
							expanded={expanded}
							onToggle={onToggle}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ──────────────────────────────────────────────
// Create / Edit Account Dialog
// ──────────────────────────────────────────────

type AccountFormValues = {
	code: string;
	name: string;
	description: string;
	type: AccountType;
	parentCode: string;
};

function AccountFormDialog({
	open,
	onOpenChange,
	editAccount,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	editAccount?: {
		_id: string;
		code: string;
		name: string;
		description?: string;
		type: AccountType;
		parentCode?: string | null;
	} | null;
}) {
	const createMutation = useCreateAccount();
	const patchMutation = usePatchAccount();
	const isEdit = !!editAccount;

	const form = useForm<AccountFormValues>({
		defaultValues: {
			code: editAccount?.code ?? "",
			name: editAccount?.name ?? "",
			description: editAccount?.description ?? "",
			type: editAccount?.type ?? "ASSET",
			parentCode: editAccount?.parentCode ?? "",
		},
	});

	useEffect(() => {
		if (editAccount) {
			form.reset({
				code: editAccount?.code ?? "",
				name: editAccount?.name ?? "",
				description: editAccount?.description ?? "",
				type: editAccount?.type ?? "ASSET",
				parentCode: editAccount?.parentCode ?? "",
			});
		}
	}, [editAccount]);

	async function onSubmit(values: AccountFormValues) {
		if (!values.code.trim()) {
			form.setError("code", { message: "Code is required." });
			return;
		}
		if (!values.name.trim()) {
			form.setError("name", { message: "Name is required." });
			return;
		}

		const payload: CreateAccountBody = {
			code: values.code.trim(),
			name: values.name.trim(),
			description: values.description.trim() || undefined,
			type: values.type,
			normalBalance: normalBalanceForType(values.type),
			parentCode: values.parentCode.trim() || null,
		};

		try {
			if (isEdit) {
				await patchMutation.mutateAsync({ id: editAccount._id, body: payload });
				toast.success("Account updated.");
			} else {
				await createMutation.mutateAsync(payload);
				toast.success("Account created.");
			}
			form.reset();
			onOpenChange(false);
		} catch {
			toast.error(
				isEdit ? "Failed to update account." : "Failed to create account.",
			);
		}
	}

	const isPending = createMutation.isPending || patchMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Account" : "New Account"}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="code"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Account Code</FormLabel>
										<FormControl>
											<Input placeholder="1001" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Type</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{ACCOUNT_TYPES.map((t) => (
													<SelectItem key={t.value} value={t.value}>
														{t.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Account Name</FormLabel>
									<FormControl>
										<Input placeholder="Cash in Hand" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="parentCode"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Parent Code (optional)</FormLabel>
									<FormControl>
										<Input placeholder="1000" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description (optional)</FormLabel>
									<FormControl>
										<Input placeholder="Main cash account" {...field} />
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
							<Button type="submit" disabled={isPending}>
								{isPending ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										{isEdit ? "Saving..." : "Creating..."}
									</>
								) : isEdit ? (
									"Save Changes"
								) : (
									"Create Account"
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
// Detail Panel
// ──────────────────────────────────────────────

function DetailPanel({
	accountId,
	onEdit,
	onClose,
}: {
	accountId: string;
	onEdit: () => void;
	onClose: () => void;
}) {
	const { data: account, isLoading: accountLoading } = useGetAccount(accountId);
	const [jeParams, setJeParams] = useState<AccountJournalEntriesParams>({
		page: 1,
		limit: 10,
	});
	const { data: jeData, isLoading: jeLoading } = useGetJournalEntries(
		accountId,
		jeParams,
	);
	const deleteMutation = useDeleteAccount();

	const entries = jeData?.data?.entries;

	if (accountLoading) {
		return (
			<div className="p-6 space-y-4">
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-20 w-full" />
			</div>
		);
	}

	if (!account) {
		return (
			<div className="flex-1 flex items-center justify-center text-muted-foreground p-6">
				Account not found.
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 px-6 py-5 border-b">
				<div className="min-w-0">
					<p className="text-xs text-muted-foreground">
						<Badge
							variant="secondary"
							className={cn("text-[10px]", TYPE_COLORS[account.type])}>
							{account.type}
						</Badge>
					</p>
					<h2 className="text-xl font-semibold mt-1 truncate">
						{account.name}
					</h2>
					<p className="text-sm text-muted-foreground font-mono">
						{account.code}
					</p>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<Button variant="ghost" size="sm" onClick={onEdit}>
						<Pencil className="size-3.5" />
						Edit
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="text-destructive hover:text-destructive"
						disabled={account.isSystem || deleteMutation.isPending}
						onClick={async () => {
							try {
								await deleteMutation.mutateAsync(account._id);
								toast.success("Account deleted.");
								onClose();
							} catch {
								toast.error("Failed to delete account.");
							}
						}}>
						<Trash2 className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={onClose}>
						<X className="size-4" />
					</Button>
				</div>
			</div>

			{/* Account info */}
			<div className="px-6 py-5 border-b space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-xs text-muted-foreground uppercase tracking-wider">
						Closing Balance
					</span>
					<span className="text-lg font-semibold">
						{formatCurrency(account.currentBalance)}
						<span className="text-xs text-muted-foreground ml-1">
							({account.normalBalance === "DEBIT" ? "Dr" : "Cr"})
						</span>
					</span>
				</div>
				{account.description && (
					<p className="text-sm text-muted-foreground">
						<span className="font-medium text-foreground">Description:</span>{" "}
						{account.description}
					</p>
				)}
				<div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
					<div>
						<span className="text-muted-foreground">Normal Balance:</span>{" "}
						<span className="font-medium">{account.normalBalance}</span>
					</div>
					<div>
						<span className="text-muted-foreground">Parent Code:</span>{" "}
						<span className="font-mono">{account.parentCode ?? "—"}</span>
					</div>
					<div>
						<span className="text-muted-foreground">Opening Balance:</span>{" "}
						<span className="font-medium">
							{formatCurrency(account.openingBalance)}
						</span>
					</div>
					{account.isSystem && (
						<div>
							<Badge variant="secondary" className="text-[10px]">
								System Account
							</Badge>
						</div>
					)}
				</div>
			</div>

			{/* Journal entries */}
			<div className="flex-1 flex flex-col min-h-0">
				<div className="px-6 py-4 flex items-center justify-between border-b">
					<h3 className="text-sm font-semibold">Transactions</h3>
					{entries && entries.totalDocs > 0 && (
						<span className="text-xs text-muted-foreground">
							{entries.totalDocs} total
						</span>
					)}
				</div>

				<ScrollArea className="flex-1">
					{jeLoading ? (
						<div className="p-6 space-y-3">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="flex gap-4">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-4 flex-1" />
									<Skeleton className="h-4 w-16" />
								</div>
							))}
						</div>
					) : !entries || entries.journalEntries.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<div className="size-16 rounded-full bg-muted flex items-center justify-center mb-3">
								<FileText className="size-7 text-muted-foreground" />
							</div>
							<p className="text-sm text-muted-foreground">
								There are no transactions available
							</p>
						</div>
					) : (
						<div>
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead className="pl-6 font-medium text-xs">
											Date
										</TableHead>
										<TableHead className="font-medium text-xs">
											Reference
										</TableHead>
										<TableHead className="font-medium text-xs">
											Description
										</TableHead>
										<TableHead className="font-medium text-xs text-right">
											Debit
										</TableHead>
										<TableHead className="font-medium text-xs text-right pr-6">
											Credit
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{entries.journalEntries.map((je) => {
										const relevantLines = je.lines.filter(
											(l) =>
												l.accountId === accountId ||
												entries.descendantAccounts.some(
													(d) => d._id === l.accountId,
												),
										);
										return relevantLines.map((line, idx) => (
											<TableRow key={`${je._id}-${idx}`}>
												<TableCell className="pl-6 text-xs whitespace-nowrap">
													{new Date(je.date).toLocaleDateString("en-IN", {
														day: "2-digit",
														month: "short",
														year: "numeric",
													})}
												</TableCell>
												<TableCell className="text-xs font-mono">
													{je.reference ?? "—"}
												</TableCell>
												<TableCell className="text-xs truncate max-w-[200px]">
													{line.description || je.description || "—"}
												</TableCell>
												<TableCell className="text-xs text-right font-mono">
													{line.debit > 0 ? formatCurrency(line.debit) : ""}
												</TableCell>
												<TableCell className="text-xs text-right pr-6 font-mono">
													{line.credit > 0 ? formatCurrency(line.credit) : ""}
												</TableCell>
											</TableRow>
										));
									})}
								</TableBody>
							</Table>

							{entries.totalPages > 1 && (
								<div className="flex items-center justify-between px-6 py-3 border-t">
									<span className="text-xs text-muted-foreground">
										Page {entries.page} of {entries.totalPages}
									</span>
									<div className="flex gap-1">
										<Button
											variant="outline"
											size="sm"
											className="h-7 text-xs"
											disabled={!entries.prevPage}
											onClick={() =>
												setJeParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))
											}>
											Previous
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="h-7 text-xs"
											disabled={!entries.nextPage}
											onClick={() =>
												setJeParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))
											}>
											Next
										</Button>
									</div>
								</div>
							)}
						</div>
					)}
				</ScrollArea>
			</div>
		</div>
	);
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function CoaPage() {
	const { data: tree, isLoading: treeLoading } = useGetTree();

	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [expanded, setExpanded] = useState<Set<string>>(new Set());
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editAccount, setEditAccount] = useState<CoaTreeNode | null>(null);

	const treeArray = useMemo(() => {
		if (!tree) return [];
		if (Array.isArray(tree)) return tree;
		if (
			typeof tree === "object" &&
			"data" in tree &&
			Array.isArray((tree as Record<string, unknown>).data)
		)
			return (tree as Record<string, unknown>).data as CoaTreeNode[];
		return [];
	}, [tree]);

	const filteredTree = useMemo(() => {
		if (!treeArray.length) return [];
		return filterTree(treeArray, searchQuery);
	}, [treeArray, searchQuery]);

	// Auto-expand all when searching
	const effectiveExpanded = useMemo(() => {
		if (searchQuery && filteredTree.length > 0) {
			return collectExpandedIds(filteredTree);
		}
		return expanded;
	}, [searchQuery, filteredTree, expanded]);

	const handleToggle = useCallback((id: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	// Find the selected account in the tree for edit
	const findInTree = useCallback(
		(nodes: CoaTreeNode[] | undefined, id: string): CoaTreeNode | null => {
			if (!nodes || !Array.isArray(nodes)) return null;
			for (const node of nodes) {
				if (node._id === id) return node;
				const children = Array.isArray(node.children) ? node.children : [];
				const found = findInTree(children, id);
				if (found) return found;
			}
			return null;
		},
		[],
	);

	function handleEdit() {
		if (!selectedId || !treeArray.length) return;
		const account = findInTree(treeArray, selectedId);
		if (account) {
			setEditAccount(account);
			setDialogOpen(true);
		}
	}

	function handleNew() {
		setEditAccount(null);
		setDialogOpen(true);
	}

	return (
		<div className="min-h-full flex flex-col">
			<DashboardPageHeader title="chart of accounts" />

			<div className="flex-1 flex min-h-0 overflow-hidden">
				{/* Left sidebar — Tree */}
				<div className="w-[360px] shrink-0 border-r flex flex-col bg-card">
					{/* Tree header */}
					<div className="p-3 border-b space-y-2">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold">Active Accounts</h3>
							<Button size="sm" className="h-7 text-xs" onClick={handleNew}>
								<Plus className="size-3" />
								New
							</Button>
						</div>
						<div className="relative">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
							<Input
								placeholder="Search in Chart of Accounts"
								className="h-8 pl-8 text-xs"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
					</div>

					{/* Tree content */}
					<ScrollArea className="flex-1">
						<div className="py-1">
							{treeLoading ? (
								<div className="p-3 space-y-2">
									{Array.from({ length: 10 }).map((_, i) => (
										<div
											key={i}
											className="flex items-center gap-2"
											style={{ paddingLeft: `${(i % 3) * 16 + 8}px` }}>
											<Skeleton className="size-3 rounded" />
											<Skeleton className="h-3.5 flex-1" />
											<Skeleton className="h-3 w-10" />
										</div>
									))}
								</div>
							) : filteredTree.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
									<Landmark className="size-8 text-muted-foreground mb-2" />
									<p className="text-sm text-muted-foreground">
										{searchQuery
											? "No accounts match your search."
											: "No accounts yet. Create one to get started."}
									</p>
								</div>
							) : (
								filteredTree.map((node) => (
									<TreeNode
										key={node._id}
										node={node}
										depth={0}
										selectedId={selectedId}
										onSelect={setSelectedId}
										expanded={effectiveExpanded}
										onToggle={handleToggle}
									/>
								))
							)}
						</div>
					</ScrollArea>
				</div>

				{/* Right panel — Detail */}
				<div className="flex-1 flex flex-col min-w-0 bg-background">
					{selectedId ? (
						<DetailPanel
							key={selectedId}
							accountId={selectedId}
							onEdit={handleEdit}
							onClose={() => setSelectedId(null)}
						/>
					) : (
						<div className="flex-1 flex flex-col items-center justify-center text-center p-6">
							<div className="size-20 rounded-full bg-muted flex items-center justify-center mb-4">
								<FileText className="size-9 text-muted-foreground" />
							</div>
							<h3 className="text-lg font-medium mb-1">Select an account</h3>
							<p className="text-sm text-muted-foreground max-w-xs">
								Choose an account from the tree on the left to view its details
								and transactions.
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Create / Edit dialog */}
			<AccountFormDialog
				open={dialogOpen}
				onOpenChange={(v) => {
					if (!v) {
						setDialogOpen(false);
						setEditAccount(null);
					}
				}}
				editAccount={editAccount}
			/>
		</div>
	);
}
