import HomeDestinations from '@/components/home/HomeDestinations'
import HomeHero from '@/components/home/HomeHero'
import HomeLocationGallery from '@/components/home/HomeLocationGallery'
import HomeNavbar from '@/components/home/HomeNavbar'
import HomeVideoGallery from '@/components/home/HomeVideoGallery'
import { HERO_BG_IMAGE, HERO_BG_IMAGE_SRCSET } from '@/constants/homeData'
import { useAuthUser } from '@/hooks/useAuthUser'
import './HomePage.css'

function HomePage() {
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()

  return (
    <div className="home-page">
      <section className="home-hero">
        <img
          className="home-hero__bg"
          src={HERO_BG_IMAGE}
          srcSet={HERO_BG_IMAGE_SRCSET}
          sizes="100vw"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
        />
        <div className="home-hero__overlay" aria-hidden="true" />

        <div className="home-container home-hero__inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
          />
          <HomeHero />
        </div>
      </section>

      <HomeDestinations />
      <HomeLocationGallery />
      <HomeVideoGallery />
    </div>
  )
}

export default HomePage
