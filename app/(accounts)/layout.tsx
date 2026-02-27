import { AccountSidebar } from "@/components/account-sidebar";
import DashHeader from "@/components/dash-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AccountsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SidebarProvider>
			<AccountSidebar />
			<SidebarInset>
				<DashHeader />
				<main className="flex-1">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
