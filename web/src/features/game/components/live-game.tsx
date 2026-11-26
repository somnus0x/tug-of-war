import type { Game, Player, Rules } from '@/contracts/types'
import type { Phase } from '@/lib/phase'
import type { SceneMode } from '@/scene/types'
import type { Address } from 'viem'

import { useChainSelect } from '@/contracts/queries/use-chain-clock'

import { useAcceptState } from '../hooks/use-accept-state'
import { useClockFace } from '../hooks/use-clock-face'
import { useEndedActions } from '../hooks/use-ended-actions'
import { useLaunchWatch } from '../hooks/use-launch-watch'
import { usePullDraft } from '../hooks/use-pull-draft'
import { usePullTx } from '../hooks/use-pull-tx'
import { useWaitingActions } from '../hooks/use-waiting-actions'
import { deriveLive } from '../model/derive-live'
import { splitLineOf } from '../model/ended-view'
import { FEED_ROWS } from '../model/feed-rows'
import { announceStateOf, capNoteOf, pageHeadline, sceneLabelOf } from '../model/page-text'
import { pullBoxStateOf } from '../model/pull-form'
import { AutoLaunchCard } from './auto-launch-card'
import { CapNote } from './cap-note'
import { EndedSlot } from './ended-slot'
import { GameAnnouncer } from './game-announcer'
import { GameBanner } from './game-banner'
import { GameDesktop } from './game-desktop'
import { GameFeed } from './game-feed'
import { GameHeadline } from './game-headline'
import { GameHud } from './game-hud'
import { GamePhone } from './game-phone'
import { GameScene } from './game-scene'
import { PullPicker } from './pull-picker'
import { PullSlot } from './pull-slot'
import { RulesPanel } from './rules-panel'
import { SplitLine } from './split-line'
import { TeamTotals } from './team-totals'
import { ViewerReadout } from './viewer-readout'
import { WaitingSlot } from './waiting-slot'

const isKnown = (chainNow: number | null): boolean => chainNow !== null

type LiveGameProps = {
  launcher: Address
  game: Game
  rules: Rules
  account: Address | undefined
  player: Player | null
  mode: SceneMode
}

const WAITING_PHASES: ReadonlySet<Phase> = new Set(['awaitingCaptains', 'cancelled'])

const ENDED_PHASES: ReadonlySet<Phase> = new Set(['awaitingLaunch', 'refunding', 'launched'])

const CAP_NOTE_PHASES: ReadonlySet<Phase> = new Set(['buyIn', 'awaitingLaunch', 'launched'])

const isCapped = (game: Game, rules: Rules): boolean =>
  CAP_NOTE_PHASES.has(game.phase) && deriveLive(game, rules, game.deadline).capped

const stageNoteOf = (game: Game, rules: Rules) => {
  const splitLine = splitLineOf(game)
  if (splitLine !== null) {
    return <SplitLine text={splitLine} />
  }
  return isCapped(game, rules) ? (
    <CapNote text={capNoteOf(game.ropeBps, game.config.maxBonusShareBps)} />
  ) : null
}

export const LiveGame = ({ launcher, game, rules, account, player, mode }: LiveGameProps) => {
  const face = useClockFace(launcher, game, rules)
  const isClockKnown = useChainSelect(isKnown)
  const headline = pageHeadline(game)
  const hasTeam = player !== null && player.team !== 'none'
  const draft = usePullDraft(player, account)
  const pullTx = usePullTx(launcher, draft)
  const pullState = pullBoxStateOf(game.phase, face, player)
  const waiting = useWaitingActions(launcher, game, account)
  const accept = useAcceptState(launcher, game)
  const ended = useEndedActions(launcher)
  useLaunchWatch(launcher, game.phase, ended.launchSent)
  const isEnded = ENDED_PHASES.has(game.phase)
  const hasBar = mode === 'phone' && (game.phase === 'buyIn' || isEnded)
  const slots = {
    banner: (
      <GameBanner
        launcher={launcher}
        game={game}
        rules={rules}
        account={account}
        player={player}
        isClosing={face === 'closing' || face === 'ended'}
      />
    ),
    hud: <GameHud game={game} rules={rules} face={face} mode={mode} />,
    scene: (
      <GameScene
        launcher={launcher}
        game={game}
        account={account}
        player={player}
        mode={mode}
        label={sceneLabelOf(game, headline)}
        extensionSeconds={rules.overtimeExtension}
      />
    ),
    headline: <GameHeadline headline={headline} isPhone={mode === 'phone'} />,
    capNote: stageNoteOf(game, rules),
    blueTotals: <TeamTotals game={game} side="blue" account={account} />,
    redTotals: <TeamTotals game={game} side="red" account={account} />,
    pull: WAITING_PHASES.has(game.phase) ? (
      <WaitingSlot
        launcher={launcher}
        game={game}
        rules={rules}
        account={account}
        player={player}
        accept={accept}
        actions={waiting}
      />
    ) : isEnded ? (
      <EndedSlot
        launcher={launcher}
        game={game}
        rules={rules}
        account={account}
        player={player}
        isCompact={hasBar}
        actions={ended}
      />
    ) : (
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
    autoLaunch: (
      <AutoLaunchCard
        launcher={launcher}
        game={game}
        account={account}
        schedule={ended.schedule}
        isClosing={face === 'closing' || face === 'ended'}
      />
    ),
    picker:
      hasBar && pullState === 'open' ? (
        <PullPicker game={game} account={account} draft={draft} isBusy={pullTx.state !== 'idle'} />
      ) : null,
    you: <ViewerReadout launcher={launcher} account={account} phase={game.phase} />,
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
