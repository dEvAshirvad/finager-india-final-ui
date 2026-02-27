"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, UserIcon, XIcon } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { useGetSession, useSignInSocial } from "@/lib/queries/auth";

type NavItem = {
	value: string;
	label: string;
	href: string;
	badge?: string;
	dropdown?: boolean;
};

const NAV_ITEMS: NavItem[] = [
	{ value: "products", label: "Products", href: "/" },
	{ value: "services", label: "Services", href: "/#services", badge: "New" },
	{
		value: "solutions",
		label: "Solutions",
		href: "/#solutions",
		dropdown: true,
	},
	{ value: "pricing", label: "Pricing", href: "/#pricing" },
	{ value: "contact", label: "Contact", href: "/#contact" },
];

export function AppHeader() {
	const [announcementOpen, setAnnouncementOpen] = useState(true);
	const { data: session } = useGetSession();
	const isSignedIn = !!session?.user;
	const { mutate: signIn, isPending: isSigningIn } = useSignInSocial();

	return (
		<header
			className={cn(
				"sticky top-0 z-[100] w-full border-b border-[#E9ECEF] bg-[#FFFFFF]",
			)}>
			{/* Optional announcement bar — design.json navbar.announcementBar */}
			{announcementOpen && (
				<div
					className={cn(
						"flex h-9 items-center justify-center gap-2 border-b border-[#E9ECEF] bg-[#F8F9FA] px-4 text-center text-[13px] text-muted-foreground",
					)}>
					<span>
						<Badge
							variant="secondary"
							className="mr-1.5 rounded bg-primary/10 px-1.5 py-0 text-[11px] font-semibold text-primary">
							New
						</Badge>
						Multi-currency cards are now available for all users.
					</span>
					<button
						type="button"
						aria-label="Dismiss announcement"
						className="rounded p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground"
						onClick={() => setAnnouncementOpen(false)}>
						<XIcon className="size-4" />
					</button>
				</div>
			)}

			{/* Main nav — design.json navbar: height 64px, padding 0 48px, logo + nav left, CTAs right */}
			<div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-8 px-6 md:px-12">
				<div className="flex min-w-0 flex-1 items-center gap-8">
					{/* Logo — design.json navbar.logoSize 32px icon + wordmark */}
					<Link
						href="/"
						className="flex shrink-0 items-center gap-2 text-[#0D0D0D]"
						aria-label="Home">
						<span className="text-lg font-semibold tracking-tight">
							Finager India v1.0
						</span>
					</Link>

					{/* Nav — simple horizontal button-style links, design.json navLink: 14px, font-medium, gap 32px */}
					<nav
						className="hidden flex-1 md:flex md:items-center md:gap-4"
						aria-label="Main">
						{NAV_ITEMS.map((item) => (
							<Button
								key={item.value}
								variant="ghost"
								size="sm"
								asChild
								className="h-9 text-[14px] font-medium text-muted-foreground hover:text-foreground">
								<Link href={item.href} className="flex items-center gap-1.5">
									{item.label}
									{item.badge && (
										<Badge className="rounded px-1.5 py-0 text-[11px] font-semibold bg-primary/10 text-primary border-0">
											{item.badge}
										</Badge>
									)}
								</Link>
							</Button>
						))}
					</nav>
				</div>

				{/* Right: Sign in (secondary) + Get started (primary) — design.json buttons */}
				<div className="flex shrink-0 items-center gap-3">
					{isSignedIn ? (
						<Button variant="secondary" size="sm" asChild>
							<Link href="/dashboard">
								<UserIcon className="size-4" />
								Dashboard
							</Link>
						</Button>
					) : (
						<Button
							className="w-full"
							disabled={isSigningIn}
							onClick={() =>
								signIn({
									callbackURL: "/dashboard",
									newUserCallbackURL: "/onboarding",
									provider: "google",
								})
							}>
							{isSigningIn ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								"Sign in with Google"
							)}
						</Button>
					)}
				</div>
			</div>
		</header>
	);
}
