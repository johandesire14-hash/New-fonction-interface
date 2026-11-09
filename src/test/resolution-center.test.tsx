import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { addDocMock, collectionMock, getDocsMock, queryMock, whereMock } = vi.hoisted(() => ({
  addDocMock: vi.fn(),
  collectionMock: vi.fn(),
  getDocsMock: vi.fn(),
  queryMock: vi.fn(),
  whereMock: vi.fn(),
}));

vi.mock("@/mansa/services/firebase", () => ({
  db: { name: "test-db" },
  addDoc: addDocMock,
  collection: collectionMock,
  getDocs: getDocsMock,
  query: queryMock,
  where: whereMock,
}));

import { ResolutionCenterPanel } from "@/mansa/components/common/ResolutionCenterPanel";

describe("ResolutionCenterPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    addDocMock.mockReset().mockResolvedValue({ id: "firestore-resolution-1" });
    collectionMock.mockReset().mockImplementation((_db, name) => ({ name }));
    getDocsMock.mockReset().mockResolvedValue({ forEach: vi.fn() });
    queryMock.mockReset().mockImplementation((...args) => args);
    whereMock.mockReset().mockImplementation((...args) => args);
  });

  it("persists the reported transaction context and confirms only after Firestore accepts it", async () => {
    render(
      <ResolutionCenterPanel
        userId="customer-42"
        customerName="Aïssata Diop"
        customerEmail="aissata@example.com"
      />,
    );

    fireEvent.change(screen.getByLabelText("Sujet du dossier"), {
      target: { value: "Paiement débité, accès absent" },
    });
    fireEvent.change(screen.getByLabelText("Description du problème"), {
      target: { value: "Le paiement semble confirmé mais je ne vois pas la formation." },
    });
    fireEvent.click(screen.getByText("Ajouter les références utiles (facultatif)"));
    fireEvent.change(screen.getByLabelText("Référence (transaction, reçu ou commande)"), {
      target: { value: "WAVE-REF-890" },
    });
    fireEvent.change(screen.getByLabelText("Prestataire de paiement"), {
      target: { value: "Wave" },
    });
    fireEvent.change(screen.getByLabelText("Montant indiqué"), { target: { value: "25000" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le dossier" }));

    await screen.findByText(/transmis à l’équipe de support/);

    expect(addDocMock).toHaveBeenCalledWith(
      { name: "resolutionRequests" },
      expect.objectContaining({
        userId: "customer-42",
        customerName: "Aïssata Diop",
        customerEmail: "aissata@example.com",
        transactionId: "WAVE-REF-890",
        providerReference: "",
        receiptId: "",
        paymentProvider: "Wave",
        amount: "25000",
        currency: "XOF",
        reportedPaymentStatus: "unknown",
        paymentDate: "",
        paymentInformationSource: "user_reported",
      }),
    );
    expect(screen.getByText("Référence communiquée")).toBeInTheDocument();
    expect(screen.getByText("WAVE-REF-890")).toBeInTheDocument();
    expect(screen.getByText(/ne confirment pas à eux seuls/)).toBeInTheDocument();

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem("mansa_resolution_customer-42") || "[]");
      expect(saved[0]).toEqual(expect.objectContaining({ transactionId: "WAVE-REF-890" }));
    });
  });

  it("does not display a success message when the Firestore write fails", async () => {
    addDocMock.mockRejectedValueOnce(new Error("permission denied"));

    render(<ResolutionCenterPanel userId="customer-42" />);
    expect(
      screen.getByText("Ajouter les références utiles (facultatif)").closest("details"),
    ).not.toHaveAttribute("open");
    fireEvent.change(screen.getByLabelText("Sujet du dossier"), {
      target: { value: "Paiement en attente" },
    });
    fireEvent.change(screen.getByLabelText("Description du problème"), {
      target: { value: "La transaction n’apparaît pas." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le dossier" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/n’a pas pu être transmise/);
    expect(screen.queryByText(/transmis à l’équipe de support/)).not.toBeInTheDocument();
    expect(localStorage.getItem("mansa_resolution_customer-42")).toBeNull();
  });
});
