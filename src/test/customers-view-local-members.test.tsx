import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AuthProvider } from "../mansa/context/AuthContext";
import { CustomersView } from "../mansa/components/dashboard/CustomersView";
import { AssistanceView } from "../mansa/components/dashboard/AssistanceView";
import { getCustomerNote } from "../mansa/utils/customerManagementStorage";
import { getLocalSupportConversation } from "../mansa/utils/localCommunityStore";

beforeEach(() => {
  window.localStorage.clear();
});

describe("CustomersView local development memberships", () => {
  it("shows a free member saved under another local account", async () => {
    window.localStorage.setItem(
      "mansa_enterprise_subscriptions_member@example.test",
      JSON.stringify([
        {
          id: "sub-company-demo-member",
          companyId: "company-demo",
          companyName: "Entreprise de démonstration",
          productName: "Accès gratuit",
          priceDisplay: "Gratuit",
          status: "active",
          subscribedAt: new Date().toISOString(),
          includedApps: ["dashboard", "support"],
          telegramChannels: [],
          hasPaidOffer: false,
        },
      ]),
    );

    render(
      <AuthProvider>
        <CustomersView
          activeCompanyId="company-demo"
          activeCompanyName="Entreprise de démonstration"
        />
      </AuthProvider>,
    );

    expect(await screen.findByText("member@example.test")).toBeInTheDocument();
    expect(screen.getByText("Adhésion gratuite")).toBeInTheDocument();
    expect(screen.getAllByText("0 FCFA").length).toBeGreaterThan(0);
  });

  it("shows a persisted member support message in the creator assistance view", async () => {
    window.localStorage.setItem(
      "mansa_local_support_conversations_company-demo",
      JSON.stringify([
        {
          id: "company-demo:member@example.test",
          companyId: "company-demo",
          memberName: "Membre Test",
          memberEmail: "member@example.test",
          messages: [
            {
              id: "message-1",
              sender: "member",
              text: "Je n’arrive pas à ouvrir mon espace.",
              time: "10:30",
            },
          ],
        },
      ]),
    );
    const company = {
      id: "company-demo",
      ownerUid: "creator@example.test",
      name: "Entreprise de démonstration",
      description: "Communauté de test",
      acceptedPayments: [],
      primaryCurrency: "XOF",
      createdAt: new Date().toISOString(),
    };

    render(
      <AuthProvider>
        <AssistanceView activeCompany={company} companies={[company]} />
      </AuthProvider>,
    );

    expect(
      (await screen.findAllByText("Je n’arrive pas à ouvrir mon espace.")).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Membre Test").length).toBeGreaterThan(0);
  });

  it("opens the profile-style member sheet and saves a private note from the three-dot menu", async () => {
    window.localStorage.setItem(
      "mansa_enterprise_subscriptions_member@example.test",
      JSON.stringify([
        {
          id: "sub-company-demo-member",
          companyId: "company-demo",
          companyName: "Entreprise de démonstration",
          productName: "Accès gratuit",
          priceDisplay: "Gratuit",
          status: "active",
          subscribedAt: "2025-05-02T12:00:00.000Z",
          includedApps: ["dashboard", "support"],
          telegramChannels: [],
          hasPaidOffer: false,
        },
      ]),
    );

    render(
      <AuthProvider>
        <CustomersView
          activeCompanyId="company-demo"
          activeCompanyName="Entreprise de démonstration"
        />
      </AuthProvider>,
    );

    const memberEmail = await screen.findByText("member@example.test");
    fireEvent.click(memberEmail.closest("tr") as HTMLTableRowElement);
    expect(screen.getByText("Dépenses")).toBeInTheDocument();
    expect(screen.getByText("Rejoint")).toBeInTheDocument();
    expect(screen.getByText("Emplacement")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Message" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Payer" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Plus d’actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Ajouter une note" }));
    fireEvent.change(screen.getByPlaceholderText("Ajouter une information à retenir…"), {
      target: { value: "A préféré être contacté par e-mail." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(getCustomerNote("company-demo", "member@example.test")).toBe(
      "A préféré être contacté par e-mail.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Message" }));
    fireEvent.change(screen.getByPlaceholderText("Écrire un message…"), {
      target: { value: "Bonjour, voici la réponse à votre demande." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(
      getLocalSupportConversation("company-demo", "member@example.test")?.messages.at(-1)?.text,
    ).toBe("Bonjour, voici la réponse à votre demande.");
  });
});
