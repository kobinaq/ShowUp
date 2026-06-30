import type { Metadata } from "next";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { LeadForm } from "@/components/landing/LeadForm";
import { ModuleGrid } from "@/components/landing/ModuleGrid";
import { Nav } from "@/components/landing/Nav";
import { Pillars } from "@/components/landing/Pillars";
import { StatsStrip } from "@/components/landing/StatsStrip";

export const metadata: Metadata = {
  title: "ShowUp | University Quality Assurance Platform",
  description: "ShowUp formalizes class-rep lecturer attendance reporting into protected, role-scoped quality assurance analytics for universities.",
  openGraph: {
    title: "ShowUp | University Quality Assurance Platform",
    description: "Measure lecturer attendance, punctuality, topic coverage, and QA risks from one role-scoped dashboard.",
    url: "https://show-up-six.vercel.app/",
    siteName: "ShowUp",
    type: "website"
  }
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F4F6F9] font-sans">
      <Nav />
      <Hero />
      <Pillars />
      <ModuleGrid />
      <StatsStrip />
      <LeadForm />
      <Footer />
    </main>
  );
}
