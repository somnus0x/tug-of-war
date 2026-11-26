const MINUTES_INPUT = /^(?:(\d+)(?:[.,](\d*))?|[.,](\d+))$/

const SECONDS_PER_MINUTE = 60

export const parseMinutes = (text: string): number | null => {
  const match = MINUTES_INPUT.exec(text.trim())
  if (match === null) {
    return null
  }
  const whole = match[1] ?? '0'
  const fraction = match[2] ?? match[3] ?? ''
  const minutes = Number(`${whole}.${fraction === '' ? '0' : fraction}`)
  if (!Number.isFinite(minutes)) {
    return null
  }
  const seconds = Math.round(minutes * SECONDS_PER_MINUTE)
  return Number.isSafeInteger(seconds) ? seconds : null
}

export const minutesText = (seconds: number): string => {
  const whole = Math.floor(seconds / SECONDS_PER_MINUTE)
  const rest = seconds % SECONDS_PER_MINUTE
  if (rest === 0) {
    return String(whole)
  }
  const hundredths = Math.round((rest * 100) / SECONDS_PER_MINUTE)
  return `${whole}.${String(hundredths).padStart(2, '0').replace(/0$/, '')}`
}
