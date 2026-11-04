import { t, type MessageKey } from '../../i18n'
import { MOOD_EMPTY_MAP } from '../../game/softMotion'
import type { EasyEmptyKind } from '../../lib/easyReadMode'

const COPY: Record<EasyEmptyKind, MessageKey> = {
  offline: 'er.empty.offline',
  'no-lessons': 'empty.lessons',
  'no-content': 'empty.noContent',
  'next-lesson': 'empty.nextLesson',
}

export function EasyReadEmpty({ kind }: { kind: EasyEmptyKind }) {
  return (
    <div data-testid={`easy-read-empty-${kind}`} className="rounded-3xl border border-teal-100 bg-[#FFF9E9] px-6 py-8 text-center">
      <img
        src={MOOD_EMPTY_MAP}
        alt=""
        width={1152}
        height={864}
        className="mx-auto w-full max-w-sm rounded-3xl object-contain"
        decoding="async"
      />
      <p className="mt-3 text-lg font-bold text-teal-950">{t(COPY[kind])}</p>
    </div>
  )
}
