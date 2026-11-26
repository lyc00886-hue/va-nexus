import { useT, type MessageKey } from '../i18n'

const EXAMPLE_NAME: Record<string, MessageKey> = {
  'demo-a': 'inspect.demo.a',
  'demo-b': 'inspect.demo.b',
  'demo-c': 'inspect.demo.c',
}

/** Gray bar in place of a school display name. No personal name is invented. */
export function InSchoolPrivacyName({ label }: { label: string }) {
  return (
    <span data-testid="staff-privacy-name" className="inline-flex items-center">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="inline-block h-3 w-28 rounded-full bg-slate-300" />
    </span>
  )
}

export function StaffStudentName({ studentId }: { studentId: string }) {
  const { t } = useT()
  const key = EXAMPLE_NAME[studentId]
  if (key) return <span>{t(key)}</span>
  return <InSchoolPrivacyName label={t('cropask.staff.student')} />
}
