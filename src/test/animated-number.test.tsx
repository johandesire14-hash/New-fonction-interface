import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { numberFlowMock } = vi.hoisted(() => ({ numberFlowMock: vi.fn() }));

vi.mock("@number-flow/react", () => ({
  default: (props: Record<string, unknown>) => {
    numberFlowMock(props);
    return null;
  },
}));

import { AnimatedNumber } from "@/mansa/components/common/AnimatedNumber";

describe("AnimatedNumber", () => {
  beforeEach(() => numberFlowMock.mockClear());

  it("garde la même valeur sur un rerendu identique et transmet une valeur modifiée", () => {
    const { rerender } = render(<AnimatedNumber value={10} currency="XOF" />);

    expect(numberFlowMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ value: 6050, suffix: " FCFA", animated: false }),
    );

    rerender(<AnimatedNumber value={10} currency="XOF" />);
    expect(numberFlowMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ value: 6050, suffix: " FCFA", animated: false }),
    );

    rerender(<AnimatedNumber value={10} currency="XOF" locale="en-US" />);
    expect(numberFlowMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ value: 6050, suffix: " FCFA", animated: false }),
    );

    rerender(<AnimatedNumber value={20} currency="XOF" />);
    expect(numberFlowMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ value: 12100, suffix: " FCFA", animated: true }),
    );
  });

  it("conserve le format compact du revenu mensuel", () => {
    render(<AnimatedNumber value={2_000} currency="XOF" compact />);

    expect(numberFlowMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ value: 1.21, suffix: "M", animated: false }),
    );
  });
});
