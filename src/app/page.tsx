import type { Metadata } from "next";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { LeadForm } from "@/components/landing/LeadForm";
import { ModuleGrid } from "@/components/landing/ModuleGrid";
import { Nav } from "@/components/landing/Nav";
import { RolePreview } from "@/components/landing/RolePreview";
import { Workflow } from "@/components/landing/Workflow";
import { EvolutionDevice } from "@/components/landing/EvolutionDevice";

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
    <main className="showup-landing min-h-screen overflow-hidden bg-[#f7f9f8] font-sans text-[#101828]">
      <LandingMotion />
      <div className="showup-noise" aria-hidden />
      <Nav />
      <Hero />
      <EvolutionDevice />
      <ModuleGrid />
      <RolePreview />
      <Workflow />
      <LeadForm />
      <Footer />
    </main>
  );
}
