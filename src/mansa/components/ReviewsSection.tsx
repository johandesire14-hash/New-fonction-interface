import React, { useEffect, useState } from "react";
import { MessageSquare, Star } from "lucide-react";

interface Review {
  id: string;
  authorName: string;
  companyName?: string;
  text: string;
  rating: number;
  createdAt?: string;
}

const REVIEWS_STORAGE_KEY = "mansa_platform_reviews";

function loadReviews(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(REVIEWS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((review) => review?.text && review?.authorName) : [];
  } catch {
    return [];
  }
}

export const ReviewsSection: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>(loadReviews);

  useEffect(() => {
    const refresh = () => setReviews(loadReviews());
    window.addEventListener("storage", refresh);
    window.addEventListener("mansa_reviews_updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("mansa_reviews_updated", refresh);
    };
  }, []);

  return (
    <section id="avis" className="w-full border-t border-black/10 bg-[#f5f5f3] py-16">
      <div className="mx-auto max-w-[1140px] px-6 sm:px-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#007a43]">Avis</p>
            <h2 className="text-3xl font-black tracking-tight text-[#171717] sm:text-4xl">Ce que pensent les utilisateurs.</h2>
          </div>
          <MessageSquare className="hidden size-8 text-[#00D26A] sm:block" aria-hidden="true" />
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white px-6 py-14 text-center">
            <p className="text-sm font-semibold text-[#171717]">Aucun avis pour le moment.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-black/10 bg-white p-5">
                <div className="mb-4 flex items-center gap-1" aria-label={`${review.rating} étoiles`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} className={`size-4 ${index < review.rating ? "fill-amber-400 text-amber-400" : "text-black/15"}`} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-[#444]">{review.text}</p>
                <footer className="mt-5 border-t border-black/10 pt-4 text-xs text-[#686868]">
                  <strong className="text-[#171717]">{review.authorName}</strong>
                  {review.companyName ? ` · ${review.companyName}` : ""}
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
