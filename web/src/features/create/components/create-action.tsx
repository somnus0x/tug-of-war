import type { CreateFlow } from '../hooks/use-create-flow'
import type { CreateButton } from '../model/create-button'
import type { TxMessage } from '@/copy/tx'

import { useId } from 'react'

import { CREATE_COPY } from '@/copy/create'
import { formatCount } from '@/lib/format'
import { Banner } from '@/ui/banner'
import { TileButton } from '@/ui/tile-button'

import { shownTries } from '../model/create-button'

type CreateActionProps = {
  flow: CreateFlow
  button: CreateButton
  announcement: string
  feeNotice?: string | undefined
  isReady: boolean
  failure: TxMessage | null
}

const SEARCH = CREATE_COPY.search

export const CreateAction = ({
  flow,
  button,
  announcement,
  feeNotice,
  isReady,
  failure,
}: CreateActionProps) => {
  const noteId = useId()
  const reasonId = useId()
  const { stage } = flow
  const isSearching = stage.kind === 'searching'
  const tries = shownTries(stage, flow.salt)
  return (
    <div className="create-action">
      <div className="create-search">
        <div className="create-search__top">
          <span className="create-search__label">{SEARCH.label}</span>
          {tries === null ? null : (
            <b className="create-search__tries">{SEARCH.tries(formatCount(tries))}</b>
          )}
        </div>
        <div
          className={`create-search__bar ${flow.salt === null ? 'is-waiting' : 'is-done'} ${isSearching ? 'is-running' : ''}`}
          aria-hidden="true"
        >
          <i />
          <i />
          <i />
          <i />
        </div>
        {flow.salt === null ? (
          <p className="create-note">{SEARCH.idle}</p>
        ) : (
          <p className="create-search__found">
            {SEARCH.found(flow.salt.address.slice(0, -4))}
            <mark>{flow.salt.address.slice(-4)}</mark>
          </p>
        )}
        {isReady ? <p className="create-search__ready">{SEARCH.ready}</p> : null}
        {isSearching ? (
          <TileButton variant="ghost" onClick={flow.cancelSearch}>
            {CREATE_COPY.stopSearch}
          </TileButton>
        ) : null}
      </div>
      {flow.problem === null ? null : (
        <Banner
          kind="warn"
          text={
            flow.problem.body === undefined
              ? flow.problem.title
              : `${flow.problem.title} · ${flow.problem.body}`
          }
        />
      )}
      {failure === null ? null : (
        <p className="create-failure" role="alert">
          <b>{failure.title}</b> {failure.body}
        </p>
      )}
      <TileButton
        variant="primary"
        type="submit"
        state={button.state}
        fullWidth
        keepFocus
        describedBy={button.reason === undefined ? noteId : `${reasonId} ${noteId}`}
      >
        {button.label}
      </TileButton>
      {button.reason === undefined ? null : (
        <p className="create-reason" id={reasonId}>
          {button.reason}
        </p>
      )}
      <p className="create-note" id={noteId}>
        {feeNotice === undefined ? null : <b className="create-fee-notice">{feeNotice} </b>}
        {CREATE_COPY.button.feeNote}
      </p>
      <p className="create-announcer" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  )
}
