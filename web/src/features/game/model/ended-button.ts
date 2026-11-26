export type EndedButton = 'busy' | 'connect' | 'switchNetwork' | 'go' | 'disabled'

export type EndedButtonInput = {
  readonly isBusy: boolean
  readonly walletStatus: 'disconnected' | 'wrongNetwork' | 'connected'
  readonly fixturesOn: boolean
  readonly ready: boolean
}

export const endedButtonOf = ({
  isBusy,
  walletStatus,
  fixturesOn,
  ready,
}: EndedButtonInput): EndedButton => {
  if (isBusy) {
    return 'busy'
  }
  if (!fixturesOn && walletStatus === 'disconnected') {
    return 'connect'
  }
  if (!fixturesOn && walletStatus === 'wrongNetwork') {
    return 'switchNetwork'
  }
  return ready ? 'go' : 'disabled'
}
