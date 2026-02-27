"use client";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Mail, Phone, UserCog2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGetSession, useSignOut } from "@/lib/queries/auth";

function ProfileSheet() {
	const router = useRouter();
	const { data: sessionData, isLoading: isLoadingSession } = useGetSession();
	const { mutate: signOut, isPending: isSigningOut } = useSignOut();

	const session = sessionData?.session;
	const user = sessionData?.user;
	const handleSignOut = () => {
		signOut(undefined, {
			onSuccess: () => {
				router.push("/auth/signin");
			},
		});
	};

	if (isLoadingSession) {
		return (
			<Sheet>
				<SheetTrigger asChild>
					<Avatar className="size-8">
						<AvatarFallback>
							<Loader2 className="h-4 w-4 animate-spin" />
						</AvatarFallback>
					</Avatar>
				</SheetTrigger>
			</Sheet>
		);
	}

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Avatar className="size-8">
					<AvatarImage src={user?.image || ""} />
					<AvatarFallback>
						{user?.name?.charAt(0)?.toUpperCase() || "U"}
					</AvatarFallback>
				</Avatar>
			</SheetTrigger>
			<SheetContent className="gap-0 divide-y">
				<SheetHeader className="bg-accent py-5 px-6 flex flex-row items-start justify-between">
					<div className="flex items-center gap-2">
						<Avatar className="size-12 rounded-md">
							<AvatarImage src={user?.image || undefined} />
							<AvatarFallback>
								{user?.name?.charAt(0)?.toUpperCase() || "U"}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col gap-0">
							<SheetTitle className="font-semibold text-base">
								{user?.name || "User"}
							</SheetTitle>
							<p className="text-xs text-muted-foreground">
								{user?.email || "No email"}
							</p>
						</div>
					</div>
				</SheetHeader>
				<div className="px-6 py-3 bg-accent">
					<p className="text-xs line-clamp-1">
						User ID: {user?.id ? user.id.slice(0, 10) + "..." : "N/A"} •
						Organization ID:{" "}
						{session?.activeOrganizationId
							? session.activeOrganizationId.slice(0, 10) + "..."
							: "No organization"}
					</p>
				</div>
				<div className="px-6 py-3 bg-accent flex justify-between items-center">
					<Link href="/account">
						<Button variant="link" className="p-0 h-fit text-xs">
							My Account
						</Button>
					</Link>
					<Button
						variant="link"
						className="text-red-500 p-0 h-fit text-xs"
						disabled={isSigningOut}
						onClick={handleSignOut}>
						{isSigningOut ? (
							<>
								<Loader2 className="mr-1 h-3 w-3 animate-spin" />
								Logging out...
							</>
						) : (
							"Logout"
						)}
					</Button>
				</div>
				<div className="p-6">
					<h1 className="font-semibold text-xl">Need Assistance?</h1>
					<div className="mt-5 flex flex-col gap-4 items-start">
						<Button
							variant="link"
							className="has-[>svg]:px-0 p-0 h-fit text-foreground">
							<Mail />
							Email Support
						</Button>
						<Button
							variant="link"
							className="has-[>svg]:px-0 p-0 h-fit text-foreground">
							<Phone />
							Phone Support
						</Button>
						<Button
							variant="link"
							className="has-[>svg]:px-0 p-0 h-fit text-foreground">
							<UserCog2 />
							Find Accountant
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}

export default ProfileSheet;
