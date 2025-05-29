export const metadata = {
  title: "Home - Open PRO",
  description: "Page description",
};

import PageIllustration from "@/components/page-illustration";
import Hero from "@/components/hero-home";
import Workflows from "@/components/workflows";
import Features from "@/components/features";
import Testimonials from "@/components/testimonials";
import Cta from "@/components/cta";
import Footer from "@/components/ui/footer";

export default function Home() {
  return (
    <>
      {/* <PageIllustration /> */}
      {/* <Hero /> */}
      <Workflows />
      <Features />
      {/* <Testimonials /> */}
      <Cta />
       <Footer/>
    </>
  );
}
