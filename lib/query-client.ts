import type { AxiosRequestConfig } from "axios";
import { api } from "./axios";

/**
 * Default fetcher for useQuery: GET request using axios (cookies sent via withCredentials).
 * Use with queryKey that includes the URL path, e.g. useQuery({ queryKey: ['users'], queryFn: () => fetcher('/users') })
 */
export async function fetcher<T = unknown>(
	url: string,
	config?: AxiosRequestConfig,
): Promise<T> {
	const { data } = await api.get<T>(url, config);
	return data;
}
