import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingHero() {
	return (
		<section className={cn("relative min-h-[90vh] overflow-hidden")}>
			{/* Hero image as full-bleed background */}
			<Image
				src="/Hero.png"
				alt=""
				aria-hidden
				fill
				className="object-cover object-top"
				priority
				sizes="100vw"
			/>
			{/* Gradient overlay on top of image — dark left for copy, blue mesh, transparent right */}
			<div className={cn("absolute inset-0 z-1")} />
			<div className="relative z-10 mx-auto flex min-h-[80vh] max-w-[1280px] flex-col items-center gap-12 px-6 py-20 md:flex-row md:gap-16 md:px-12 md:py-24 lg:gap-24">
				{/* Copy column — design.json heroSection.copyColumn, 45–50% */}
				<div className="flex flex-1 flex-col justify-center md:max-w-[50%]">
					{/* Eyebrow — design.json eyebrow: badge #EEF2FF / #3B5BDB, 12px, font-semibold, rounded 6px, 4px 10px */}
					<div
						className={cn(
							"mb-4 inline-flex w-fit items-center gap-1.5 rounded-md bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#3B5BDB]",
						)}>
						<span className="size-1.5 rounded-full bg-[#3B5BDB]" aria-hidden />
						New — Upgrade your practice now
					</div>

					{/* Headline — design.json hero: 48–56px, weight 700, lineHeight 1.1, letterSpacing -0.03em; on dark use inverse #FFFFFF */}
					<h1
						className={cn(
							"max-w-[480px] text-2xl font-bold leading-[1.1] tracking-[-0.03em] text-white",
							"md:text-3xl lg:text-4xl",
						)}>
						GST, books, and audits — one workspace for your firm.
					</h1>

					{/* Subheadline — design.json subheadline: 16–18px, 1.6, marginTop 16px; on dark use muted light */}
					<p
						className={cn(
							"mt-4 max-w-[440px] text-base leading-[1.6] text-white/80 md:text-lg",
						)}>
						From GSTR-1 to Form 3CD, Finager gives CAs complete control over
						client work — so you can focus on growth.
					</p>

					{/* CTA group — design.json ctaGroup: marginTop 32px, row, gap 12px */}
					<div className="mt-8 flex flex-wrap gap-3">
						<Button size="lg" asChild>
							<Link
								href="/signup"
								className="inline-flex items-center gap-2 group">
								Get started free
								<ArrowUpRight className="size-4 group-hover:rotate-0 rotate-45 transition-transform duration-300" />
							</Link>
						</Button>
						<Button variant="outline" size="lg" asChild>
							<Link href="/#contact">Talk to sales</Link>
						</Button>
					</div>
				</div>

				{/* Mockup column — design.json heroSection.mockupColumn: browser chrome, shadow, 50–55% */}
			</div>
			<div className="absolute -bottom-[10px] -right-[10px] flex flex-1 w-1/2 h-2/3">
				<div
					className={cn(
						"w-full h-full overflow-hidden rounded-xl",
						"shadow-[0_20px_60px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.08)]",
					)}>
					{/* Browser chrome — design.json browserChrome: #F1F3F5, dots, rounded top */}
					<div
						className={cn(
							"flex items-center gap-2 rounded-t-[10px] border-b border-[#E9ECEF] bg-[#F1F3F5] px-3 py-2",
						)}>
						<span className="size-2.5 rounded-full bg-[#FF5F57]" />
						<span className="size-2.5 rounded-full bg-[#FFBD2E]" />
						<span className="size-2.5 rounded-full bg-[#28CA41]" />
						<div
							className={cn(
								"ml-4 flex flex-1 items-center gap-2 rounded-md bg-white px-3 py-1.5 text-xs text-muted-foreground",
							)}>
							<span aria-hidden>🔒</span>
							<span>app.finager.in</span>
						</div>
					</div>
					{/* Content area — design.json contentArea: white, border, rounded bottom */}
					<div
						className={cn(
							"relative aspect-16/10 overflow-hidden rounded-b-[10px] border border-t-0 border-[#E9ECEF] bg-white",
						)}>
						<Image
							src="/Hero.png"
							alt="Finager dashboard preview — cards, sidebar, and reports"
							fill
							className="object-cover object-top"
							priority
							sizes="(max-width: 768px) 100vw, 520px"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
