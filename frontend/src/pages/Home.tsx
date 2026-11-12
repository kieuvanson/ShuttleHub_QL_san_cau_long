import { Hero } from '../components/Hero';
import { FeaturedCourts } from '../components/FeaturedCourts';
import { PricingSection } from '../components/PricingSection';
import { CitiesSection } from '../components/CitiesSection';
import { FaqSection } from '../components/FaqSection';
import './Home.css';

export function Home() {
  return (
    <>
      <Hero />
      <FeaturedCourts />
      <PricingSection />
      <CitiesSection />
      <FaqSection />
    </>
  );
}
