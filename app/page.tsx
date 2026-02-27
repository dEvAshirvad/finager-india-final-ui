import { AppHeader } from "@/components/app-header";
import { LandingHero } from "@/components/landing-hero";
import { LandingFeatures } from "@/components/landing-features";
import { LandingHowItWorks } from "@/components/landing-how-it-works";
import { LandingStatsSection } from "@/components/landing-stats";
import { LandingFaq } from "@/components/landing-faq";
import { LandingFooter } from "@/components/landing-footer";

export default function Home() {
	return (
		<div className="min-h-screen bg-[#FFFFFF] font-sans">
			<AppHeader />
			<main>
				<LandingHero />
				<LandingFeatures />
				<LandingHowItWorks />
				<LandingStatsSection />
				<LandingFaq />
				<LandingFooter />
			</main>
		</div>
	);
}
