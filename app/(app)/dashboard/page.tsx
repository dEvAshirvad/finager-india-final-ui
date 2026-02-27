import DashboardPageHeader from "@/components/dahboard-page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ArApOverviewChart } from "@/components/dashboard/ar-ap-overview-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { OutstandingBreakdown } from "@/components/dashboard/outstanding-breakdown";

export default function DashboardPage() {
	return (
		<div className="min-h-full">
			<DashboardPageHeader title="dashboard" />
			<div className="p-6 md:p-8">
				{/* Metric cards — design.json cards.metric, CA focus: AR, AP, Invoices, Bills */}
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<MetricCard
						label="Account receivable"
						value="₹12,45,000"
						trend={{ value: 8, positive: true }}
						subtext="Overdue: ₹1,20,000"
					/>
					<MetricCard
						label="Account payable"
						value="₹8,32,500"
						trend={{ value: -3, positive: false }}
						subtext="Due this week: ₹2,40,000"
					/>
					<MetricCard
						label="Invoices (MTD)"
						value="24"
						trend={{ value: 12, positive: true }}
						subtext="₹4.2L raised"
					/>
					<MetricCard
						label="Bills (MTD)"
						value="18"
						trend={{ value: 5, positive: false }}
						subtext="₹3.1L to pay"
					/>
				</div>

				{/* Charts + Activity — design.json layoutPatterns.dashboardTwoPanel / cardGrid */}
				<div className="mt-6 grid gap-6 lg:grid-cols-3">
					<div className="lg:col-span-2">
						<ArApOverviewChart />
					</div>
					<div>
						<OutstandingBreakdown />
					</div>
				</div>

				<div className="mt-6">
					<RecentActivity />
				</div>
			</div>
		</div>
	);
}
