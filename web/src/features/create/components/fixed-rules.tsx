import type { CreateSetup } from '@/contracts/create-types'

import { CREATE_COPY } from '@/copy/create'
import { PixelBox } from '@/ui/pixel-box'

import { fixedRuleRows, fixedSettingRows } from '../model/fixed-rows'

type FixedRulesProps = { setup: CreateSetup }

export const FixedRules = ({ setup }: FixedRulesProps) => (
  <PixelBox heading={CREATE_COPY.sections.fixed}>
    <dl className="create-fixed">
      {fixedSettingRows(setup).map((row) => (
        <div key={row.key} className="create-fixed__row">
          <dt>{row.label}</dt>
          <dd>{row.text}</dd>
        </div>
      ))}
    </dl>
    <dl className="create-rules">
      {fixedRuleRows(setup).map((row) => (
        <div key={row.key} className="create-rules__row">
          <dt>{row.label}</dt>
          <dd>{row.text}</dd>
        </div>
      ))}
    </dl>
    <p className="create-note">{CREATE_COPY.fixedNote}</p>
  </PixelBox>
)
