import { useSen } from '../context/SenContext'
import { softMotionPlay } from '../game/softMotion'

/** Gear opt-in for the three soft events. Off until the student turns it on. */
export function useSoftMotion(): boolean {
  const { settings } = useSen()
  return softMotionPlay({ soundMotion: settings.soundMotion, reduceMotion: settings.reduceMotion })
}
