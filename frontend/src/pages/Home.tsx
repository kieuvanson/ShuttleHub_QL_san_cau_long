import { Hero } from '../components/Hero';
import { FeaturedCourts } from '../components/FeaturedCourts';
import { PricingSection } from '../components/PricingSection';
import { CitiesSection } from '../components/CitiesSection';
import { FaqSection } from '../components/FaqSection';
import { Feed } from '../components/feed/Feed';
import './Home.css';

export function Home() {
  return (
    <>
      {/* Feed cộng đồng nằm trên cùng — phần landing cũ giữ bên dưới để
          các anchor (#bang-gia, #faq) từ header vẫn hoạt động. */}
      <div className="home-feed">
        <Feed />
      </div>
      <Hero />
      <FeaturedCourts />
      <PricingSection />
      <CitiesSection />
      <FaqSection />
    </>
  );
}
