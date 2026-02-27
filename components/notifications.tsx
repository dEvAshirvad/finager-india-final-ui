import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, Settings, XIcon } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

function NotificationSheet() {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon">
					<Bell />
				</Button>
			</SheetTrigger>
			<SheetContent showCloseButton={false} className="gap-0">
				<SheetHeader className="bg-accent border-b py-5 px-6 flex flex-row items-center justify-between">
					<SheetTitle>Notifications</SheetTitle>
					<div className="flex items-center gap-2">
						<Button variant={"link"}>
							<Settings />
							Manage
						</Button>
						<SheetClose className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
							<XIcon className="size-4" />
							<span className="sr-only">Close</span>
						</SheetClose>
					</div>
				</SheetHeader>
				<div className="px-6 bg-accent border-b flex gap-4 items-center">
					<Select defaultValue="all">
						<SelectTrigger className="border-none shadow-none p-0 data-[size=default]:h-10 w-fit">
							<SelectValue placeholder="Select a notification" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="unread">Unread</SelectItem>
							<SelectItem value="read">Read</SelectItem>
						</SelectContent>
					</Select>
					<div className="flex items-center gap-2">
						<p className="text-sm text-muted-foreground">Mentions</p>
						{/* <Badge>23</Badge> */}
					</div>
				</div>
				<div className="h-64 flex items-center justify-center">
					<p className="text-sm text-muted-foreground">No notifications</p>
				</div>
			</SheetContent>
		</Sheet>
	);
}

export default NotificationSheet;
