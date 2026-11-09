import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompanySocialIcons } from "../mansa/components/dashboard/CompanySocialIcons";

describe("CompanySocialIcons", () => {
  it("affiche des pastilles cliquables uniquement pour les réseaux renseignés", () => {
    render(
      <CompanySocialIcons
        socialLinks={{
          tiktok: "https://www.tiktok.com/@atelier",
          instagram: "https://www.instagram.com/atelier",
          facebook: "https://www.facebook.com/atelier",
          twitter: "https://x.com/atelier",
          website: "https://atelier.example",
          youtube: "https://www.youtube.com/@atelier",
          linkedin: "https://www.linkedin.com/company/atelier",
        }}
      />,
    );

    const labels = [
      "TikTok",
      "Instagram",
      "Facebook",
      "X / Twitter",
      "Site web",
      "YouTube",
      "LinkedIn",
    ];
    for (const label of labels) {
      expect(screen.getByRole("link", { name: label })).toBeTruthy();
    }
    expect(screen.getAllByRole("link")).toHaveLength(labels.length);
    expect(screen.getByRole("link", { name: "X / Twitter" }).getAttribute("href")).toBe(
      "https://x.com/atelier",
    );
    expect(screen.getByRole("link", { name: "Site web" }).getAttribute("target")).toBe("_blank");
  });

  it("ignore les liens vides et ne rend rien si aucun réseau n’est renseigné", () => {
    const { rerender, container } = render(<CompanySocialIcons socialLinks={{}} />);
    expect(container.firstChild).toBeNull();

    rerender(<CompanySocialIcons socialLinks={{ instagram: "  ", website: "" }} />);
    expect(container.firstChild).toBeNull();
  });
});
