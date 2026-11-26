import type { Game, Rules } from '@/contracts/types'

import { GAME_COPY } from '@/copy/game'
import { formatBnb, formatCount, formatPull, formatShare } from '@/lib/format'

import { headlineOf } from '../model/headline'
import { ClockLines } from './clock-lines'
import { ReadoutRow } from './readout-row'

type GameSummaryProps = {
  game: Game
  rules: Rules
}

const headlineText = (game: Game): string => {
  const { lead, shareBps } = headlineOf(game.pullByTeam, game.ropeBps)
  const share = formatShare(shareBps)
  return lead === 'tie' ? GAME_COPY.level(share) : GAME_COPY.holds(GAME_COPY.team[lead], share)
}

export const GameSummary = ({ game, rules }: GameSummaryProps) => (
  <dl className="game-readout__list">
    <ReadoutRow label={GAME_COPY.readout.phase}>{GAME_COPY.phase[game.phase]}</ReadoutRow>
    <ReadoutRow label={GAME_COPY.readout.headline}>{headlineText(game)}</ReadoutRow>
    <ReadoutRow label={GAME_COPY.readout.raised}>
      {GAME_COPY.raisedOfMinimum(formatBnb(game.raised), formatBnb(game.config.minRaise))}
    </ReadoutRow>
    <ReadoutRow label={GAME_COPY.readout.pull}>
      {GAME_COPY.teamPull(formatPull(game.pullByTeam.blue), formatPull(game.pullByTeam.red))}
    </ReadoutRow>
    <ReadoutRow label={GAME_COPY.readout.wallets}>
      {GAME_COPY.teamWallets(
        formatCount(game.playersByTeam.blue),
        formatCount(game.playersByTeam.red),
      )}
    </ReadoutRow>
    <ClockLines game={game} rules={rules} />
    <ReadoutRow label={GAME_COPY.readout.overtime}>
      {GAME_COPY.overtimeUsed(formatCount(game.extensionsUsed), formatCount(rules.maxExtensions))}
    </ReadoutRow>
  </dl>
)
