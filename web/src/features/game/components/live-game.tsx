import type { Game, Player, Rules } from '@/contracts/types'
import type { SceneMode } from '@/scene/types'
import type { Address } from 'viem'

import { FIXTURES_ON } from '@/contracts/source'

import { useClockFace } from '../hooks/use-clock-face'
import { deriveLive, leadOf } from '../model/derive-live'
import { capNoteOf, pageHeadline, sceneLabelOf } from '../model/page-text'
import { CapNote } from './cap-note'
import { GameAnnouncer } from './game-announcer'
import { GameDesktop } from './game-desktop'
import { GameHeadline } from './game-headline'
import { GameHud } from './game-hud'
import { GamePhone } from './game-phone'
import { GameScene } from './game-scene'
import { PullSlot } from './pull-slot'
import { RulesPanel } from './rules-panel'
import { TeamTotals } from './team-totals'
import { ViewerReadout } from './viewer-readout'

type LiveGameProps = {
  launcher: Address
  game: Game
  rules: Rules
  account: Address | undefined
  player: Player | null
  mode: SceneMode
}

const isCapped = (game: Game, rules: Rules): boolean =>
  game.phase === 'buyIn' && deriveLive(game, rules, game.deadline).capped

export const LiveGame = ({ launcher, game, rules, account, player, mode }: LiveGameProps) => {
  const face = useClockFace(launcher, game, rules)
  const headline = pageHeadline(game)
  const hasTeam = player !== null && player.team !== 'none'
  const slots = {
    hud: <GameHud game={game} rules={rules} face={face} mode={mode} />,
    scene: (
      <GameScene
        launcher={launcher}
        game={game}
        account={account}
        player={player}
        mode={mode}
        label={sceneLabelOf(game, headline)}
      />
    ),
    headline: <GameHeadline headline={headline} />,
    capNote: isCapped(game, rules) ? (
      <CapNote text={capNoteOf(game.ropeBps, game.config.maxBonusShareBps)} />
    ) : null,
    blueTotals: <TeamTotals game={game} side="blue" account={account} />,
    redTotals: <TeamTotals game={game} side="red" account={account} />,
    pull: <PullSlot launcher={launcher} game={game} rules={rules} />,
    you: <ViewerReadout launcher={launcher} account={account} />,
    rules: <RulesPanel game={game} rules={rules} collapsed={hasTeam} />,
    announcer: (
      <GameAnnouncer
        state={{
          lead: leadOf(game.pullByTeam),
          extensionsUsed: game.extensionsUsed,
          ended: face === 'closing' || face === 'ended',
        }}
        extensionSeconds={rules.overtimeExtension}
      />
    ),
  }
  if (mode === 'desktop') {
    return <GameDesktop slots={slots} />
  }
  return (
    <GamePhone slots={slots} hasBar={FIXTURES_ON && game.phase === 'buyIn'} rulesLast={hasTeam} />
  )
}
