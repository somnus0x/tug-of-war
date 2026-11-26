import type { Theme } from '@rainbow-me/rainbowkit'

import { darkTheme } from '@rainbow-me/rainbowkit'

const base = darkTheme({
  accentColor: 'var(--lime)',
  accentColorForeground: 'var(--ink-0)',
  borderRadius: 'none',
  overlayBlur: 'none',
})

const outline = '0 0 0 3px var(--ink-0)'

export const walletTheme: Theme = {
  ...base,
  colors: {
    ...base.colors,
    actionButtonBorder: 'var(--ink-2)',
    actionButtonBorderMobile: 'var(--ink-2)',
    actionButtonSecondaryBackground: 'var(--ink-2)',
    closeButton: 'var(--cream)',
    closeButtonBackground: 'var(--ink-2)',
    connectButtonBackground: 'var(--ink-1)',
    connectButtonBackgroundError: 'var(--red-d)',
    connectButtonInnerBackground: 'var(--ink-2)',
    connectButtonText: 'var(--cream)',
    connectButtonTextError: 'var(--cream)',
    connectionIndicator: 'var(--lime)',
    downloadBottomCardBackground: 'var(--ink-1)',
    downloadTopCardBackground: 'var(--ink-2)',
    error: 'var(--red)',
    generalBorder: 'var(--ink-2)',
    generalBorderDim: 'var(--ink-2)',
    menuItemBackground: 'var(--ink-2)',
    modalBackdrop: 'color-mix(in srgb, var(--ink-0) 80%, transparent)',
    modalBackground: 'var(--ink-1)',
    modalBorder: 'var(--cream)',
    modalText: 'var(--cream)',
    modalTextDim: 'var(--mute)',
    modalTextSecondary: 'var(--mute)',
    profileAction: 'var(--ink-2)',
    profileActionHover: 'var(--ink-0)',
    profileForeground: 'var(--ink-1)',
    selectedOptionBorder: 'var(--lime)',
    standby: 'var(--gold)',
  },
  shadows: {
    ...base.shadows,
    connectButton: outline,
    dialog: '6px 6px 0 var(--ink-0)',
    profileDetailsAction: 'none',
    selectedOption: 'none',
    selectedWallet: 'none',
    walletLogo: 'none',
  },
  fonts: {
    body: 'var(--font-body)',
  },
}
