import type { Game, Player, Rules } from '@/contracts/types'
import type { Phase } from '@/lib/phase'
import type { SceneMode } from '@/scene/types'
import type { Address } from 'viem'

import { useChainSelect } from '@/contracts/queries/use-chain-clock'

import { useClockFace } from '../hooks/use-clock-face'
import { usePullDraft } from '../hooks/use-pull-draft'
import { usePullTx } from '../hooks/use-pull-tx'
import { deriveLive } from '../model/derive-live'
import { FEED_ROWS } from '../model/feed-rows'
import { announceStateOf, capNoteOf, pageHeadline, sceneLabelOf } from '../model/page-text'
import { pullBoxStateOf } from '../model/pull-form'
import { CapNote } from './cap-note'
import { GameAnnouncer } from './game-announcer'
import { GameDesktop } from './game-desktop'
import { GameFeed } from './game-feed'
import { GameHeadline } from './game-headline'
import { GameHud } from './game-hud'
import { GamePhone } from './game-phone'
import { GameScene } from './game-scene'
import { PullPicker } from './pull-picker'
import { PullSlot } from './pull-slot'
import { RulesPanel } from './rules-panel'
import { TeamTotals } from './team-totals'
import { ViewerReadout } from './viewer-readout'

const isKnown = (chainNow: number | null): boolean => chainNow !== null

type LiveGameProps = {
  launcher: Address
  game: Game
  rules: Rules
  account: Address | undefined
  player: Player | null
  mode: SceneMode
}

const CAP_NOTE_PHASES: ReadonlySet<Phase> = new Set(['buyIn', 'awaitingLaunch', 'launched'])

const isCapped = (game: Game, rules: Rules): boolean =>
  CAP_NOTE_PHASES.has(game.phase) && deriveLive(game, rules, game.deadline).capped

export const LiveGame = ({ launcher, game, rules, account, player, mode }: LiveGameProps) => {
  const face = useClockFace(launcher, game, rules)
  const isClockKnown = useChainSelect(isKnown)
  const headline = pageHeadline(game)
  const hasTeam = player !== null && player.team !== 'none'
  const draft = usePullDraft(player, account)
  const pullTx = usePullTx(launcher, draft)
  const pullState = pullBoxStateOf(game.phase, face, player)
  const hasBar = mode === 'phone' && game.phase === 'buyIn'
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
    pull: (
      <PullSlot
        launcher={launcher}
        game={game}
        rules={rules}
        account={account}
        player={player}
        draft={draft}
        state={pullState}
        layout={hasBar ? 'bar' : 'box'}
        tx={pullTx}
      />
    ),
    picker:
      hasBar && pullState === 'open' ? (
        <PullPicker game={game} account={account} draft={draft} isBusy={pullTx.state !== 'idle'} />
      ) : null,
    you: <ViewerReadout launcher={launcher} account={account} />,
    feed: (
      <GameFeed
        launcher={launcher}
        game={game}
        rules={rules}
        account={account}
        limit={FEED_ROWS[mode]}
      />
    ),
    rules: <RulesPanel game={game} rules={rules} collapsed={hasTeam} />,
    announcer: (
      <GameAnnouncer
        state={announceStateOf(game, face, isClockKnown)}
        extensionSeconds={rules.overtimeExtension}
      />
    ),
  }
  if (mode === 'desktop') {
    return <GameDesktop slots={slots} />
  }
  return <GamePhone slots={slots} hasBar={hasBar} rulesLast={hasTeam} />
}
