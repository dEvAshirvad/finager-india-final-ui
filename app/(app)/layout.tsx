import { AppSidebar } from "@/components/app-sidebar";
import DashHeader from "@/components/dash-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<DashHeader />
				<main className="flex-1">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
