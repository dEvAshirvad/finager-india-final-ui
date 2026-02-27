import { cn } from "@/lib/utils";

type MetricCardProps = {
	label: string;
	value: string;
	trend?: { value: number; positive: boolean };
	subtext?: string;
	className?: string;
};

/** design.json cards.metric: label 12px #9CA3AF uppercase, value 28-36px bold #0D0D0D, trend badge */
export function MetricCard({ label, value, trend, subtext, className }: MetricCardProps) {
	return (
		<div
			className={cn(
				"rounded-xl border border-[#E9ECEF] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]",
				className,
			)}
		>
			<p className="text-xs font-medium uppercase tracking-widest text-[#9CA3AF]">
				{label}
			</p>
			<p className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-[#0D0D0D]">
				{value}
			</p>
			{(trend !== undefined || subtext) && (
				<div className="mt-2 flex flex-wrap items-center gap-2">
					{trend !== undefined && (
						<span
							className={cn(
								"inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold",
								trend.positive
									? "bg-[#DCFCE7] text-[#16A34A]"
									: "bg-[#FEE2E2] text-[#DC2626]",
							)}
						>
							{trend.positive ? "+" : ""}
							{trend.value}%
						</span>
					)}
					{subtext && (
						<span className="text-xs text-[#6B7280]">{subtext}</span>
					)}
				</div>
			)}
		</div>
	);
}
