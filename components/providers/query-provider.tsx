"use client";

import {
	QueryClient,
	QueryClientProvider as TanStackQueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

const defaultOptions = {
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000, // 1 minute
		},
	},
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(() => new QueryClient(defaultOptions));

	return (
		<TanStackQueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</TanStackQueryClientProvider>
	);
}
