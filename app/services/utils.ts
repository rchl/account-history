export function formatCurrency(value: number, currency = 'NOK'): string {
    const amount = Math.round(value)
    const formatted = String(amount).replace(/(\d)(?=(\d{3})+(?:\.\d+)?$)/g, '$1,')
    return Number.isNaN(value) ? '---' : `${formatted} ${currency}`
}
