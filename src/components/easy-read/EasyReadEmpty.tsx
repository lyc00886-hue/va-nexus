import { t, type MessageKey } from '../../i18n'
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
        src="/mascot-otter-empty.png"
        alt=""
        width={160}
        height={160}
        className="mx-auto h-32 w-32 object-contain"
        decoding="async"
      />
      <p className="mt-3 text-lg font-bold text-teal-950">{t(COPY[kind])}</p>
    </div>
  )
}
