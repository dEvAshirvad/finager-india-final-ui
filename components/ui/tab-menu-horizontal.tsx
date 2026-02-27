"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { useTabObserver } from "@/hooks/use-tab-observer";
import { cn } from "@/lib/utils";

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
	return (value: T | null) => {
		refs.forEach((ref) => {
			if (typeof ref === "function") ref(value);
			else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
		});
	};
}

const TabMenuHorizontalContent = TabsPrimitive.Content;
TabMenuHorizontalContent.displayName = "TabMenuHorizontalContent";

const TabMenuHorizontalRoot = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.Root>,
	Omit<React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>, "orientation">
>(({ className, ...rest }, forwardedRef) => {
	return (
		<TabsPrimitive.Root
			ref={forwardedRef}
			orientation="horizontal"
			className={cn("w-full", className)}
			{...rest}
		/>
	);
});
TabMenuHorizontalRoot.displayName = "TabMenuHorizontalRoot";

const TabMenuHorizontalList = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
		wrapperClassName?: string;
	}
>(({ children, className, wrapperClassName, ...rest }, forwardedRef) => {
	const [lineStyle, setLineStyle] = React.useState({ width: 0, left: 0 });
	const listWrapperRef = React.useRef<HTMLDivElement>(null);

	const { mounted, listRef } = useTabObserver({
		onActiveTabChange: (_, activeTab) => {
			const { offsetWidth: width, offsetLeft: left } = activeTab;
			setLineStyle({ width, left });

			const listWrapper = listWrapperRef.current;
			if (listWrapper) {
				const containerWidth = listWrapper.clientWidth;
				const scrollPosition = left - containerWidth / 2 + width / 2;

				listWrapper.scrollTo({
					left: scrollPosition,
					behavior: "smooth",
				});
			}
		},
	});

	return (
		<div
			ref={listWrapperRef}
			className={cn(
				"relative grid overflow-x-auto overflow-y-hidden overscroll-contain",
				wrapperClassName,
			)}>
			<TabsPrimitive.List
				ref={mergeRefs(forwardedRef, listRef)}
				className={cn(
					"group/tab-list relative flex h-12 items-center gap-6 whitespace-nowrap",
					className,
				)}
				{...rest}>
				{children}

				{/* Sliding indicator line */}
				<div
					className={cn(
						"absolute -bottom-px left-0 h-0.5 bg-primary opacity-0 transition-all duration-300 group-has-data-[state=active]/tab-list:opacity-100",
						{
							hidden: !mounted,
						},
					)}
					style={{
						transform: `translate3d(${lineStyle.left}px, 0, 0)`,
						width: `${lineStyle.width}px`,
						transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
					}}
					aria-hidden="true"
				/>
			</TabsPrimitive.List>
		</div>
	);
});
TabMenuHorizontalList.displayName = "TabMenuHorizontalList";

const TabMenuHorizontalTrigger = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...rest }, forwardedRef) => {
	return (
		<TabsPrimitive.Trigger
			ref={forwardedRef}
			className={cn(
				"group/tab-item flex h-12 items-center justify-center gap-1.5 py-3.5 text-sm font-medium text-muted-foreground outline-none transition duration-200 ease-out focus:outline-none data-[state=active]:font-semibold data-[state=active]:text-primary",
				className,
			)}
			{...rest}
		/>
	);
});
TabMenuHorizontalTrigger.displayName = "TabMenuHorizontalTrigger";

function TabMenuHorizontalIcon({
	className,
	as: Component = "div",
	...rest
}: React.ComponentPropsWithoutRef<"div"> & { as?: React.ElementType }) {
	return (
		<Component
			className={cn(
				"size-5 text-muted-foreground transition duration-200 ease-out group-data-[state=active]/tab-item:text-primary",
				className,
			)}
			{...rest}
		/>
	);
}
TabMenuHorizontalIcon.displayName = "TabMenuHorizontalIcon";

function TabMenuHorizontalArrowIcon({
	className,
	as: Component = "div",
	...rest
}: React.ComponentPropsWithoutRef<"div"> & { as?: React.ElementType }) {
	return (
		<Component
			className={cn("size-5 text-muted-foreground", className)}
			{...rest}
		/>
	);
}
TabMenuHorizontalArrowIcon.displayName = "TabMenuHorizontalArrowIcon";

export {
	TabMenuHorizontalRoot as Root,
	TabMenuHorizontalList as List,
	TabMenuHorizontalTrigger as Trigger,
	TabMenuHorizontalIcon as Icon,
	TabMenuHorizontalArrowIcon as ArrowIcon,
	TabMenuHorizontalContent as Content,
};
