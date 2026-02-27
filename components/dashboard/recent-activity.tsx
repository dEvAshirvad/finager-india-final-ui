import Link from "next/link";
import { cn } from "@/lib/utils";
import {
	ArrowRightIcon,
	FileTextIcon,
	ReceiptIcon,
	TrendingUpIcon,
} from "lucide-react";

const ACTIVITY = [
	{
		type: "invoice" as const,
		title: "Invoice #INV-2041 paid",
		desc: "ABC Traders — ₹1,45,000",
		amount: "+₹1,45,000",
		date: "26 Feb 2025",
		positive: true,
	},
	{
		type: "bill" as const,
		title: "Bill #BL-882 due",
		desc: "XYZ Supplies — ₹42,500",
		amount: "₹42,500",
		date: "28 Feb 2025",
		positive: false,
	},
	{
		type: "payment" as const,
		title: "Rental income received",
		desc: "Client: M/s Gupta & Co.",
		amount: "+₹35,000",
		date: "25 Feb 2025",
		positive: true,
	},
	{
		type: "invoice" as const,
		title: "Invoice #INV-2039 overdue",
		desc: "Delta Industries — ₹78,200",
		amount: "₹78,200",
		date: "20 Feb 2025",
		positive: false,
	},
];

function IconForType({ type }: { type: "invoice" | "bill" | "payment" }) {
	if (type === "invoice") return <FileTextIcon className="size-4 text-[#3B5BDB]" />;
	if (type === "bill") return <ReceiptIcon className="size-4 text-[#F59E0B]" />;
	return <TrendingUpIcon className="size-4 text-[#22C55E]" />;
}

export function RecentActivity() {
	return (
		<div className="rounded-xl border border-[#E9ECEF] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-semibold text-[#0D0D0D]">
					Recent activity
				</h3>
				<Link
					href="/accounting/reports"
					className="text-sm font-medium text-[#3B5BDB] hover:underline"
				>
					See all
					<ArrowRightIcon className="ml-0.5 inline size-3.5" />
				</Link>
			</div>
			<ul className="space-y-1">
				{ACTIVITY.map((item) => (
					<li
						key={item.title}
						className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:bg-[#F8F9FA]"
					>
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F3F5]">
							<IconForType type={item.type} />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium text-[#0D0D0D]">
								{item.title}
							</p>
							<p className="truncate text-xs text-[#6B7280]">{item.desc}</p>
						</div>
						<div className="shrink-0 text-right">
							<p
								className={cn(
									"text-sm font-medium tabular-nums",
									item.positive ? "text-[#16A34A]" : "text-[#0D0D0D]",
								)}
							>
								{item.amount}
							</p>
							<p className="text-xs text-[#9CA3AF]">{item.date}</p>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
