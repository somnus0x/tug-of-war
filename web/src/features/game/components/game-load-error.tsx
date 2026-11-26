import { GAME_COPY } from '@/copy/game'
import { PixelBox } from '@/ui/pixel-box'

export const GameLoadError = () => (
  <PixelBox variant="warm">
    <p role="alert">{GAME_COPY.loadFailed}</p>
  </PixelBox>
)
