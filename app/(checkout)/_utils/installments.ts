// app/(checkout)/_utils/installments.ts
interface InstallmentOption {
  number: number; // número de parcelas
  amount: number; // valor da parcela
  total: number; // valor total com juros
  interestRate: number; // taxa de juros aplicada (1.67%)
}

export function calculateInstallments(basePrice: number): InstallmentOption[] {
  const INTEREST_RATE = 1.67; // 1.67% ao mês
  const MAX_INSTALLMENTS = 12;

  return Array.from({ length: MAX_INSTALLMENTS }, (_, i) => {
    const installmentNumber = i + 1;
    let total = basePrice;
    let installmentAmount = basePrice;

    // Se não for à vista, aplica juros
    if (installmentNumber > 1) {
      // Cálculo de juros compostos: M = P(1 + i)^n
      // Onde: M = Montante, P = Principal, i = taxa de juros, n = número de períodos
      const interest = INTEREST_RATE / 100;
      total = basePrice * Math.pow(1 + interest, installmentNumber - 1);
      installmentAmount = total / installmentNumber;
    }

    return {
      number: installmentNumber,
      amount: Math.ceil(installmentAmount * 100) / 100, // Arredonda para 2 casas decimais
      total: Math.ceil(total * 100) / 100,
      interestRate: installmentNumber === 1 ? 0 : INTEREST_RATE,
    };
  });
}
