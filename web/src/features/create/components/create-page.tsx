import {
  useCreateLimits,
  useCreateScopeKey,
  useCreateSetup,
} from '@/contracts/queries/use-create-queries'
import { CREATE_COPY } from '@/copy/create'
import { Banner } from '@/ui/banner'

import { initialValues } from '../model/form-values'
import { CreateForm } from './create-form'

import './create.css'

export const CreatePage = () => {
  const setup = useCreateSetup()
  const limits = useCreateLimits()
  const scopeKey = useCreateScopeKey()
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
          <output className="create-note">{CREATE_COPY.loading}</output>
        )}
      </div>
    )
  }
  const refetchLimits = async () => (await limits.refetch()).data
  return (
    <CreateForm
      key={[scopeKey, setup.data.portal, setup.data.tokenImplementation].join('|')}
      setup={setup.data}
      limits={limits.data}
      initial={initialValues(setup.data, limits.data)}
      refetchLimits={refetchLimits}
    />
  )
}
