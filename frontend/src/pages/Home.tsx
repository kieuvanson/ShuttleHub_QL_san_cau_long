import { Hero } from '../components/Hero';
import { SearchBar } from '../components/SearchBar';
import { FeaturedCourts } from '../components/FeaturedCourts';
import { CitiesSection } from '../components/CitiesSection';
import { FaqSection } from '../components/FaqSection';
import './Home.css';

export function Home() {
  return (
    <>
      <Hero />
      <SearchBar />
      <FeaturedCourts />
      <CitiesSection />
      <FaqSection />
    </>
  );
}
