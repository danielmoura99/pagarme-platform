// app/(checkout)/_utils/installments.ts
interface InstallmentOption {
  number: number;
  amount: number;
  total: number;
  interestRate: number;
}

export function calculateInstallments(basePrice: number): InstallmentOption[] {
  const installmentOptions: InstallmentOption[] = [];
  const BASE_INTEREST = 1.67; // 1.67% base

  // Primeira opção - sem juros
  installmentOptions.push({
    number: 1,
    amount: basePrice,
    total: basePrice,
    interestRate: 0,
  });

  // Demais parcelas - com juros progressivos
  for (let i = 2; i <= 12; i++) {
    // Calcula o juros acumulado: parcela atual x 1.67%
    const totalInterest = BASE_INTEREST * i;

    // Calcula o valor total com juros
    const totalWithInterest = basePrice * (1 + totalInterest / 100);

    // Valor de cada parcela
    const installmentAmount = totalWithInterest / i;

    installmentOptions.push({
      number: i,
      amount: installmentAmount,
      total: totalWithInterest,
      interestRate: totalInterest,
    });
  }

  return installmentOptions;
}
