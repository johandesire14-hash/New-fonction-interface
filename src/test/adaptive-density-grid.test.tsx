import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdaptiveDensityGrid } from "@/mansa/components/common/AdaptiveDensityGrid";

describe("AdaptiveDensityGrid", () => {
  it("changes the grid density and exposes the active option accessibly", () => {
    render(
      <AdaptiveDensityGrid count={3} lang="fr">
        <article>Offre test</article>
      </AdaptiveDensityGrid>,
    );

    const grid = screen
      .getByRole("region", { name: "Grille des offres" })
      .querySelector(".adaptive-density__grid");
    const balancedButton = screen.getByRole("button", { name: "Équilibrée" });
    const compactButton = screen.getByRole("button", { name: "Compacte" });

    expect(grid).toHaveAttribute("data-density", "balanced");
    expect(balancedButton).toHaveAttribute("aria-pressed", "true");
    expect(compactButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(compactButton);

    expect(grid).toHaveAttribute("data-density", "compact");
    expect(compactButton).toHaveAttribute("aria-pressed", "true");
    expect(balancedButton).toHaveAttribute("aria-pressed", "false");
  });
});
