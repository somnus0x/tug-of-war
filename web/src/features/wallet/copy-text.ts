export type CopyRoute = 'clipboard' | 'manual'

export type CopyOutcome = 'copied' | 'manual'

export const copyRoute = (hasClipboard: boolean, secureContext: boolean): CopyRoute =>
  hasClipboard && secureContext ? 'clipboard' : 'manual'

export const copyOutcome = (route: CopyRoute, written: boolean): CopyOutcome =>
  route === 'clipboard' && written ? 'copied' : 'manual'

export const copyText = async (text: string): Promise<CopyOutcome> => {
  const route = copyRoute('clipboard' in navigator, globalThis.isSecureContext)
  if (route === 'manual') {
    return 'manual'
  }
  try {
    await navigator.clipboard.writeText(text)
    return copyOutcome(route, true)
  } catch {
    return copyOutcome(route, false)
  }
}

export type CopyAttempt = {
  readonly text: string
  readonly outcome: CopyOutcome
  readonly attempt: number
}

export const shownOutcome = (
  attempt: CopyAttempt | undefined,
  text: string,
): CopyOutcome | 'idle' =>
  attempt === undefined || attempt.text !== text ? 'idle' : attempt.outcome

export const acceptsCompletion = (
  latest: number,
  currentText: string,
  completion: { readonly attempt: number; readonly text: string },
): boolean => completion.attempt === latest && completion.text === currentText
