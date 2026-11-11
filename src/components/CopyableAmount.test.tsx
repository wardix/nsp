import { expect, test, describe, afterEach } from "bun:test";
import { render, cleanup, screen, fireEvent, act } from "@testing-library/react";
import { CopyableAmount } from "./CopyableAmount";

describe("CopyableAmount Component (#324)", () => {
  afterEach(() => {
    cleanup();
    document.querySelectorAll('[data-astryx-toast-fallback]').forEach((el) => el.remove());
  });

  test("renders formatted currency text", () => {
    render(<CopyableAmount amount={750000} />);
    // formatRp(750000) -> "Rp 750.000"
    expect(screen.getByText(/750\.000/)).toBeDefined();
    expect(screen.getByLabelText("Salin nominal dicairkan")).toBeDefined();
  });

  test("copies plain digits (without Rp or separators) to clipboard when icon is clicked", async () => {
    let copiedText = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          copiedText = text;
        },
      },
      configurable: true,
      writable: true,
    });

    render(<CopyableAmount amount={1500000} />);

    const button = screen.getByLabelText("Salin nominal dicairkan");
    await act(async () => {
      fireEvent.click(button);
    });

    // Must be purely numeric digits without 'Rp', '.', or ','
    expect(copiedText).toBe("1500000");
  });

  test("copies plain digits to clipboard when text is clicked", async () => {
    let copiedText = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          copiedText = text;
        },
      },
      configurable: true,
      writable: true,
    });

    render(<CopyableAmount amount={250000.75} />);

    const textSpan = screen.getByTitle("Klik untuk salin nominal: 250001");
    await act(async () => {
      fireEvent.click(textSpan);
    });

    expect(copiedText).toBe("250001");
  });

  test("renders dash when amount is null or undefined", () => {
    render(<CopyableAmount amount={null} />);
    expect(screen.getByText("-")).toBeDefined();
    expect(screen.queryByLabelText("Salin nominal dicairkan")).toBeNull();
  });
});
