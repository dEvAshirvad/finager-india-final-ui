import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import OrganisationSheet from "@/components/organisation-sheet";
import ProfileSheet from "@/components/profile";
import { Separator } from "@/components/ui/separator";
import NotificationSheet from "./notifications";

function DashHeader() {
	return (
		<header className="flex h-16 shrink-0 sticky top-0 z-10 bg-background items-center w-full gap-2 border-b px-4 text-sm justify-between">
			<div className="flex items-center gap-2">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mr-2 data-[orientation=vertical]:h-4"
				/>
			</div>
			<div className="flex items-center gap-2">
				<OrganisationSheet />
				<NotificationSheet />
				<ProfileSheet />
			</div>
		</header>
	);
}

export default DashHeader;
