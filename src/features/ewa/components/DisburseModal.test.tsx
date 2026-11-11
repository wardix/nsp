import { expect, test, describe, afterEach, mock } from "bun:test";
import { render, cleanup, screen, fireEvent, act } from "@testing-library/react";
import { DisburseModal } from "./DisburseModal";
import type { EWARequest, PaymentSourceAccount } from "../types";

describe("DisburseModal Component (#324)", () => {
  afterEach(() => {
    cleanup();
    document.querySelectorAll('[data-astryx-toast-fallback]').forEach((el) => el.remove());
  });

  const dummyRequest: EWARequest = {
    id: "req-disburse-1",
    employeeId: "emp-101",
    employeeName: "Dewi Lestari",
    employeeNip: "NIP-9988",
    isMember: true,
    periodMonth: "2026-11",
    salaryBasis: 6000000,
    maxLimit: 3000000,
    amountRequested: 750000,
    feePercentage: 2.5,
    feeAmount: 18750,
    disbursedAmount: 750000,
    totalPayrollDeduction: 768750,
    destinationBank: "BCA",
    destinationAccount: "5544332211",
    destinationName: "Dewi Lestari",
    status: "PENDING",
    createdAt: "2026-11-05T08:00:00Z",
  };

  const dummyPaymentSources: PaymentSourceAccount[] = [
    {
      id: "acc-1",
      code: "11101",
      name: "Kas Kecil Operasional",
      type: "asset",
    },
  ];

  test("does not render when isOpen is false", () => {
    render(
      <DisburseModal
        isOpen={false}
        onClose={() => {}}
        request={dummyRequest}
        paymentSources={dummyPaymentSources}
        isDemoMode={false}
        onSuccess={() => {}}
        onError={() => {}}
      />
    );

    expect(screen.queryByText("Konfirmasi Pencairan Dana EWA")).toBeNull();
  });

  test("renders modal with copyable nominal dicairkan and copies plain digits", async () => {
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

    const onClose = mock(() => {});
    const onSuccess = mock(() => {});
    const onError = mock(() => {});

    render(
      <DisburseModal
        isOpen={true}
        onClose={onClose}
        request={dummyRequest}
        paymentSources={dummyPaymentSources}
        isDemoMode={false}
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    expect(screen.getByText("Konfirmasi Pencairan Dana EWA")).toBeDefined();
    expect(screen.getByText("Nominal Dicairkan:")).toBeDefined();

    // Verify CopyableAmount button exists
    const copyAmountBtn = screen.getByLabelText("Salin nominal dicairkan");
    expect(copyAmountBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(copyAmountBtn);
    });

    // Plain digits must be copied
    expect(copiedText).toBe("750000");
  });
});
