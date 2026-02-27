import { deslugify } from "@/lib/deslugify";
import Image from "next/image";
import React from "react";

function DashboardPageHeader({ title }: { title: string }) {
	return (
		<div className="px-6 space-y-4 h-32 flex items-center relative bg-[url('/dashboard-banner.svg')] bg-accent/20 bg-repeat border-b">
			<div className="flex items-center justify-between w-full">
				<div className="flex items-center gap-2">
					<h1 className="font-semibold text-3xl">{deslugify(title)}</h1>
				</div>
				<div className="text-sm text-muted-foreground text-right">
					<p className="font-semibold text-foreground">
						Finager India Helpline: 18003093036
					</p>
					<p className="text-xs">Mon - Fri • 9:00 AM - 7:00 PM • Toll Free</p>
					<p className="text-xs">
						English, हिन्दी, தமிழ், తెలుగు, മലയാളം, ಕನ್ನಡ, मराठी, ગુજરાતી, বাংলা
					</p>
				</div>
			</div>
		</div>
	);
}

export default DashboardPageHeader;
