import { cn } from "@/lib/utils";

export type StatItem = {
	/** Left accent color (e.g. purple, green, pink) — Tailwind class or arbitrary */
	accentColor: string;
	/** Small badge text above the metric */
	badge: string;
	/** Optional icon or bullet in badge: "bullet" | "arrow" | "heart" */
	badgeIcon?: "bullet" | "arrow" | "heart";
	/** Optional Tailwind classes for badge background and text (e.g. bg-[#F3E8FF] text-[#6B21A8]) */
	badgeClassName?: string;
	/** Main metric value (e.g. "4.2H", "63%") */
	value: string;
	/** Short label under value (e.g. "Saved weekly") */
	label: string;
	/** Longer description below */
	description: string;
};

type LandingStatsProps = {
	/** Small eyebrow above headline */
	eyebrow?: string;
	/** Main section headline */
	headline: string;
	/** Subtitle below headline */
	subtitle: string;
	/** Array of stat cards */
	stats: StatItem[];
	className?: string;
};

function BadgeIcon({ type }: { type: NonNullable<StatItem["badgeIcon"]> }) {
	if (type === "bullet")
		return <span className="size-1.5 rounded-full bg-current" />;
	if (type === "arrow") return <span className="text-xs">»</span>;
	if (type === "heart") return <span className="text-xs">♥</span>;
	return null;
}

/**
 * Reusable stats section — clone of AlignUI "Stats & Metric" block.
 * Use for landing pages or dashboards; pass headline, subtitle, and stats array.
 */
export function LandingStats({
	eyebrow = "Stats & Metric",
	headline,
	subtitle,
	stats,
	className,
}: LandingStatsProps) {
	return (
		<section className={cn("bg-white py-20 md:py-24", className)}>
			<div className="mx-auto max-w-[1280px] px-6 md:px-12">
				<div className="mb-12 text-center">
					<div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#F8F9FA] px-3 py-1 text-xs font-medium text-muted-foreground">
						<span className="size-1.5 rounded-full bg-primary" />
						{eyebrow}
					</div>
					<h2 className="text-3xl font-semibold tracking-[-0.02em] text-foreground md:text-4xl">
						{headline}
					</h2>
					<p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
						{subtitle}
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-3">
					{stats.map((stat) => (
						<div
							key={stat.value}
							className={cn(
								"relative overflow-hidden rounded-xl border border-[#E9ECEF] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
							)}>
							{/* Left accent bar */}
							<div
								className={cn(
									"absolute left-0 top-0 h-full w-1",
									stat.accentColor,
								)}
							/>
							<div className="pl-4">
								<div
									className={cn(
										"mb-4 inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium",
										stat.badgeClassName ?? "bg-[#F8F9FA] text-muted-foreground",
									)}>
									{stat.badgeIcon && <BadgeIcon type={stat.badgeIcon} />}
									{stat.badge}
								</div>
								<div className="text-3xl font-bold tracking-tight text-foreground">
									{stat.value}
								</div>
								<p className="mt-1 text-sm font-medium text-muted-foreground">
									{stat.label}
								</p>
								<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
									{stat.description}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

const FINAGER_STATS: StatItem[] = [
	{
		accentColor: "bg-[#9333EA]",
		badge: "Save time on manual compliance",
		badgeIcon: "bullet",
		badgeClassName: "bg-[#F3E8FF] text-[#6B21A8]",
		value: "4.2H",
		label: "Saved weekly",
		description:
			"CA firms reduce admin by automating GSTR matching, reports and client reminders.",
	},
	{
		accentColor: "bg-[#22C55E]",
		badge: "Faster onboarding with fewer steps",
		badgeIcon: "arrow",
		badgeClassName: "bg-[#DCFCE7] text-[#16A34A]",
		value: "63%",
		label: "Faster setup",
		description:
			"Most firms add clients and run their first reconciliation in under 15 minutes.",
	},
	{
		accentColor: "bg-[#EC4899]",
		badge: "Better insight into client status",
		badgeIcon: "heart",
		badgeClassName: "bg-[#FCE7F3] text-[#BE185D]",
		value: "96%",
		label: "Filings on time",
		description:
			"Practices using Finager say they miss fewer deadlines and keep clients in the loop.",
	},
];

/** Preconfigured stats section for the Finager landing page. */
export function LandingStatsSection() {
	return (
		<LandingStats
			eyebrow="Stats & Metric"
			headline="Chosen by firms prioritizing compliance"
			subtitle="Cut hours of manual work weekly so your team can focus on advisory, not paperwork."
			stats={FINAGER_STATS}
		/>
	);
}
