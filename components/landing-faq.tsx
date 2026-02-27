"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ArrowUpRightIcon } from "lucide-react";

const FAQ_ITEMS = [
	{
		q: "How does pricing work for CA firms?",
		a: "We charge per active client per month. There are no setup fees; you can add your first clients and run reconciliations on a free trial, then choose a plan that fits your firm size.",
	},
	{
		q: "Can my clients upload documents and view reports?",
		a: "Yes. Each client gets a secure portal to upload invoices and books, view P&L and Balance Sheet, and approve filings. You control what they see and when.",
	},
	{
		q: "Do you support GSTR-1 and GSTR-2B reconciliation?",
		a: "Yes. We help you match books with GSTR-2B, surface mismatches, and prepare GSTR-1. You can export data for filing on the GST portal or use our filing workflow when available.",
	},
	{
		q: "What about Form 3CD and audit checklists?",
		a: "We provide Form 3CD-style checklists and let you attach workings and evidence. You can track completion and reviewer sign-off in one place.",
	},
	{
		q: "Is my data secure?",
		a: "We use encryption in transit and at rest, and data is logically separated per workspace. We comply with standard security practices and can provide a security overview on request.",
	},
];

export function LandingFaq() {
	return (
		<section className="border-t border-[#E9ECEF] bg-white py-20 md:py-24">
			<div className="mx-auto max-w-[1280px] px-6 md:px-12">
				<div className="mb-12 text-center">
					<div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#F8F9FA] px-3 py-1 text-xs font-medium text-muted-foreground">
						<span className="size-1.5 rounded-full bg-primary" />
						Need help?
					</div>
					<h2 className="text-3xl font-semibold tracking-[-0.02em] text-foreground md:text-4xl">
						Frequently asked questions
					</h2>
					<p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
						Find quick answers about pricing, onboarding, and compliance tools.
					</p>
				</div>

				<div className="grid lg:grid-cols-[320px_1fr]">
					{/* Support card — left column */}
					<div className="flex flex-col items-center lg:items-start">
						<div
							className={cn(
								"relative h-[400px] w-full max-w-[280px] overflow-hidden rounded-xl bg-[#1A1A2E] shadow-md",
							)}>
							<div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgba(59,91,219,0.2),transparent)]" />
							<div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4">
								<p className="font-semibold text-white">Support team</p>
								<p className="text-xs text-white/80">Here when you need us</p>
							</div>
							<span className="absolute right-3 top-3 size-2.5 rounded-full bg-[#22C55E]" />
						</div>
						<div className="mt-6 text-center lg:text-left">
							<p className="text-sm font-medium text-foreground">
								Need guidance? <strong>We&apos;re ready when you are.</strong>
							</p>
							<p className="mt-1 text-sm text-muted-foreground">
								It&apos;s completely free, just for you.
							</p>
							<Button
								variant="outline"
								size="default"
								className="mt-4 w-full rounded-lg sm:w-auto"
								asChild>
								<Link
									href="/#contact"
									className="inline-flex items-center gap-2">
									Book a meeting
									<ArrowUpRightIcon className="size-4" />
								</Link>
							</Button>
						</div>
					</div>

					{/* FAQ accordion — right column */}
					<div>
						<Accordion type="single" collapsible className="w-full space-y-2">
							{FAQ_ITEMS.map((item, i) => (
								<AccordionItem
									key={i}
									value={`item-${i}`}
									className={cn(
										"rounded-xl border border-[#E9ECEF] bg-white px-4 shadow-none",
									)}>
									<AccordionTrigger className="py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
										<span className="pr-4 text-left text-sm font-medium text-foreground">
											{item.q}
										</span>
									</AccordionTrigger>
									<AccordionContent className="text-sm text-muted-foreground">
										{item.a}
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</div>
				</div>
			</div>
		</section>
	);
}
