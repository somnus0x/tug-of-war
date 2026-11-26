import { GAME_COPY } from '@/copy/game'
import { PixelBox } from '@/ui/pixel-box'

export const NotAGame = () => (
  <PixelBox variant="warm">
    <p role="alert">{GAME_COPY.notAGame}</p>
  </PixelBox>
)
