"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

const data = [
	{ name: "Invoices", value: 52, fill: "#3B5BDB" },
	{ name: "Bills", value: 31, fill: "#93C5FD" },
	{ name: "Other", value: 17, fill: "#C4B5FD" },
];

const chartConfig: ChartConfig = {
	Invoices: { label: "Invoices", color: "#3B5BDB" },
	Bills: { label: "Bills", color: "#93C5FD" },
	Other: { label: "Other", color: "#C4B5FD" },
};

/** design.json chart colors; compact pie for outstanding breakdown */
export function OutstandingBreakdown() {
	return (
		<div className="rounded-xl border border-[#E9ECEF] bg-white p-5 h-full flex flex-col gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
			<h3 className="mb-4 text-lg font-semibold text-[#0D0D0D]">
				Outstanding by type
			</h3>
			<div className="flex-1">
				<ChartContainer
					config={chartConfig}
					className="mx-auto h-[200px] w-full max-w-[200px]">
					<PieChart>
						<Pie
							data={data}
							dataKey="value"
							nameKey="name"
							cx="50%"
							cy="50%"
							innerRadius={50}
							outerRadius={80}
							strokeWidth={0}
							paddingAngle={2}>
							{data.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={entry.fill} />
							))}
						</Pie>
					</PieChart>
				</ChartContainer>
				<div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
					{data.map((d) => (
						<div key={d.name} className="flex items-center gap-1.5">
							<span
								className="size-2 rounded-full"
								style={{ backgroundColor: d.fill }}
							/>
							<span className="text-[#6B7280]">{d.name}</span>
							<span className="font-medium text-[#0D0D0D]">{d.value}%</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
