import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Hero from "../components/sections/Hero";
import Features from "../components/sections/Features";
import HowItWorks from "../components/sections/HowItWorks";
import Testimonials from "../components/sections/Testimonials";
import PricingCTA from "../components/sections/PricingCTA";

export default function Landing() {
  return (
    <div className="min-h-dvh bg-ink-950">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <PricingCTA />
      </main>
      <Footer />
    </div>
  );
}
