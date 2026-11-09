import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectedAppsView } from "@/mansa/components/dashboard/ConnectedAppsView";
import { FilesWorkspace } from "@/mansa/components/dashboard/FilesWorkspace";
import { CreatorCoursesWorkspace } from "@/mansa/components/UserDashboard";
import { saveDigitalAsset } from "@/mansa/utils/digitalAssetStorage";
import { getCreatorAppProductIds } from "@/mansa/utils/creatorAppRouting";

vi.mock("@/mansa/utils/digitalAssetStorage", () => ({
  saveDigitalAsset: vi.fn(),
}));

const products = [{ id: "offer-real-1", title: "Mon offre", priceDisplay: "Inclus" }];
const saveDigitalAssetMock = vi.mocked(saveDigitalAsset);

const openCatalogApp = (title: string) => {
  const heading = screen.getByRole("heading", { name: title });
  const card = heading.closest<HTMLElement>(".rounded-xl");
  if (!card) throw new Error(`Carte de l’application introuvable : ${title}`);
  fireEvent.click(within(card).getByRole("button"));
};

describe("navigation catalogue Apps Store vers les workspaces créateur", () => {
  beforeEach(() => {
    localStorage.clear();
    saveDigitalAssetMock.mockReset();
  });

  it("cible uniquement les offres qui contiennent l’application demandée", () => {
    const offers = [
      { id: "offer-course", title: "Premium", courseModules: [{ id: "module-1" }] },
      { id: "offer-file", title: "Guide", digitalFiles: [{ id: "file-1" }] },
    ];

    expect(getCreatorAppProductIds("courses", offers)).toEqual(["offer-course"]);
    expect(getCreatorAppProductIds("files", offers)).toEqual(["offer-file"]);
  });

  it("conserve l’offre de la prévisualisation et utilise les offres de l’entreprise si les apps sont configurées globalement", () => {
    const offers = [
      { id: "offer-1", title: "Pack A" },
      { id: "offer-2", title: "Pack B" },
    ];

    expect(getCreatorAppProductIds("files", offers, "offer-2")).toEqual(["offer-2"]);
    expect(getCreatorAppProductIds("courses", offers)).toEqual(["offer-1", "offer-2"]);
  });

  it("retire les commandes et badges pointés sans supprimer la carte Cours", () => {
    render(<ConnectedAppsView lang="fr" availableProducts={products} />);

    expect(screen.queryByRole("button", { name: /Gérer Telegram/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gérer Discord/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Officiel Mansa")).not.toBeInTheDocument();
    expect(screen.queryByText("Gestion des rôles")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Telegram" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Discord" })).toBeInTheDocument();

    const courseHeading = screen.getByRole("heading", { name: "Cours & Formations" });
    const courseCard = courseHeading.closest<HTMLElement>(".rounded-xl");
    expect(courseCard).not.toBeNull();
    const courseInstallButton = within(courseCard!).getByRole("button", {
      name: "+ Installer sur un business",
    });
    expect(courseInstallButton).toHaveClass("bg-[#0055ff]", "hover:bg-[#0047d6]");

    const filesHeading = screen.getByRole("heading", { name: "Fichiers & Téléchargements" });
    const filesCard = filesHeading.closest<HTMLElement>(".rounded-xl");
    expect(filesCard).not.toBeNull();
    const filesInstallButton = within(filesCard!).getByRole("button", {
      name: "+ Installer sur un business",
    });
    expect(filesInstallButton).toHaveClass("bg-[#0055ff]", "hover:bg-[#0047d6]");
  });

  it.each([
    { title: "Cours & Formations", callback: "onOpenCoursesWorkflow" },
    { title: "Fichiers & Téléchargements", callback: "onOpenFilesWorkflow" },
  ] as const)("transmet l'offre choisie au callback de $title", ({ title, callback }) => {
    const onOpenCoursesWorkflow = vi.fn();
    const onOpenFilesWorkflow = vi.fn();
    render(
      <ConnectedAppsView
        lang="fr"
        availableProducts={products}
        onOpenCoursesWorkflow={onOpenCoursesWorkflow}
        onOpenFilesWorkflow={onOpenFilesWorkflow}
      />,
    );

    openCatalogApp(title);
    fireEvent.click(screen.getByRole("button", { name: "Confirmer et continuer" }));

    if (callback === "onOpenCoursesWorkflow") {
      expect(onOpenCoursesWorkflow).toHaveBeenCalledWith(["offer-real-1"]);
      expect(onOpenFilesWorkflow).not.toHaveBeenCalled();
    } else {
      expect(onOpenFilesWorkflow).toHaveBeenCalledWith(["offer-real-1"]);
      expect(onOpenCoursesWorkflow).not.toHaveBeenCalled();
    }
    expect(screen.queryByRole("heading", { name: /Lier .* à un produit/ })).not.toBeInTheDocument();
  });

  it("ne fabrique pas d'offre ni d'identifiant de secours quand la liste fournie est vide", () => {
    const onOpenFilesWorkflow = vi.fn();
    render(
      <ConnectedAppsView
        lang="fr"
        availableProducts={[]}
        onOpenFilesWorkflow={onOpenFilesWorkflow}
      />,
    );

    openCatalogApp("Fichiers & Téléchargements");

    expect(screen.getByRole("status")).toHaveTextContent("Créez d’abord une offre");
    expect(screen.getByRole("button", { name: "Confirmer et continuer" })).toBeDisabled();
    expect(screen.queryByText("Pass VIP & Accès Membre")).not.toBeInTheDocument();
    expect(onOpenFilesWorkflow).not.toHaveBeenCalled();
  });

  it("revient du formulaire Fichiers au catalogue via le callback parent", () => {
    const onBack = vi.fn();
    render(
      <FilesWorkspace
        creatorId="creator-1"
        companyId="company-1"
        productIds={["offer-real-1"]}
        products={[{ id: "offer-real-1", title: "Mon offre" }]}
        onBack={onBack}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ajouter un fichier" }));
    expect(screen.getByRole("heading", { name: "Ajouter un fichier" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retour aux fichiers" }));
    fireEvent.click(screen.getByRole("button", { name: "Retour aux applications" }));

    expect(onBack).toHaveBeenCalledOnce();
  });

  it("réaffiche les fichiers persistés quand le créateur rouvre l’application", async () => {
    localStorage.setItem(
      "mansa_creator_apps_company-1",
      JSON.stringify([
        {
          appId: "files",
          productIds: ["offer-real-1"],
          files: [
            {
              id: "file-existing-1",
              name: "Guide déjà enregistré.pdf",
              size: "12 KB",
              type: "application/pdf",
              productIds: ["offer-real-1"],
              storageKey: "asset-existing-1",
              updatedAt: "2026-10-25T00:00:00.000Z",
            },
          ],
        },
      ]),
    );

    render(
      <FilesWorkspace
        creatorId="creator-1"
        companyId="company-1"
        productIds={["offer-real-1"]}
        products={[]}
        onBack={vi.fn()}
      />,
    );

    expect(await screen.findByText("Guide déjà enregistré.pdf")).toBeInTheDocument();
  });

  it("affiche deux écrans de gestion distincts pour Cours et Fichiers", () => {
    const filesScreen = render(
      <FilesWorkspace
        creatorId="creator-1"
        companyId="company-1"
        productIds={["offer-real-1"]}
        products={[]}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Fichiers du produit" })).toBeInTheDocument();
    filesScreen.unmount();

    render(
      <CreatorCoursesWorkspace
        creatorId="creator-1"
        companyId="company-1"
        productIds={["offer-real-1"]}
        products={[]}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Cours & Formations" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ajouter un cours/ }));
    expect(screen.getByRole("heading", { name: "Créer un cours" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nom du cours")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.queryByLabelText("Titre du chapitre")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nom du cours"), {
      target: { value: "Cours de test" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Description du cours" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Valider et continuer" }));

    expect(screen.getByLabelText("Titre du chapitre")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nom du cours")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retour aux informations du cours/ }));
    expect(screen.getByLabelText("Nom du cours")).toHaveValue("Cours de test");
    expect(screen.getByLabelText("Description")).toHaveValue("Description du cours");
  });

  it("montre le chargement puis l’erreur et réactive l’action après échec de téléversement", async () => {
    let rejectUpload: ((reason: Error) => void) | undefined;
    saveDigitalAssetMock.mockReturnValue(
      new Promise((_, reject) => {
        rejectUpload = reject;
      }),
    );
    const { container } = render(
      <FilesWorkspace
        creatorId="creator-1"
        companyId="company-1"
        productIds={["offer-real-1"]}
        products={[{ id: "offer-real-1", title: "Mon offre" }]}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ajouter un fichier" }));
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: { files: [new File(["contenu"], "guide.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter le fichier" }));

    expect(screen.getByRole("button", { name: "Enregistrement…" })).toBeDisabled();
    rejectUpload?.(new Error("stockage indisponible"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Le fichier n’a pas pu être enregistré. Réessayez.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("stockage indisponible");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ajouter le fichier" })).toBeEnabled(),
    );
  });
});
