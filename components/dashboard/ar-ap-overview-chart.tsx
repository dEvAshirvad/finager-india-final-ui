"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	XAxis,
	YAxis,
} from "recharts";
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
	{ month: "Jul", receivables: 42, payables: 28 },
	{ month: "Aug", receivables: 48, payables: 32 },
	{ month: "Sep", receivables: 52, payables: 30 },
	{ month: "Oct", receivables: 58, payables: 38 },
	{ month: "Nov", receivables: 54, payables: 42 },
	{ month: "Dec", receivables: 62, payables: 45 },
];

const chartConfig: ChartConfig = {
	receivables: { label: "Receivables", color: "#3B5BDB" },
	payables: { label: "Payables", color: "#93C5FD" },
};

/** design.json charts.barChart: #3B5BDB, #93C5FD, rounded tops, horizontal grid #F1F3F5, xAxis 12px #9CA3AF */
export function ArApOverviewChart() {
	return (
		<div className="rounded-xl border border-[#E9ECEF] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-semibold text-[#0D0D0D]">
					AR vs Payables overview
				</h3>
			</div>
			<ChartContainer config={chartConfig} className="h-[280px] w-full">
				<BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
					<CartesianGrid
						strokeDasharray="0"
						vertical={false}
						stroke="#F1F3F5"
					/>
					<XAxis
						dataKey="month"
						tick={{ fill: "#9CA3AF", fontSize: 12 }}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis hide />
					<ChartTooltip content={<ChartTooltipContent />} />
					<Bar
						dataKey="receivables"
						fill="var(--color-receivables)"
						radius={[3, 3, 0, 0]}
					/>
					<Bar
						dataKey="payables"
						fill="var(--color-payables)"
						radius={[3, 3, 0, 0]}
					/>
				</BarChart>
			</ChartContainer>
		</div>
	);
}
