import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRightIcon } from "lucide-react";

const FOOTER_LINKS = {
	services: [
		{ label: "GST filing & reconciliation", href: "/#services/gst" },
		{ label: "Accounting reports", href: "/#services/accounting" },
		{ label: "Audit & Form 3CD", href: "/#services/audit" },
		{ label: "Client portal", href: "/#services/portal" },
		{ label: "Multi-client workspace", href: "/#services/workspace" },
	],
	solutions: [
		{ label: "CA firms", href: "/#solutions/firms" },
		{ label: "Client businesses", href: "/#solutions/clients" },
		{ label: "Tax professionals", href: "/#solutions/tax" },
	],
	resources: [
		{ label: "Privacy policy", href: "/privacy" },
		{ label: "Terms of service", href: "/terms" },
		{ label: "Security", href: "/security" },
		{ label: "Help center", href: "/help" },
	],
} as const;

const SOCIAL_ICONS = [
	{ label: "Facebook", href: "#", icon: "f" },
	{ label: "Instagram", href: "#", icon: "📷" },
	{ label: "X", href: "#", icon: "𝕏" },
];

export function LandingFooter() {
	return (
		<footer className="border-t border-[#E9ECEF] bg-white py-16 md:py-20">
			<div className="mx-auto flex max-w-[1280px] flex-col gap-12 px-6 md:flex-row md:gap-16 md:px-12 lg:gap-24">
				{/* Brand + CTA + social */}
				<div className="flex flex-col md:max-w-[280px]">
					<Link href="/" className="flex items-center gap-2 text-[#0D0D0D]">
						<span className="text-lg font-semibold tracking-tight">
							Finager India
							<sup className="ml-0.5 text-xs font-normal opacity-60">™</sup>
						</span>
					</Link>
					<p className="text-sm text-muted-foreground">
						{new Date().getFullYear()} Finager — All rights reserved.
					</p>
					<Button
						variant="outline"
						size="default"
						className="w-fit rounded-lg mt-4"
						asChild>
						<Link href="/signup" className="inline-flex items-center gap-2">
							Get started free
							<ArrowUpRightIcon className="size-4" />
						</Link>
					</Button>
				</div>

				{/* Nav columns */}
				<nav className="grid flex-1 gap-10 sm:grid-cols-3" aria-label="Footer">
					<div>
						<h3 className="mb-4 text-sm font-semibold text-foreground">
							Services
						</h3>
						<ul className="space-y-3">
							{FOOTER_LINKS.services.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-sm text-muted-foreground hover:text-foreground">
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
					<div>
						<h3 className="mb-4 text-sm font-semibold text-foreground">
							Solutions
						</h3>
						<ul className="space-y-3">
							{FOOTER_LINKS.solutions.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-sm text-muted-foreground hover:text-foreground">
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
					<div>
						<h3 className="mb-4 text-sm font-semibold text-foreground">
							Resources
						</h3>
						<ul className="space-y-3">
							{FOOTER_LINKS.resources.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-sm text-muted-foreground hover:text-foreground">
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</nav>
			</div>
		</footer>
	);
}
