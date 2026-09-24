const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

export function formatCurrency(amount: number): string {
  return inrFormatter.format(Math.round(amount))
}

export function formatCurrencyPerMonth(amount: number): string {
  return `${formatCurrency(amount)}/month`
}
