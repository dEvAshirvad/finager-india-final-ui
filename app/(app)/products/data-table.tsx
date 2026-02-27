"use client";

import * as React from "react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { Table as TableType } from "@tanstack/react-table";

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
}

export function DataTable<TData, TValue>({
	columns,
	data,
}: DataTableProps<TData, TValue>) {
	const [rowSelection, setRowSelection] = React.useState({});

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onRowSelectionChange: setRowSelection,
		state: { rowSelection },
	});

	return (
		<div className="space-y-4">
			<div>
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								key={headerGroup.id}
								className="border-[#E9ECEF] hover:bg-transparent">
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className="text-[#6B7280] font-medium py-4 first:pl-10 last:pr-10">
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className="border-[#E9ECEF] hover:bg-primary/50"
									data-state={row.getIsSelected() && "selected"}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} className="last:pr-10 first:pl-10">
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow className="border-[#E9ECEF] hover:bg-transparent">
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center text-[#6B7280]">
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<DataTablePagination table={table} />
		</div>
	);
}

function DataTablePagination<TData>({ table }: { table: TableType<TData> }) {
	return (
		<div className="flex flex-col gap-4 border-t border-[#E9ECEF] px-10 py-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-wrap items-center gap-4 text-sm text-[#6B7280]">
				<span>
					{table.getFilteredSelectedRowModel().rows.length} of{" "}
					{table.getFilteredRowModel().rows.length} row(s) selected.
				</span>
				<div className="flex items-center gap-2">
					<span>Rows per page</span>
					<Select
						value={`${table.getState().pagination.pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}>
						<SelectTrigger className="h-8 w-[70px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ROWS_PER_PAGE_OPTIONS.map((size) => (
								<SelectItem key={size} value={`${size}`}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-nowrap text-sm text-[#6B7280]">
					Page {table.getState().pagination.pageIndex + 1} of{" "}
					{table.getPageCount()}
				</span>
				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								href="#"
								onClick={(e) => {
									e.preventDefault();
									table.previousPage();
								}}
								className={cn(
									!table.getCanPreviousPage() &&
										"pointer-events-none opacity-50",
								)}
							/>
						</PaginationItem>
						<PaginationItem>
							<PaginationNext
								href="#"
								onClick={(e) => {
									e.preventDefault();
									table.nextPage();
								}}
								className={cn(
									!table.getCanNextPage() && "pointer-events-none opacity-50",
								)}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</div>
		</div>
	);
}
