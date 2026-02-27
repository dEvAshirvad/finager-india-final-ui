import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import { Separator } from "./ui/separator";

const STEPS = [
	{
		number: "01",
		numberColor: "text-[#3B5BDB]",
		title: "Sign up",
		description: "Create your firm account and add team members in minutes.",
	},
	{
		number: "02",
		numberColor: "text-[#22C55E]",
		title: "Onboarding",
		description:
			"Invite clients, upload books or connect data, and set your first filings.",
	},
	{
		number: "03",
		numberColor: "text-[#9333EA]",
		title: "Audit",
		description:
			"Run reconciliations, generate reports and Form 3CD with one workspace.",
	},
] as const;

export function LandingHowItWorks() {
	return (
		<section className="bg-[#F8F9FA] py-20 md:py-24">
			<div className="mx-auto max-w-[1280px] px-6 md:px-12">
				{/* Header: eyebrow + headline + side CTA */}
				<div className="mb-12 flex flex-col gap-6 md:flex-row md:justify-between md:gap-8">
					<div className="text-center md:text-left">
						<p className="mb-2 text-sm text-muted-foreground">
							Secure, simple and smart tools
						</p>
						<h2 className="text-3xl font-semibold tracking-[-0.02em] w-2/3 text-foreground md:text-4xl">
							Set up and take control in just 3 steps
						</h2>
					</div>
					<div className="flex flex-col items-center  md:items-end">
						<p className="text-sm text-muted-foreground">
							Stay on schedule with smart, automated filings.
						</p>
						<Link
							href="/signup"
							className="inline-flex items-center gap-1.5 capitalize">
							Get started
							<ArrowRightIcon className="size-4 -rotate-45" />
						</Link>
					</div>
				</div>

				{/* Step cards */}
				<div className="grid gap-3 md:grid-cols-3 ">
					{STEPS.map((step) => (
						<div
							key={step.number}
							className={cn(
								"flex flex-col gap-4 rounded-xl border border-[#E9ECEF] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
							)}>
							<div className="flex gap-2 h-full">
								<span
									className={cn(
										"text-2xl font-bold tracking-tight mx-3",
										step.numberColor,
									)}>
									{step.number}
								</span>
								<Separator orientation="vertical" className="h-full" />
								<div className="space-y-3 mx-1">
									<p className="font-medium text-muted-foreground">
										{step.title}
									</p>
									<p className="text-lg font-semibold leading-tight text-foreground">
										{step.description}
									</p>
									<div className="mt-auto flex justify-end"></div>
								</div>
							</div>
						</div>
					))}
				</div>

				<p className="mt-8 text-center text-sm text-muted-foreground">
					From setup to success, all in minutes.
				</p>
			</div>
		</section>
	);
}
