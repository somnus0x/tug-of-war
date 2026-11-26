import type { CreatedResult } from '../model/created'

import { Link } from '@tanstack/react-router'
import { useId, useState } from 'react'

import { useSourceScope } from '@/contracts/queries/use-game-queries'
import { FIXTURES_ON } from '@/contracts/source'
import { explorerTxUrl } from '@/contracts/tx/explorer'
import { CREATE_COPY } from '@/copy/create'
import { copyText } from '@/features/wallet/copy-text'
import { formatCount } from '@/lib/format'
import { PixelBox } from '@/ui/pixel-box'
import { TileButton } from '@/ui/tile-button'
import { tileButtonClassName } from '@/ui/tile-button-classes'

import { useAutoHeight } from '../hooks/use-auto-height'
import { blockParam, createdShareLink } from '../model/created'
import { QrCode } from './qr-code'

type CreateResultProps = {
  result: CreatedResult
  onAnother: () => void
}

type CopyState = 'idle' | 'copied' | 'failed'

const RESULT = CREATE_COPY.result

const MOCK_GAME_FIXTURE = 'waiting-none'

const linkClass = (variant: 'primary' | 'ghost', fullWidth = false) =>
  tileButtonClassName({
    variant,
    state: 'idle',
    selected: undefined,
    team: undefined,
    fullWidth,
  })

export const CreateResult = ({ result, onAnother }: CreateResultProps) => {
  const scope = useSourceScope()
  const linkId = useId()
  const [copy, setCopy] = useState<CopyState>('idle')
  const linkField = useAutoHeight()
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
    const outcome = await copyText(link)
    setCopy(outcome === 'copied' ? 'copied' : 'failed')
    if (outcome === 'manual') {
      linkField.current?.focus()
      linkField.current?.select()
    }
  }
  const found = result.found ?? null
  return (
    <PixelBox heading={RESULT.heading} variant="hot">
      <div className="create-result">
        <p className="create-note">{RESULT.intro}</p>
        {found === null ? null : (
          <div className="create-search">
            <div className="create-search__top">
              <span className="create-search__label">{RESULT.addressLabel}</span>
              <b className="create-search__tries">{RESULT.tries(formatCount(found.tries))}</b>
            </div>
            <div className="create-search__bar is-done" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <p className="create-search__found">
              {RESULT.found(found.address.slice(0, -4))}
              <mark>{found.address.slice(-4)}</mark>
            </p>
          </div>
        )}
        <div className="create-result__body">
          <QrCode text={link} label={RESULT.qrLabel(link)} />
          <div className="create-result__link">
            <span className="create-field__label" id={linkId}>
              {RESULT.linkLabel}
            </span>
            <div className="create-result__share">
              <textarea
                ref={linkField}
                className="create-result__url"
                rows={1}
                readOnly
                aria-labelledby={linkId}
                value={link}
                onFocus={(event) => {
                  event.currentTarget.select()
                }}
              />
              <TileButton
                variant="tile"
                onClick={() => {
                  void onCopy()
                }}
              >
                {RESULT.copy}
              </TileButton>
            </div>
            <output className="create-note">
              {copy === 'copied' ? RESULT.copied : null}
              {copy === 'failed' ? RESULT.copyFailed : null}
            </output>
          </div>
        </div>
        <Link
          to="/g/$launcher"
          params={{ launcher: game.launcher }}
          search={{
            ...(block === undefined ? {} : { b: block }),
            ...(FIXTURES_ON ? { fx: MOCK_GAME_FIXTURE } : {}),
            ...(FIXTURES_ON && scope.viewer !== undefined ? { as: scope.viewer } : {}),
          }}
          className={linkClass('primary', true)}
        >
          {RESULT.open}
        </Link>
        <div className="create-result__quiet">{another}</div>
      </div>
    </PixelBox>
  )
}
