"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontalIcon, Pencil, Trash2, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Product, ProductType } from "@/lib/queries/products";

const formatPrice = (n: number | undefined) =>
	n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

const PRODUCT_TYPES: ProductType[] = ["RAW", "WIP", "FINISHED", "SERVICE"];

export type ProductTableActions = {
	onEdit: (product: Product) => void;
	onDelete: (product: Product) => void;
	onStockAdjust?: (product: Product) => void;
};

export function getColumns(actions: ProductTableActions): ColumnDef<Product>[] {
	return [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: "name",
			header: () => <span className="font-medium text-muted-foreground">Product</span>,
			cell: ({ row }) => (
				<span className="font-medium text-foreground">{row.original.name}</span>
			),
		},
		{
			accessorKey: "category",
			header: () => <span className="font-medium text-muted-foreground">Category</span>,
			cell: ({ row }) => (
				<span className="text-muted-foreground capitalize">
					{row.original.category ?? "—"}
				</span>
			),
		},
		{
			accessorKey: "hsnOrSacCode",
			header: () => <span className="font-medium text-muted-foreground">HSN/SAC</span>,
			cell: ({ row }) => (
				<span className="font-mono text-xs text-muted-foreground">
					{row.original.hsnOrSacCode ?? "—"}
				</span>
			),
		},
		{
			accessorKey: "productType",
			header: () => <span className="font-medium text-muted-foreground">Type</span>,
			cell: ({ row }) => {
				const t = row.original.productType ?? "FINISHED";
				return (
					<Badge
						variant="secondary"
						className={cn(
							"text-[10px] font-medium",
							t === "SERVICE" && "bg-slate-100 text-slate-700",
							t === "FINISHED" && "bg-green-100 text-green-700",
							t === "RAW" && "bg-amber-100 text-amber-700",
							t === "WIP" && "bg-blue-100 text-blue-700",
						)}>
						{t}
					</Badge>
				);
			},
		},
		{
			id: "stock",
			header: () => <span className="font-medium text-muted-foreground">Stock</span>,
			cell: ({ row }) => {
				const qty = row.original.currentQty ?? row.original.totalStock ?? null;
				return (
					<span className="tabular-nums text-muted-foreground">
						{row.original.isInventoryItem === false ? "—" : qty != null ? qty : "0"}
					</span>
				);
			},
		},
		{
			id: "sellingPrice",
			header: () => <span className="font-medium text-muted-foreground">Selling</span>,
			cell: ({ row }) => (
				<span className="tabular-nums text-foreground">
					{formatPrice(row.original.sellingPrice)}
				</span>
			),
		},
		{
			id: "costPrice",
			header: () => <span className="font-medium text-muted-foreground">Cost</span>,
			cell: ({ row }) => (
				<span className="tabular-nums text-muted-foreground">
					{formatPrice(row.original.costPrice)}
				</span>
			),
		},
		{
			accessorKey: "isActive",
			header: () => <span className="font-medium text-muted-foreground">Status</span>,
			cell: ({ row }) => {
				const active = row.original.isActive !== false;
				return (
					<Badge
						variant="secondary"
						className={cn(
							"rounded px-1.5 py-0 text-[11px] font-semibold border-0",
							active && "bg-green-100 text-green-700",
							!active && "bg-muted text-muted-foreground",
						)}>
						{active ? "Active" : "Inactive"}
					</Badge>
				);
			},
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<div className="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						aria-label="Edit"
						onClick={() => actions.onEdit(row.original)}>
						<Pencil className="size-3.5" />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="size-8"
								aria-label="Open menu">
								<MoreHorizontalIcon className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => actions.onEdit(row.original)}>
								<Pencil className="size-3.5" />
								Edit
							</DropdownMenuItem>
							{actions.onStockAdjust &&
								row.original.isInventoryItem !== false && (
									<DropdownMenuItem
										onClick={() => actions.onStockAdjust?.(row.original)}>
										<Package className="size-3.5" />
										Stock adjust
									</DropdownMenuItem>
								)}
							<DropdownMenuItem
								variant="destructive"
								onClick={() => actions.onDelete(row.original)}>
								<Trash2 className="size-3.5" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			),
			enableSorting: false,
			enableHiding: false,
		},
	];
}
