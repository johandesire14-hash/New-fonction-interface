import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SupportInboxView } from "../mansa/components/dashboard/SupportInboxView";

const conversation = {
  id: "company-demo:member@example.test",
  companyId: "company-demo",
  memberName: "Membre Test",
  memberEmail: "member@example.test",
  messages: [
    {
      id: "message-1",
      sender: "creator" as const,
      text: "Bienvenue, comment pouvons-nous vous aider ?",
      time: "10:15",
    },
  ],
};

describe("SupportInboxView", () => {
  it.each(["creator", "member"] as const)(
    "affiche les contrôles communs dans le mode %s",
    (mode) => {
      const { container } = render(
        <SupportInboxView
          mode={mode}
          companyName="Entreprise Démo"
          conversations={[conversation]}
          selectedConversationId={conversation.id}
          onSelectConversation={vi.fn()}
          onSendMessage={vi.fn()}
          mobileConversationOpen
        />,
      );

      expect(container.firstElementChild).toHaveClass("h-[calc(100dvh-140px)]");
      expect(screen.getByRole("heading", { name: "Chats de support" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Rechercher…")).toBeInTheDocument();
      expect(screen.getByLabelText("Trier les conversations")).toBeInTheDocument();
      expect(screen.getByLabelText("Écrire un message")).toBeVisible();
      expect(screen.getByRole("button", { name: "Envoyer" })).toBeInTheDocument();
    },
  );

  it("envoie un message et déclenche le retour côté membre", () => {
    const onSendMessage = vi.fn();
    const onBack = vi.fn();
    const onSelectConversation = vi.fn();

    render(
      <SupportInboxView
        mode="member"
        companyName="Entreprise Démo"
        conversations={[conversation]}
        selectedConversationId={conversation.id}
        onSelectConversation={onSelectConversation}
        onSendMessage={onSendMessage}
        mobileConversationOpen={false}
        onBack={onBack}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Entreprise Démo/ }));
    expect(onSelectConversation).toHaveBeenCalledWith(conversation.id);
    fireEvent.change(screen.getByLabelText("Écrire un message"), {
      target: { value: "Bonjour, j’ai besoin d’aide." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(onSendMessage).toHaveBeenCalledWith(conversation, "Bonjour, j’ai besoin d’aide.");

    const backButton = screen.getByRole("button", { name: "Retour" });
    expect(backButton).not.toHaveClass("lg:hidden");
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalledOnce();
  });
});
