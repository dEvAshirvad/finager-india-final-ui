"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import {
	Plus,
	Search,
	Loader2,
	Upload,
	Download,
	AlertCircle,
	CheckCircle2,
	Trash2,
} from "lucide-react";

import DashboardPageHeader from "@/components/dahboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetFooter,
	SheetClose,
} from "@/components/ui/sheet";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DataTable } from "./data-table";
import { getColumns } from "./columns";
import {
	useListProducts,
	useCreateProduct,
	useUpdateProduct,
	useDeleteProduct,
	useStockAdjust,
	useDownloadProductTemplate,
	useImportProductsFromCsv,
	exportProductsJson,
	exportProductsCsv,
	type Product,
	type CreateProductBody,
	type ProductType,
	type ProductImportError,
	type StockAdjustType,
	type StockAdjustBody,
} from "@/lib/queries/products";

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
	{ value: "FINISHED", label: "Finished" },
	{ value: "RAW", label: "Raw" },
	{ value: "WIP", label: "WIP" },
	{ value: "SERVICE", label: "Service" },
];

const CSV_ACCEPT = ".csv,text/csv,application/vnd.ms-excel";
const MAX_CSV_SIZE_MB = 5;

const STOCK_ADJUST_TYPES: { value: StockAdjustType; label: string }[] = [
	{ value: "STOCK_IN", label: "Stock in" },
	{ value: "STOCK_OUT", label: "Stock out" },
	{ value: "STOCK_ADJUSTED", label: "Adjusted" },
];

// ──────────────────────────────────────────────
// Stock adjust dialog
// ──────────────────────────────────────────────

function StockAdjustDialog({
	open,
	onOpenChange,
	product,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	product: Product | null;
}) {
	const stockAdjustMut = useStockAdjust();
	const [type, setType] = useState<StockAdjustType>("STOCK_IN");
	const [qty, setQty] = useState("");
	const [variant, setVariant] = useState("");
	const [reason, setReason] = useState("");

	useEffect(() => {
		if (open) {
			setType("STOCK_IN");
			setQty("");
			setVariant("");
			setReason("");
		}
	}, [open]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!product) return;
		const numQty = Number(qty);
		if (Number.isNaN(numQty) || numQty <= 0) {
			toast.error("Enter a valid quantity.");
			return;
		}
		try {
			const body: StockAdjustBody = {
				type,
				qty: numQty,
				reason: reason.trim() || undefined,
			};
			if (variant.trim()) body.variant = variant.trim();
			await stockAdjustMut.mutateAsync({ id: product._id, body });
			toast.success("Stock updated.");
			onOpenChange(false);
		} catch {
			toast.error("Failed to adjust stock.");
		}
	}

	const variants = product?.variants ?? [];
	const hasVariants = Array.isArray(variants) && variants.length > 0;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="sm:max-w-md flex flex-col">
				<SheetHeader>
					<SheetTitle>Adjust stock</SheetTitle>
				</SheetHeader>
				{product && (
					<form
						onSubmit={handleSubmit}
						className="flex flex-col flex-1 min-h-0">
						<div className="flex-1 space-y-4 overflow-y-auto px-4">
							<p className="text-sm text-muted-foreground">{product.name}</p>
							<div>
								<label className="text-sm font-medium">Type</label>
								<Select
									value={type}
									onValueChange={(v) => setType(v as StockAdjustType)}>
									<SelectTrigger className="mt-1">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{STOCK_ADJUST_TYPES.map((t) => (
											<SelectItem key={t.value} value={t.value}>
												{t.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<label className="text-sm font-medium">Quantity</label>
								<Input
									type="number"
									min={1}
									value={qty}
									onChange={(e) => setQty(e.target.value)}
									className="mt-1"
									placeholder="0"
								/>
							</div>
							{hasVariants && (
								<div>
									<label className="text-sm font-medium">
										Variant (optional)
									</label>
									<Select value={variant} onValueChange={setVariant}>
										<SelectTrigger className="mt-1">
											<SelectValue placeholder="All / select variant" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="">All</SelectItem>
											{variants.map((v) => (
												<SelectItem key={v.variant} value={v.variant}>
													{v.variant} (qty: {v.qty})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
							<div>
								<label className="text-sm font-medium">Reason (optional)</label>
								<Input
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									className="mt-1"
									placeholder="e.g. Receipt, damage"
								/>
							</div>
						</div>
						<SheetFooter className="mt-4">
							<SheetClose asChild>
								<Button variant="outline" type="button">
									Cancel
								</Button>
							</SheetClose>
							<Button type="submit" disabled={stockAdjustMut.isPending}>
								{stockAdjustMut.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									"Apply"
								)}
							</Button>
						</SheetFooter>
					</form>
				)}
			</SheetContent>
		</Sheet>
	);
}

// ──────────────────────────────────────────────
// Product form dialog (create / edit)
// ──────────────────────────────────────────────

type VariantRow = { variant: string; qty: string };

type ProductFormValues = {
	name: string;
	category: string;
	hsnOrSacCode: string;
	productType: ProductType;
	isInventoryItem: boolean;
	isActive: boolean;
	unit: string;
	gstRate: string;
	costPrice: string;
	sellingPrice: string;
	lowStockThreshold: string;
	notes: string;
	variants: VariantRow[];
};

function ProductFormDialog({
	open,
	onOpenChange,
	editProduct,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	editProduct: Product | null;
}) {
	const createMutation = useCreateProduct();
	const updateMutation = useUpdateProduct();
	const isEdit = !!editProduct;

	const form = useForm<ProductFormValues>({
		defaultValues: {
			name: "",
			category: "",
			hsnOrSacCode: "",
			productType: "FINISHED",
			isInventoryItem: true,
			isActive: true,
			unit: "",
			gstRate: "",
			costPrice: "",
			sellingPrice: "",
			lowStockThreshold: "",
			notes: "",
			variants: [],
		},
	});
	const variantsFieldArray = useFieldArray({
		control: form.control,
		name: "variants",
	});

	useEffect(() => {
		if (editProduct) {
			form.reset({
				name: editProduct.name ?? "",
				category: editProduct.category ?? "",
				hsnOrSacCode: editProduct.hsnOrSacCode ?? "",
				productType: (editProduct.productType as ProductType) ?? "FINISHED",
				isInventoryItem: editProduct.isInventoryItem !== false,
				isActive: editProduct.isActive !== false,
				unit: editProduct.unit ?? "",
				gstRate: editProduct.gstRate != null ? String(editProduct.gstRate) : "",
				costPrice:
					editProduct.costPrice != null ? String(editProduct.costPrice) : "",
				sellingPrice:
					editProduct.sellingPrice != null
						? String(editProduct.sellingPrice)
						: "",
				lowStockThreshold:
					editProduct.lowStockThreshold != null
						? String(editProduct.lowStockThreshold)
						: "",
				notes: editProduct.notes ?? "",
				variants: [],
			});
		} else {
			form.reset({
				name: "",
				category: "",
				hsnOrSacCode: "",
				productType: "FINISHED",
				isInventoryItem: true,
				isActive: true,
				unit: "",
				gstRate: "",
				costPrice: "",
				sellingPrice: "",
				lowStockThreshold: "",
				notes: "",
				variants: [],
			});
		}
	}, [editProduct, open]);

	async function onSubmit(values: ProductFormValues) {
		const name = values.name?.trim();
		if (!name) {
			form.setError("name", { message: "Name is required." });
			return;
		}
		const gstRate = values.gstRate !== "" ? Number(values.gstRate) : undefined;
		if (
			gstRate != null &&
			(Number.isNaN(gstRate) || gstRate < 0 || gstRate > 28)
		) {
			form.setError("gstRate", {
				message: "GST rate must be between 0 and 28.",
			});
			return;
		}

		const body: CreateProductBody = {
			name,
			category: values.category?.trim() || undefined,
			hsnOrSacCode: values.hsnOrSacCode?.trim() || undefined,
			productType: values.productType,
			isInventoryItem: values.isInventoryItem,
			isActive: values.isActive,
			unit: values.unit?.trim() || undefined,
			gstRate,
			costPrice: values.costPrice !== "" ? Number(values.costPrice) : undefined,
			sellingPrice:
				values.sellingPrice !== "" ? Number(values.sellingPrice) : undefined,
			lowStockThreshold:
				values.lowStockThreshold !== ""
					? Number(values.lowStockThreshold)
					: undefined,
			notes: values.notes?.trim() || undefined,
		};

		// Variants only on create: build from rows with non-empty variant + valid qty
		if (!isEdit && values.variants?.length) {
			const parsed = values.variants
				.map((row) => {
					const v = row.variant?.trim();
					if (!v) return null;
					const q = row.qty === "" ? 0 : Number(row.qty);
					return { variant: v, qty: Number.isNaN(q) || q < 0 ? 0 : q };
				})
				.filter((x): x is { variant: string; qty: number } => x !== null);
			if (parsed.length) body.variants = parsed;
		}

		try {
			if (isEdit && editProduct) {
				await updateMutation.mutateAsync({ id: editProduct._id, body });
				toast.success("Product updated.");
			} else {
				await createMutation.mutateAsync(body);
				toast.success("Product created.");
			}
			onOpenChange(false);
		} catch {
			toast.error(
				isEdit ? "Failed to update product." : "Failed to create product.",
			);
		}
	}

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex flex-col h-full w-full sm:max-w-lg overflow-hidden">
				<SheetHeader>
					<SheetTitle>{isEdit ? "Edit product" : "Add product"}</SheetTitle>
				</SheetHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex flex-col flex-1 min-h-0 overflow-hidden">
						<div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input placeholder="Product name" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="category"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Category</FormLabel>
											<FormControl>
												<Input placeholder="e.g. Apparel" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="hsnOrSacCode"
									render={({ field }) => (
										<FormItem>
											<FormLabel>HSN/SAC</FormLabel>
											<FormControl>
												<Input placeholder="e.g. 6109" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="productType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Type</FormLabel>
											<Select
												value={field.value}
												onValueChange={field.onChange}>
												<FormControl>
													<SelectTrigger className="w-full">
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{PRODUCT_TYPES.map((t) => (
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
								<FormField
									control={form.control}
									name="unit"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Unit</FormLabel>
											<FormControl>
												<Input placeholder="e.g. pcs" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="costPrice"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Cost price (₹)</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													placeholder="0"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="sellingPrice"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Selling price (₹)</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													placeholder="0"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={form.control}
								name="gstRate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>GST rate (0–28)</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={0}
												max={28}
												placeholder="0"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="lowStockThreshold"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Low stock threshold</FormLabel>
										<FormControl>
											<Input type="number" min={0} placeholder="0" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="notes"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Notes (optional)</FormLabel>
										<FormControl>
											<Input placeholder="Internal notes" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="flex gap-6">
								<FormField
									control={form.control}
									name="isInventoryItem"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center gap-2">
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
											<FormLabel className="mt-0!">Track inventory</FormLabel>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="isActive"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center gap-2">
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
											<FormLabel className="mt-0!">Active</FormLabel>
										</FormItem>
									)}
								/>
							</div>

							{/* Variants (create only, when tracking inventory) */}
							{!isEdit && form.watch("isInventoryItem") && (
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<label className="text-sm font-medium">
											Variants (optional)
										</label>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												variantsFieldArray.append({
													variant: "",
													qty: "0",
												})
											}>
											<Plus className="size-3.5" />
											Add variant
										</Button>
									</div>
									<p className="text-xs text-muted-foreground">
										Variant combo e.g.{" "}
										<code className="rounded bg-muted px-1">orange-M</code> and
										quantity. SKU is generated by the backend.
									</p>
									{variantsFieldArray.fields.length > 0 && (
										<div className="rounded-md border">
											<Table>
												<TableHeader>
													<TableRow className="hover:bg-transparent">
														<TableHead className="text-xs">Variant</TableHead>
														<TableHead className="text-xs w-24">Qty</TableHead>
														<TableHead className="w-10" />
													</TableRow>
												</TableHeader>
												<TableBody>
													{variantsFieldArray.fields.map((field, index) => (
														<TableRow
															key={field.id}
															className="hover:bg-muted/50">
															<TableCell className="p-2">
																<Input
																	placeholder="e.g. orange-M"
																	className="h-8 text-sm"
																	{...form.register(
																		`variants.${index}.variant`,
																	)}
																/>
															</TableCell>
															<TableCell className="p-2">
																<Input
																	type="number"
																	min={0}
																	className="h-8 text-sm"
																	{...form.register(`variants.${index}.qty`)}
																/>
															</TableCell>
															<TableCell className="p-2">
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	className="size-8 text-muted-foreground hover:text-destructive"
																	onClick={() =>
																		variantsFieldArray.remove(index)
																	}>
																	<Trash2 className="size-3.5" />
																</Button>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									)}
								</div>
							)}
						</div>
						<SheetFooter className="shrink-0 pt-4 border-t mt-4 justify-end gap-2">
							<div className="flex gap-2 w-full">
								<div className="flex-1">
									<SheetClose asChild>
										<Button variant="outline" type="button" className="w-full">
											Cancel
										</Button>
									</SheetClose>
								</div>
								<div className="flex-1">
									<Button type="submit" disabled={isPending} className="w-full">
										{isPending ? (
											<>
												<Loader2 className="size-4 animate-spin" />
												{isEdit ? "Saving..." : "Creating..."}
											</>
										) : isEdit ? (
											"Save changes"
										) : (
											"Add product"
										)}
									</Button>
								</div>
							</div>
						</SheetFooter>
					</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
}

// ──────────────────────────────────────────────
// Import CSV dialog
// ──────────────────────────────────────────────

function ImportProductsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const downloadTemplateMut = useDownloadProductTemplate();
	const importCsvMut = useImportProductsFromCsv();
	const [file, setFile] = useState<File | null>(null);
	const [importResult, setImportResult] = useState<{
		message?: string;
		created?: number;
		updated?: number;
		errors: ProductImportError[];
	} | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const f = e.target.files?.[0];
		if (!f) return;
		if (f.size > MAX_CSV_SIZE_MB * 1024 * 1024) {
			toast.error(`File must be under ${MAX_CSV_SIZE_MB}MB`);
			return;
		}
		setFile(f);
		setImportResult(null);
	}

	async function handleDownloadTemplate() {
		try {
			await downloadTemplateMut.mutateAsync();
			toast.success("Template downloaded.");
		} catch {
			toast.error("Failed to download template.");
		}
	}

	async function handleImport() {
		if (!file) {
			toast.error("Select a CSV file first.");
			return;
		}
		try {
			const res = await importCsvMut.mutateAsync(file);
			setImportResult({
				message: res.message,
				created: res.created,
				updated: res.updated,
				errors: res.errors ?? [],
			});
			const created = res.created ?? 0;
			const updated = res.updated ?? 0;
			if (res.message) {
				toast.success(res.message);
			} else if (created + updated > 0) {
				toast.success(`Imported: ${created} created, ${updated} updated.`);
			}
			if (res.errors?.length) {
				toast.warning(`${res.errors.length} row(s) had errors.`);
			}
			if (created + updated > 0 && (!res.errors || res.errors.length === 0)) {
				setFile(null);
				setImportResult(null);
				if (fileInputRef.current) fileInputRef.current.value = "";
				onOpenChange(false);
			}
		} catch (err: unknown) {
			let msg = "Import failed.";
			if (err && typeof err === "object" && "response" in err) {
				const res = (
					err as {
						response?: {
							data?: { errors?: ProductImportError[]; message?: string };
						};
					}
				).response;
				if (res?.data?.errors?.length) {
					setImportResult({
						message: res.data.message,
						created: 0,
						updated: 0,
						errors: res.data.errors,
					});
				}
				if (res?.data?.message) msg = res.data.message;
			}
			toast.error(msg);
		}
	}

	function handleClose(open: boolean) {
		if (!open) {
			setFile(null);
			setImportResult(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
		onOpenChange(open);
	}

	return (
		<Sheet open={open} onOpenChange={handleClose}>
			<SheetContent
				side="right"
				className="flex flex-col h-full w-full sm:max-w-lg overflow-hidden">
				<SheetHeader>
					<SheetTitle>Import products (CSV)</SheetTitle>
				</SheetHeader>

				<div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-4">
					<p className="text-sm text-muted-foreground">
						Download the template, fill in <strong>name</strong> and optional
						fields. Variants column: use{" "}
						<code className="text-xs bg-muted px-1 rounded">
							part1-%-part2-%-...-%-qty
						</code>{" "}
						per variant, comma-separated (e.g.{" "}
						<code className="text-xs bg-muted px-1 rounded">
							orange-%-M-%-3,orange-%-L-%-7
						</code>
						). Max {MAX_CSV_SIZE_MB}MB.
					</p>

					<div className="flex flex-col gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-fit"
							disabled={downloadTemplateMut.isPending}
							onClick={handleDownloadTemplate}>
							{downloadTemplateMut.isPending ? (
								<>
									<Loader2 className="size-4 animate-spin" /> Downloading...
								</>
							) : (
								<>Download template</>
							)}
						</Button>

						<div className="flex items-center gap-2">
							<input
								ref={fileInputRef}
								type="file"
								accept={CSV_ACCEPT}
								className="hidden"
								onChange={handleFileChange}
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => fileInputRef.current?.click()}>
								{file ? file.name : "Choose CSV file"}
							</Button>
							{file && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-muted-foreground"
									onClick={() => {
										setFile(null);
										setImportResult(null);
										if (fileInputRef.current) fileInputRef.current.value = "";
									}}>
									Clear
								</Button>
							)}
						</div>
					</div>

					{importResult && (
						<div className="space-y-2">
							{(importResult.message ||
								importResult.created != null ||
								importResult.updated != null) && (
								<div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-lg p-3">
									<CheckCircle2 className="size-4 shrink-0" />
									{importResult.message ??
										`${importResult.created ?? 0} created, ${importResult.updated ?? 0} updated.`}
								</div>
							)}
							{importResult.errors.length > 0 && (
								<div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 space-y-1">
									<div className="flex items-center gap-2 font-medium">
										<AlertCircle className="size-4 shrink-0" />
										Errors ({importResult.errors.length})
									</div>
									<ul className="list-disc pl-6 text-xs space-y-0.5 max-h-32 overflow-y-auto">
										{importResult.errors.map((err, i) => (
											<li key={i}>
												{err.row != null && `Row ${err.row}`}
												{err.field && ` · ${err.field}`}
												{` · ${err.reason ?? err}`}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					)}
				</div>

				<SheetFooter className="shrink-0 pt-4 border-t mt-4">
					<SheetClose asChild>
						<Button variant="outline" type="button">
							Cancel
						</Button>
					</SheetClose>
					<Button
						onClick={handleImport}
						disabled={!file || importCsvMut.isPending}>
						{importCsvMut.isPending ? (
							<>
								<Loader2 className="size-4 animate-spin" /> Importing...
							</>
						) : (
							<>
								<Upload className="size-4" /> Import
							</>
						)}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────

export default function ProductsPage() {
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [activeFilter, setActiveFilter] = useState<string>("all");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(
		null,
	);
	const [editProduct, setEditProduct] = useState<Product | null>(null);
	const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

	const { data, isLoading } = useListProducts({
		search: search.trim() || undefined,
		category: categoryFilter !== "all" ? categoryFilter : undefined,
		isActive: activeFilter === "all" ? undefined : activeFilter === "active",
		page,
		limit: pageSize,
		sort: "name",
		order: "asc",
	});

	const deleteMutation = useDeleteProduct();

	const products = data?.data ?? [];
	const pagination = data?.pagination;

	function openCreate() {
		setEditProduct(null);
		setDialogOpen(true);
	}

	function openEdit(p: Product) {
		setEditProduct(p);
		setDialogOpen(true);
	}

	async function handleDelete() {
		if (!deleteProduct) return;
		try {
			await deleteMutation.mutateAsync(deleteProduct._id);
			toast.success("Product deleted.");
			setDeleteProduct(null);
		} catch {
			toast.error("Failed to delete product.");
		}
	}

	async function handleExportJson() {
		try {
			const blob = await exportProductsJson({
				category: categoryFilter !== "all" ? categoryFilter : undefined,
				isActive:
					activeFilter === "all" ? undefined : activeFilter === "active",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "products-export.json";
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Export downloaded.");
		} catch {
			toast.error("Failed to export JSON.");
		}
	}

	async function handleExportCsv() {
		try {
			const blob = await exportProductsCsv({
				category: categoryFilter !== "all" ? categoryFilter : undefined,
				isActive:
					activeFilter === "all" ? undefined : activeFilter === "active",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "products-export.csv";
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Export downloaded.");
		} catch {
			toast.error("Failed to export CSV.");
		}
	}

	return (
		<div className="flex flex-col h-full">
			<DashboardPageHeader title="Products" />
			<div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
				<div className="flex flex-wrap items-center gap-3 py-4">
					<div className="relative flex-1 min-w-[200px] max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							placeholder="Search by name or SKU..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select value={categoryFilter} onValueChange={setCategoryFilter}>
						<SelectTrigger className="w-[140px] h-9">
							<SelectValue placeholder="Category" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All categories</SelectItem>
							<SelectItem value="apparel">Apparel</SelectItem>
							<SelectItem value="electronics">Electronics</SelectItem>
							<SelectItem value="service">Service</SelectItem>
						</SelectContent>
					</Select>
					<Select value={activeFilter} onValueChange={setActiveFilter}>
						<SelectTrigger className="w-[120px] h-9">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="inactive">Inactive</SelectItem>
						</SelectContent>
					</Select>
					<Button
						variant="outline"
						size="sm"
						className="h-9"
						onClick={() => setImportOpen(true)}>
						<Upload className="size-4" />
						Import
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="h-9"
						onClick={handleExportCsv}>
						<Download className="size-4" />
						Export CSV
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="h-9"
						onClick={handleExportJson}>
						<Download className="size-4" />
						Export JSON
					</Button>
					<Button onClick={openCreate} size="sm" className="h-9">
						<Plus className="size-4" />
						Add product
					</Button>
				</div>

				<div className="flex-1 rounded-lg border bg-card overflow-hidden min-h-0 flex flex-col">
					{isLoading ? (
						<div className="p-6 space-y-3">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : products.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<p className="text-sm text-muted-foreground">
								{search.trim() ||
								categoryFilter !== "all" ||
								activeFilter !== "all"
									? "No products match your filters."
									: "No products yet."}
							</p>
							{!search.trim() &&
								categoryFilter === "all" &&
								activeFilter === "all" && (
									<Button
										variant="outline"
										className="mt-4"
										onClick={openCreate}>
										<Plus className="size-4" />
										Add product
									</Button>
								)}
						</div>
					) : (
						<div className="overflow-auto flex-1">
							<DataTable
								columns={getColumns({
									onEdit: openEdit,
									onDelete: setDeleteProduct,
									onStockAdjust: setStockAdjustProduct,
								})}
								data={products}
							/>
						</div>
					)}
				</div>
				{pagination && pagination.totalPages > 1 && (
					<p className="text-xs text-muted-foreground mt-2">
						Page {pagination.page} of {pagination.totalPages} (
						{pagination.total} total)
					</p>
				)}
			</div>

			<ProductFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				editProduct={editProduct}
			/>

			<ImportProductsDialog open={importOpen} onOpenChange={setImportOpen} />

			<StockAdjustDialog
				open={!!stockAdjustProduct}
				onOpenChange={(open) => !open && setStockAdjustProduct(null)}
				product={stockAdjustProduct}
			/>

			<AlertDialog
				open={!!deleteProduct}
				onOpenChange={(open) => !open && setDeleteProduct(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete product?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove {deleteProduct?.name}. Referenced products may be
							deactivated instead of deleted. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteMutation.isPending}>
							{deleteMutation.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								"Delete"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
