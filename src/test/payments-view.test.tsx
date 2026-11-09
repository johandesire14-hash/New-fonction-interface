import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { PaymentsView } from "@/mansa/components/dashboard/PaymentsView";
import { AuthProvider } from "@/mansa/context/AuthContext";
import { DIAL_CODE_CONFIGS } from "@/mansa/utils/phoneValidationRules";

const mobileMoneyMethods = [
  { label: "Wave", operatorId: "wave", buttonName: /Wave/ },
  { label: "Orange Money", operatorId: "orange", buttonName: /Orange Money/ },
  { label: "MTN Mobile Money", operatorId: "mtn", buttonName: /MTN Mobile Money/ },
  { label: "Moov Money", operatorId: "moov", buttonName: /Moov Money/ },
];

describe("PaymentsView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it.each(mobileMoneyMethods)(
    "opens a one-time $label withdrawal form with only countries supporting its operator",
    ({ operatorId, buttonName }) => {
      render(
        <AuthProvider>
          <PaymentsView />
        </AuthProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: /Demander un retrait/i }));

      expect(screen.getByRole("heading", { name: "Méthodes de retrait" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Wave/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Orange Money/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /MTN Mobile Money/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Moov Money/ })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: buttonName }));

      const confirmButton = screen.getByRole("button", { name: "Confirmer" });
      const form = confirmButton.closest("form");
      expect(form).not.toBeNull();
      expect(form?.querySelectorAll("input")).toHaveLength(2);
      expect(form?.querySelectorAll("select")).toHaveLength(1);
      expect(form?.querySelectorAll('button[type="submit"]')).toHaveLength(1);
      expect(screen.getByText("Montant du retrait")).toBeInTheDocument();
      expect(screen.getByText("Indicatif téléphonique")).toBeInTheDocument();
      expect(screen.getByText("Numéro de téléphone")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Numéro sans indicatif")).toBeInTheDocument();

      const expectedCountries = Object.values(DIAL_CODE_CONFIGS).filter((country) =>
        country.operators.some((operator) => operator.id === operatorId),
      );
      const options = Array.from(form!.querySelectorAll("select option")).map(
        (option) => (option as HTMLOptionElement).value,
      );
      expect(options).toEqual(expectedCountries.map((country) => country.countryName));
    },
  );
});
