import { cn } from "@/lib/utils";
import {
	Card,
	CardContent,
	CardDescription,
	CardTitle,
} from "@/components/ui/card";
import {
	FileSpreadsheetIcon,
	Users2Icon,
	ReceiptIndianRupeeIcon,
	LineChartIcon,
	BellIcon,
	ShieldCheckIcon,
} from "lucide-react";

const FEATURES = [
	{
		icon: FileSpreadsheetIcon,
		title: "Smart GST reconciliation",
		description:
			"Auto-match GSTR-1, 2B and books, surface mismatches, and prepare filings faster.",
	},
	{
		icon: Users2Icon,
		title: "Multi-client workspace",
		description:
			"Manage every client in one place with clear work queues and owners.",
	},
	{
		icon: ReceiptIndianRupeeIcon,
		title: "Accounting reports on tap",
		description:
			"Generate Trial Balance, P&L and Balance Sheet from a single source of truth.",
	},
	{
		icon: LineChartIcon,
		title: "Practice-wide visibility",
		description:
			"See which filings are pending, overdue or at risk across all entities.",
	},
	{
		icon: BellIcon,
		title: "Automated reminders",
		description:
			"Schedule nudges for clients and partners so deadlines are never missed.",
	},
	{
		icon: ShieldCheckIcon,
		title: "Audit-ready evidence",
		description:
			"Attach workings and documents to Form 3CD checklists for clean trails.",
	},
] as const;

export function LandingFeatures() {
	return (
		<section className="bg-white py-20 md:py-24">
			<div className="mx-auto flex max-w-[1280px] flex-col gap-12 px-6 md:px-12">
				{/* Heading block */}
				<div className="mx-auto max-w-2xl text-center">
					<div className="mb-4 inline-flex items-center rounded-full bg-[#F8F9FA] px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
						Built for CA firms
					</div>
					<h2 className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-[2.15rem]">
						Everything you need to take control of every client file.
					</h2>
				</div>

				{/* Feature grid */}
				<div className="grid gap-4 md:grid-cols-3 md:gap-6">
					{FEATURES.map((feature) => {
						const Icon = feature.icon;
						return (
							<Card
								key={feature.title}
								className="border-[#F1F3F5] bg-[#F8F9FA]/80 px-5 py-6 shadow-none transition-colors hover:bg-[#F8F9FA]">
								<CardContent className="space-y-4 px-0">
									<div className="inline-flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
										<Icon className="size-4" />
									</div>
									<div className="space-y-1">
										<CardTitle className="text-[15px] font-semibold text-foreground">
											{feature.title}
										</CardTitle>
										<CardDescription className="text-sm leading-relaxed text-muted-foreground">
											{feature.description}
										</CardDescription>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</section>
	);
}
