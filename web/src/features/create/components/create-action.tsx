import type { CreateFlow } from '../hooks/use-create-flow'
import type { CreateButton } from '../model/create-button'

import { useId } from 'react'

import { CREATE_COPY } from '@/copy/create'
import { formatCount } from '@/lib/format'
import { Banner } from '@/ui/banner'
import { TileButton } from '@/ui/tile-button'

type CreateActionProps = {
  flow: CreateFlow
  button: CreateButton
  announcement: string
}

const SEARCH = CREATE_COPY.search

export const CreateAction = ({ flow, button, announcement }: CreateActionProps) => {
  const noteId = useId()
  const { stage } = flow
  const isSearching = stage.kind === 'searching'
  return (
    <div className="create-action">
      <div className="create-search">
        <div className="create-search__top">
          <span className="create-search__label">{SEARCH.label}</span>
          {isSearching ? (
            <b className="create-search__tries">{SEARCH.tries(formatCount(stage.tries))}</b>
          ) : null}
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
        {flow.prepared === null ? null : <p className="create-search__ready">{SEARCH.ready}</p>}
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
      <TileButton
        variant="primary"
        type="submit"
        state={button.state}
        fullWidth
        describedBy={noteId}
      >
        {button.label}
      </TileButton>
      <p className="create-note" id={noteId}>
        {CREATE_COPY.button.feeNote}
      </p>
      <p className="create-announcer" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  )
}
