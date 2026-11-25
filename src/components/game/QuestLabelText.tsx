import { questLabelTokens } from '../../lib/questLabelText'

/** Official title, wrapped only between words. The characters stay the live title. */
export function QuestLabelText({ text }: { text: string }) {
  return (
    <span className="quest-label-words">
      {questLabelTokens(text).map((token, index) => (
        <span key={`${index}-${token}`} className="quest-label-token">
          {token}
        </span>
      ))}
    </span>
  )
}
