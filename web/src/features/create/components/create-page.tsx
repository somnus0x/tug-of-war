import { useReducer } from 'react'

import {
  useCreateLimits,
  useCreateScopeKey,
  useCreateSetup,
} from '@/contracts/queries/use-create-queries'
import { CREATE_COPY } from '@/copy/create'
import { TugLoader } from '@/scene/tug-loader'
import { Banner } from '@/ui/banner'

import { FIRST_ROUND, createRoundReducer } from '../model/created'
import { initialValues } from '../model/form-values'
import { CreateForm } from './create-form'
import { CreateResult } from './create-result'

import './create.css'

export const CreatePage = () => {
  const setup = useCreateSetup()
  const limits = useCreateLimits()
  const scopeKey = useCreateScopeKey()
  const [round, dispatch] = useReducer(createRoundReducer, FIRST_ROUND)
  if (round.created !== null) {
    return (
      <div className="create-page">
        <header className="create-title">
          <h1>{CREATE_COPY.heading}</h1>
        </header>
        <CreateResult
          result={round.created}
          onAnother={() => {
            dispatch({ type: 'another' })
          }}
        />
      </div>
    )
  }
  if (setup.data === undefined || limits.data === undefined) {
    const failed = setup.isError || limits.isError
    return (
      <div className="create-page">
        <header className="create-title">
          <h1>{CREATE_COPY.heading}</h1>
        </header>
        {failed ? (
          <Banner
            kind="warn"
            text={CREATE_COPY.setupFailed}
            actionLabel={CREATE_COPY.retry}
            onAction={() => {
              void setup.refetch()
              void limits.refetch()
            }}
          />
        ) : (
          <TugLoader label={CREATE_COPY.loading} />
        )}
      </div>
    )
  }
  const refetchLimits = async () => (await limits.refetch()).data
  return (
    <CreateForm
      key={[scopeKey, setup.data.portal, setup.data.tokenImplementation, round.round].join('|')}
      setup={setup.data}
      limits={limits.data}
      initial={initialValues(setup.data, limits.data)}
      refetchLimits={refetchLimits}
      onCreated={(result) => {
        dispatch({ type: 'created', result })
      }}
    />
  )
}
