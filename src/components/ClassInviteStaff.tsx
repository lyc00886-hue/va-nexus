import { useState, type FormEvent } from 'react'
import { useT, type MessageKey } from '../i18n'
import { createRealClassroom, type InviteRoom } from '../lib/classInvite'
import { PORTFOLIO_LABEL_MAX } from '../lib/teacherDraftBand'
import { StudentPresentControl } from './StudentPresentControl'

const EXAMPLE_ROWS: { id: string; name: MessageKey; handedIn: boolean }[] = [
  { id: 'demo-a', name: 'inspect.demo.a', handedIn: true },
  { id: 'demo-b', name: 'inspect.demo.b', handedIn: true },
  { id: 'demo-c', name: 'inspect.demo.c', handedIn: false },
]

export function ClassInviteCreate({
  onCreated,
  onBack,
}: {
  onCreated: (room: InviteRoom) => void
  onBack: () => void
}) {
  const { t } = useT()
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const titleId = 'class-real-create-title'

  async function create(event: FormEvent) {
    event.preventDefault()
    const next = name.trim()
    if (!next || pending) return
    setPending(true)
    const room = await createRealClassroom(next)
    setPending(false)
    if (!room) return
    setName('')
    onCreated(room)
  }

  return (
    <div className="space-y-4" data-testid="class-real-create" data-soft-motion="off">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-[#0D9488]"
        >
          {t('class.staff.title')}
        </button>
        <h2 id={titleId} className="mt-1 text-xl font-bold text-slate-900">
          {t('class.staff.openReal')}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('class.staff.sharedNote')}</p>
      </div>
      <form onSubmit={create} className="rounded-3xl border-2 border-[#0D9488] bg-white p-4">
        <label htmlFor="class-real-name" className="block text-sm font-semibold text-slate-900">
          {t('class.staff.nameLabel')}
        </label>
        <input
          id="class-real-name"
          data-testid="class-real-name"
          value={name}
          placeholder={t('class.staff.namePlaceholder')}
          maxLength={PORTFOLIO_LABEL_MAX}
          autoComplete="off"
          onChange={(event) => setName(event.target.value.slice(0, PORTFOLIO_LABEL_MAX))}
          className="mt-2 w-full rounded-xl border border-[#0D9488]/40 bg-[#FFF9E9] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
        />
        <p className="mt-2 text-sm text-[#0D9488]">{t('class.staff.demoClassNote')}</p>
        <button
          type="submit"
          data-testid="class-real-submit"
          disabled={pending || name.trim() === ''}
          className="mt-3 whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t('class.staff.openReal')}
        </button>
      </form>
      <div className="rounded-3xl border border-[#0D9488]/30 bg-white p-4">
        <p className="text-sm leading-relaxed text-slate-600">{t('class.staff.sharedNote')}</p>
        <p className="mt-2 text-sm text-[#0D9488]">{t('class.staff.demoClassNote')}</p>
      </div>
    </div>
  )
}

export function ClassInviteRoom({ room, onBack }: { room: InviteRoom; onBack: () => void }) {
  const { t } = useT()
  const [copied, setCopied] = useState(false)
  const [presentStudent, setPresentStudent] = useState<string | null>(null)
  const titleId = 'class-real-room-title'

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-4" data-testid="class-real-room" data-class-code={room.code} data-soft-motion="off">
      <div>
        <button type="button" onClick={onBack} className="text-sm font-semibold text-[#0D9488]">
          {t('class.staff.title')}
        </button>
        <h2 id={titleId} className="mt-1 text-xl font-bold text-slate-900">
          {room.name}
        </h2>
        <p className="mt-2">
          <span className="inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9]">
            {t('class.staff.realChip')}
          </span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('class.staff.sharedNote')}</p>
      </div>

      <div className="rounded-3xl border-2 border-[#0D9488] bg-white p-4" data-testid="class-invite-card">
        <p className="text-sm font-semibold text-slate-700">{t('class.staff.inviteCode')}</p>
        <p data-testid="class-invite-code" className="mt-1 text-3xl font-bold tracking-wide text-slate-900">
          {room.code}
        </p>
        <button
          type="button"
          data-testid="class-invite-copy"
          data-copied={copied ? 'true' : 'false'}
          onClick={() => void copyCode()}
          className="mt-3 whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white"
        >
          {t('class.staff.copyInvite')}
        </button>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('class.staff.handInvite')}</p>
      </div>

      {room.members.length === 0 ? (
        <div className="rounded-3xl border border-[#0D9488]/30 bg-white p-4" data-testid="class-invite-empty">
          <p className="text-sm leading-relaxed text-slate-700">{t('class.staff.emptyInvitees')}</p>
          <p className="mt-2 text-sm text-[#0D9488]">{t('inspect.staff.demoNote')}</p>
        </div>
      ) : null}

      <div data-testid="class-example-roster" className="space-y-3">
        <p className="text-sm text-[#0D9488]">{t('inspect.staff.demoNote')}</p>
        <p className="text-sm leading-relaxed text-slate-600">{t('class.staff.sharedNote')}</p>
        <ul className="m-0 list-none space-y-3 p-0">
          {EXAMPLE_ROWS.map((row) => (
            <li key={row.id} data-example-student={row.id} className="rounded-3xl border border-[#0D9488]/30 bg-white p-4">
              <p className="font-semibold text-slate-900">{t(row.name)}</p>
              <p className="mt-2">
                <span
                  className={
                    row.handedIn
                      ? 'inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9]'
                      : 'inline-flex rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-600'
                  }
                >
                  {row.handedIn ? t('hw.staff.homeworkDoneChip') : t('hw.staff.homeworkChip')}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>

      {room.members.length > 0 ? (
        <ul className="m-0 list-none space-y-3 p-0" data-testid="class-joined-roster">
          {room.members.map((member) => {
            const handedIn = room.submissions.some((row) => row.memberId === member.id && row.fileName !== '')
            const chip = (
              <span
                className={
                  handedIn
                    ? 'inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9]'
                    : 'inline-flex rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-600'
                }
              >
                {handedIn ? t('hw.staff.homeworkDoneChip') : t('hw.staff.homeworkChip')}
              </span>
            )
            return (
              <StudentPresentControl
                key={member.id}
                studentId={member.id}
                open={presentStudent === member.id}
                onOpen={() => setPresentStudent((current) => (current === member.id ? null : member.id))}
                extra={
                  <p data-testid={`class-joined-${member.id}`} data-hw-handed-in={handedIn ? 'true' : 'false'}>
                    {chip}
                  </p>
                }
              />
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
