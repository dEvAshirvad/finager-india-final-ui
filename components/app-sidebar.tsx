"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Book, ChevronDownIcon } from "lucide-react";

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const data = {
	navMain: [
		{ title: "Dashboard", url: "/dashboard", items: [] },
		{ title: "Products", url: "/products", items: [] },
		{
			title: "Sales",
			items: [
				{ title: "Customer", url: "/sales/customer" },
				{ title: "Invoices", url: "/sales/invoices" },
			],
		},
		{
			title: "GST Reconcillation",
			url: "/gst-reconcillation",
			items: [],
		},
		{
			title: "Expenses",
			items: [
				{ title: "Vendors", url: "/expenses/vendors" },
				{ title: "Bills", url: "/expenses/bills" },
			],
		},
		{
			title: "Accounting",
			items: [
				{ title: "COA", url: "/accounting/coa" },
				{ title: "Journals", url: "/accounting/journals" },
				{ title: "Events", url: "/accounting/events" },
				{ title: "Recurring Events", url: "/accounting/recurring-events" },
				{ title: "Reports", url: "/accounting/reports" },
			],
		},
	],
};

/** Path prefix for a section (e.g. /sales from first child /sales/customer) */
function getSectionPath(item: (typeof data.navMain)[number]): string | null {
	if (!item.items?.length) return null;
	const first = item.items[0];
	if (!first?.url) return null;
	const parts = first.url.split("/").filter(Boolean);
	if (parts.length < 2) return null;
	return "/" + parts[0];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const [openSection, setOpenSection] = React.useState<string | null>(null);

	const pathnameOpenSection = React.useMemo(() => {
		for (const item of data.navMain) {
			const sectionPath = getSectionPath(item);
			if (sectionPath && pathname.startsWith(sectionPath)) return item.title;
		}
		return null;
	}, [pathname]);

	const effectiveOpen = openSection ?? pathnameOpenSection;

	return (
		<Sidebar {...props}>
			<SidebarHeader className="h-16 border-b border-[#E9ECEF]">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<a href="/dashboard">
								<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
									<Book className="size-4" />
								</div>
								<div className="flex flex-col gap-0.5 leading-none">
									<span className="font-medium">Finager India</span>
									<span className="">v1.0.0</span>
								</div>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						{data.navMain.map((item) => {
							if (!item.items?.length) {
								return (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton asChild isActive={pathname === item.url}>
											<a href={item.url} className="font-medium">
												{item.title}
											</a>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							}
							const isOpen = effectiveOpen === item.title;
							return (
								<Collapsible
									key={item.title}
									open={isOpen}
									onOpenChange={(open) =>
										setOpenSection(open ? item.title : null)
									}>
									<SidebarMenuItem key={item.title}>
										<CollapsibleTrigger asChild>
											<SidebarMenuButton className="font-medium">
												{item.title}
												<ChevronDownIcon
													className={cn(
														"ml-auto size-4 transition-transform duration-200",
														isOpen && "rotate-180",
													)}
												/>
											</SidebarMenuButton>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>
												{item.items.map((sub) => (
													<SidebarMenuSubItem key={sub.title}>
														<SidebarMenuSubButton
															asChild
															isActive={pathname === sub.url}>
															<a href={sub.url}>{sub.title}</a>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												))}
											</SidebarMenuSub>
										</CollapsibleContent>
									</SidebarMenuItem>
								</Collapsible>
							);
						})}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}
