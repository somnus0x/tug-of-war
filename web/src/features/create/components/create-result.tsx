import type { CreatedResult } from '../model/created'

import { Link } from '@tanstack/react-router'
import { useId, useState } from 'react'

import { useSourceScope } from '@/contracts/queries/use-game-queries'
import { FIXTURES_ON } from '@/contracts/source'
import { explorerTxUrl } from '@/contracts/tx/explorer'
import { CREATE_COPY } from '@/copy/create'
import { PixelBox } from '@/ui/pixel-box'
import { TileButton } from '@/ui/tile-button'
import { tileButtonClassName } from '@/ui/tile-button-classes'

import { blockParam, createdShareLink } from '../model/created'
import { QrCode } from './qr-code'

type CreateResultProps = {
  result: CreatedResult
  onAnother: () => void
}

type CopyState = 'idle' | 'copied' | 'failed'

const RESULT = CREATE_COPY.result

const MOCK_GAME_FIXTURE = 'waiting-none'

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const linkClass = (variant: 'primary' | 'ghost') =>
  tileButtonClassName({
    variant,
    state: 'idle',
    selected: undefined,
    team: undefined,
    fullWidth: false,
  })

export const CreateResult = ({ result, onAnother }: CreateResultProps) => {
  const scope = useSourceScope()
  const linkId = useId()
  const [copy, setCopy] = useState<CopyState>('idle')
  const { game } = result
  const another = (
    <TileButton variant="ghost" onClick={onAnother}>
      {RESULT.another}
    </TileButton>
  )
  if (game === null) {
    return (
      <PixelBox heading={RESULT.heading} variant="warm">
        <div className="create-result">
          <p>{RESULT.missingTitle}</p>
          <p className="create-note">{RESULT.missingBody}</p>
          <div className="create-result__actions">
            <Link to="/" className={linkClass('primary')}>
              {RESULT.home}
            </Link>
            <a className={linkClass('ghost')} href={explorerTxUrl(result.hash)} rel="noreferrer">
              {RESULT.explorer}
            </a>
            {another}
          </div>
        </div>
      </PixelBox>
    )
  }
  const extra: Record<string, string> = FIXTURES_ON
    ? {
        fx: MOCK_GAME_FIXTURE,
        ...(scope.viewer === undefined ? {} : { as: scope.viewer }),
      }
    : {}
  const link = createdShareLink(
    { origin: window.location.origin, baseUrl: import.meta.env.BASE_URL, extra },
    game.launcher,
    game.blockNumber,
  )
  const block = blockParam(game.blockNumber)
  const onCopy = async (): Promise<void> => {
    setCopy((await copyText(link)) ? 'copied' : 'failed')
  }
  return (
    <PixelBox heading={RESULT.heading} variant="hot">
      <div className="create-result">
        <p className="create-note">{RESULT.intro}</p>
        <div className="create-result__body">
          <QrCode text={link} label={RESULT.qrLabel(link)} />
          <div className="create-result__link">
            <label className="create-field__label" htmlFor={linkId}>
              {RESULT.linkLabel}
            </label>
            <input
              id={linkId}
              className="create-result__url"
              type="text"
              readOnly
              value={link}
              onFocus={(event) => {
                event.target.select()
              }}
            />
            <div className="create-result__actions">
              <TileButton
                variant="tile"
                onClick={() => {
                  void onCopy()
                }}
              >
                {RESULT.copy}
              </TileButton>
              <Link
                to="/g/$launcher"
                params={{ launcher: game.launcher }}
                search={{
                  ...(block === undefined ? {} : { b: block }),
                  ...(FIXTURES_ON ? { fx: MOCK_GAME_FIXTURE } : {}),
                  ...(FIXTURES_ON && scope.viewer !== undefined ? { as: scope.viewer } : {}),
                }}
                className={linkClass('primary')}
              >
                {RESULT.open}
              </Link>
              {another}
            </div>
            <output className="create-note">
              {copy === 'copied' ? RESULT.copied : null}
              {copy === 'failed' ? RESULT.copyFailed : null}
            </output>
          </div>
        </div>
      </div>
    </PixelBox>
  )
}
