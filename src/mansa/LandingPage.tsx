import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./context/AuthContext";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { BuildNextCarousel } from "./components/BuildNextCarousel";
import { ReviewsSection } from "./components/ReviewsSection";
import { FaqSection } from "./components/FaqSection";
import { Footer } from "./components/Footer";
import { UiArcShowcase } from "./components/UiArcShowcase";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const openLogin = () => {
    if (user) {
      void navigate({ to: "/app" });
    } else {
      void navigate({ to: "/login", search: { mode: "login" } });
    }
  };

  const openStudio = (category?: string) => {
    if (user) {
      void navigate({
        to: "/app",
        state: (previous) => ({ ...previous, openStudio: true, category }),
      });
    } else {
      void navigate({ to: "/login", search: { mode: "signup" } });
    }
  };

  return (
    <div
      id="home"
      className="afhub-home min-h-screen bg-store-background text-store-foreground flex flex-col font-sans"
    >
      <Header
        onOpenMarketplace={() =>
          document.getElementById("marketplace")?.scrollIntoView({ behavior: "smooth" })
        }
        onOpenDocs={() => window.open("/documentation", "_blank")}
        onOpenLogin={openLogin}
      />
      <main className="flex-1 flex flex-col w-full" aria-label="Accueil afhub">
        <HeroSection onOpenStudio={openStudio} lang="fr" />
        <UiArcShowcase onOpenStudio={() => openStudio()} />
        <BuildNextCarousel
          onSelectCategory={(category) => openStudio(category.categoryKey)}
          onOpenStudio={() => openStudio()}
          lang="fr"
        />
        <ReviewsSection />
        <FaqSection onOpenStudio={() => openStudio()} lang="fr" />
        <Footer onOpenStudio={() => openStudio()} lang="fr" />
      </main>
    </div>
  );
}
