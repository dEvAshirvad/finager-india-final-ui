import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

const BASE = "/api/v1/business/products";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ProductType = "RAW" | "WIP" | "FINISHED" | "SERVICE";

export type ProductVariantEntry = {
	_id?: string;
	variant: string;
	qty: number;
	skuCode?: string;
	costPrice?: number;
	sellingPrice?: number;
};

export type BomEntry = {
	componentProductId: string;
	qty: number;
};

export type ProductSku = {
	variantCombo?: string;
	skuCode: string;
	qty: number;
	costPrice?: number;
	sellingPrice?: number;
};

export type Product = {
	_id: string;
	organizationId: string;
	name: string;
	variants?: ProductVariantEntry[];
	sku?: ProductSku[];
	hsnOrSacCode?: string;
	isInventoryItem?: boolean;
	productType?: ProductType;
	parentProductId?: string | null;
	bom?: BomEntry[];
	category?: string;
	unit?: string;
	gstRate?: number;
	sellingPrice?: number;
	costPrice?: number;
	lowStockThreshold?: number;
	isActive?: boolean;
	tags?: string[];
	notes?: string;
	createdBy?: string;
	updatedBy?: string;
	createdAt?: string;
	updatedAt?: string;
	// Virtuals (read-only)
	currentQty?: number;
	totalCostValue?: number;
	avgCost?: number;
	totalStock?: number;
	matchedVariants?: string[];
};

export type CreateProductBody = {
	name: string;
	variants?: ProductVariantEntry[];
	hsnOrSacCode?: string;
	isInventoryItem?: boolean;
	productType?: ProductType;
	parentProductId?: string | null;
	bom?: BomEntry[];
	category?: string;
	unit?: string;
	gstRate?: number;
	sellingPrice?: number;
	costPrice?: number;
	lowStockThreshold?: number;
	isActive?: boolean;
	tags?: string[];
	notes?: string;
};

/** PATCH does not accept variants (stripped by backend); use stock-adjust or import for qty changes. */
export type UpdateProductBody = Partial<Omit<CreateProductBody, "variants">>;

export type ListProductsParams = {
	search?: string;
	category?: string;
	tags?: string;
	isActive?: boolean;
	page?: number;
	limit?: number;
	sort?: string;
	order?: "asc" | "desc";
};

export type PaginatedProductsResponse = {
	data: Product[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext?: boolean;
		hasPrev?: boolean;
	};
};

export type ProductImportError = {
	row?: number;
	field?: string;
	reason?: string;
};

export type ProductImportResponse = {
	message?: string;
	hit?: number;
	miss?: number;
	created?: number;
	updated?: number;
	errors: ProductImportError[];
	imported?: Product[];
};

// ──────────────────────────────────────────────
// Envelope unwrap
// ──────────────────────────────────────────────

function unwrap<T>(raw: unknown): T {
	const envelope = raw as { success?: boolean; data?: T };
	if (envelope && typeof envelope === "object" && "data" in envelope) {
		return envelope.data as T;
	}
	return raw as T;
}

/** Unwrap get-one response that may be { product } */
function unwrapProduct(raw: unknown): Product {
	const inner = unwrap<{ product?: Product } | Product>(raw);
	if (
		inner &&
		typeof inner === "object" &&
		"product" in inner &&
		inner.product
	) {
		return inner.product;
	}
	return inner as Product;
}

// ──────────────────────────────────────────────
// API functions
// ──────────────────────────────────────────────

async function listProducts(
	params: ListProductsParams,
): Promise<PaginatedProductsResponse> {
	const { data } = await api.get(BASE, { params });
	const inner = unwrap<PaginatedProductsResponse | Product[]>(data);
	if (Array.isArray(inner)) {
		return {
			data: inner,
			pagination: {
				page: params.page ?? 1,
				limit: params.limit ?? 20,
				total: inner.length,
				totalPages: 1,
			},
		};
	}
	if (inner && typeof inner === "object" && "data" in inner) {
		return inner as PaginatedProductsResponse;
	}
	return {
		data: [],
		pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
	};
}

async function getProduct(id: string): Promise<Product> {
	const { data } = await api.get(`${BASE}/${id}`);
	return unwrapProduct(data);
}

async function createProduct(body: CreateProductBody): Promise<Product> {
	const { data } = await api.post(BASE, body);
	return unwrapProduct(data);
}

async function updateProduct(
	id: string,
	body: UpdateProductBody,
): Promise<Product> {
	const { data } = await api.patch(`${BASE}/${id}`, body);
	return unwrapProduct(data);
}

async function deleteProduct(id: string): Promise<{ message: string }> {
	const { data } = await api.delete(`${BASE}/${id}`);
	const inner = unwrap<{ message?: string }>(data);
	return typeof inner === "object" && inner && "message" in inner
		? { message: (inner as { message: string }).message }
		: { message: "Product deleted" };
}

export type StockAdjustType = "STOCK_IN" | "STOCK_OUT" | "STOCK_ADJUSTED";

export type StockAdjustBody = {
	type: StockAdjustType;
	qty: number;
	variant?: string;
	reason?: string;
	costPrice?: number;
	orchid?: string;
};

async function stockAdjust(
	id: string,
	body: StockAdjustBody,
): Promise<Product> {
	const { data } = await api.post<unknown>(`${BASE}/${id}/stock-adjust`, body);
	return unwrapProduct(data);
}

async function downloadProductTemplate(): Promise<void> {
	const { data } = await api.get<Blob>(`${BASE}/template`, {
		responseType: "blob",
	});
	const url = URL.createObjectURL(data);
	const a = document.createElement("a");
	a.href = url;
	a.download = "products-import-template.csv";
	a.click();
	URL.revokeObjectURL(url);
}

async function importProductsFromCsv(
	file: File,
): Promise<ProductImportResponse> {
	const formData = new FormData();
	formData.append("file", file);
	const { data } = await api.post<ProductImportResponse>(
		`${BASE}/import`,
		formData,
		{
			headers: { "Content-Type": "multipart/form-data" },
		},
	);
	if (typeof data === "object" && data !== null && "data" in data) {
		return (data as { data: ProductImportResponse }).data;
	}
	return data as ProductImportResponse;
}

async function exportProductsJson(params?: {
	category?: string;
	isActive?: boolean;
}): Promise<Blob> {
	const { data } = await api.get<Blob>(`${BASE}/export/json`, {
		params,
		responseType: "blob",
	});
	return data;
}

async function exportProductsCsv(params?: {
	category?: string;
	isActive?: boolean;
}): Promise<Blob> {
	const { data } = await api.get<Blob>(`${BASE}/export/csv`, {
		params,
		responseType: "blob",
	});
	return data;
}

export { exportProductsJson, exportProductsCsv };

// ──────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────

export const productKeys = {
	all: ["business", "products"] as const,
	lists: () => [...productKeys.all, "list"] as const,
	list: (params: ListProductsParams) =>
		[...productKeys.lists(), params] as const,
	detail: (id: string) => [...productKeys.all, "detail", id] as const,
};

// ──────────────────────────────────────────────
// React Query hooks
// ──────────────────────────────────────────────

export function useListProducts(params: ListProductsParams) {
	return useQuery({
		queryKey: productKeys.list(params),
		queryFn: () => listProducts(params),
	});
}

export function useGetProduct(id: string | null) {
	return useQuery({
		queryKey: productKeys.detail(id!),
		queryFn: () => getProduct(id!),
		enabled: !!id,
	});
}

export function useCreateProduct() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: productKeys.all });
		},
	});
}

export function useUpdateProduct() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateProductBody }) =>
			updateProduct(id, body),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: productKeys.all });
		},
	});
}

export function useDeleteProduct() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: productKeys.all });
		},
	});
}

export function useStockAdjust() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: StockAdjustBody }) =>
			stockAdjust(id, body),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: productKeys.all });
		},
	});
}

export function useDownloadProductTemplate() {
	return useMutation({
		mutationFn: downloadProductTemplate,
	});
}

export function useImportProductsFromCsv() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: importProductsFromCsv,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: productKeys.all });
		},
	});
}
