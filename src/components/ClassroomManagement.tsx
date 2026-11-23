import { useState, type ReactNode } from 'react'
import { AssignmentPublish } from './AssignmentPublish'
import { ClassInviteCreate, ClassInviteRoom } from './ClassInviteStaff'
import { HomeworkReview } from './HomeworkReview'
import { StudentPresentControl } from './StudentPresentControl'
import { useT } from '../i18n'
import { useClassList } from '../lib/classList'
import { useRealClassrooms, type InviteRoom } from '../lib/classInvite'
import { HW_ROSTER_IDS } from '../lib/homeworkSubmit'

/**
 * Parent surface for the classes a teacher looks after.
 * The sample class stays on this device. A real classroom is opened
 * through the shared invite route, then the existing overview is shown.
 */
export function ClassroomManagement({ overview }: { overview: ReactNode }) {
  const { t } = useT()
  const classes = useClassList()
  const shared = useRealClassrooms()
  const [openId, setOpenId] = useState<string | null>(null)
  const [screen, setScreen] = useState<'list' | 'create' | 'real'>('list')
  const [realId, setRealId] = useState<string | null>(null)
  const [presentStudent, setPresentStudent] = useState<string | null>('demo-a')
  const localOpen = classes.find((row) => row.id === openId) ?? null
  const realRoom = shared.find((room) => room.id === realId) ?? null
  const openRow =
    screen === 'real' && realRoom
      ? { id: realRoom.id, name: realRoom.name, demo: false as const }
      : screen === 'list'
        ? localOpen
        : null
  const open = openRow != null
  const titleId = 'class-staff-title'
  const listId = 'class-staff-list-title'

  function openShared(room: InviteRoom) {
    setRealId(room.id)
    setOpenId(null)
    setScreen('real')
  }

  return (
    <section
      aria-labelledby={titleId}
      data-testid="class-staff"
      data-soft-motion="off"
      className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5"
    >
      {screen === 'list' ? (
        <div>
          <h2 id={titleId} className="text-xl font-bold text-slate-900">
            {t('class.staff.title')}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('class.staff.intro')}</p>
        </div>
      ) : null}
      {screen === 'list' ? (
        <p className="text-sm leading-relaxed text-slate-600">{t('class.staff.overviewHint')}</p>
      ) : null}

      {screen === 'create' ? (
        <ClassInviteCreate onCreated={openShared} onBack={() => setScreen('list')} />
      ) : null}

      {screen === 'real' && realRoom ? (
        <ClassInviteRoom room={realRoom} onBack={() => setScreen('list')} />
      ) : null}

      {screen === 'list' ? (
        <div>
          <h3 id={listId} className="text-lg font-bold text-slate-900">
            {t('class.staff.listTitle')}
          </h3>
        </div>
      ) : null}

      {screen === 'list' && classes.length === 0 && shared.length === 0 ? (
        <p role="status" data-testid="class-staff-empty" className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-700">
          {t('class.staff.empty')}
        </p>
      ) : null}

      {screen === 'list' ? (
        <ul aria-labelledby={listId} className="m-0 list-none space-y-3 p-0">
          {classes.map((row) => {
            const opened = openId === row.id
            const label = row.demo ? t('class.staff.demoClass') : row.name
            return (
              <li
                key={row.id}
                data-testid={`class-staff-card-${row.id}`}
                data-class-demo={row.demo ? 'true' : 'false'}
                data-class-open={opened ? 'true' : 'false'}
                className="rounded-3xl border border-[#0D9488]/30 bg-white p-4"
              >
                <p className="font-semibold text-slate-900">{label}</p>
                {row.demo ? (
                  <>
                    <p data-testid="class-demo-note" className="mt-1 text-sm text-[#0D9488]">
                      {t('class.staff.demoClassNote')}
                    </p>
                    <p data-testid="class-staff-count" className="mt-1 text-sm text-slate-600">
                      {t('class.staff.studentCount')}
                    </p>
                    <ul data-testid="class-present-roster" className="m-0 mt-3 list-none space-y-3 p-0">
                      {HW_ROSTER_IDS.map((studentId) => (
                        <StudentPresentControl
                          key={studentId}
                          studentId={studentId}
                          open={presentStudent === studentId}
                          onOpen={() => setPresentStudent((current) => (current === studentId ? null : studentId))}
                        />
                      ))}
                    </ul>
                  </>
                ) : null}
                <button
                  type="button"
                  data-testid={`class-staff-open-${row.id}`}
                  aria-expanded={opened}
                  aria-controls={opened ? 'class-staff-overview' : undefined}
                  onClick={() => {
                    setScreen('list')
                    setOpenId(row.id)
                  }}
                  className="mt-3 whitespace-nowrap rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
                >
                  {t('class.staff.openClass')}
                </button>
              </li>
            )
          })}
          {shared.map((room) => (
            <li
              key={room.id}
              data-testid={`class-staff-card-${room.id}`}
              data-class-demo="false"
              data-class-shared="true"
              className="rounded-3xl border-2 border-[#0D9488] bg-white p-4"
            >
              <p className="font-semibold text-slate-900">{room.name}</p>
              <p className="mt-2">
                <span className="inline-flex rounded-full bg-[#0D9488] px-3 py-1 text-sm font-semibold text-[#FFF9E9]">
                  {t('class.staff.realChip')}
                </span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('class.staff.sharedNote')}</p>
              <button
                type="button"
                data-testid={`class-staff-open-${room.id}`}
                onClick={() => openShared(room)}
                className="mt-3 whitespace-nowrap rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
              >
                {t('class.staff.openClass')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {screen === 'list' ? (
        <div className="space-y-3">
          <button
            type="button"
            data-testid="class-open-real"
            onClick={() => setScreen('create')}
            className="whitespace-nowrap rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white"
          >
            {t('class.staff.openReal')}
          </button>
          <div className="rounded-3xl border border-[#0D9488]/30 bg-white p-4">
            <p className="text-sm leading-relaxed text-slate-600">{t('class.staff.sharedNote')}</p>
            <p className="mt-2 text-sm text-[#0D9488]">{t('class.staff.demoClassNote')}</p>
          </div>
        </div>
      ) : null}

      {open ? (
        <div id="class-staff-overview" data-testid="class-staff-overview" className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-600">{t('class.staff.keepOverview')}</p>
          {overview}
          {openRow ? (
            <AssignmentPublish
              key={openRow.id}
              classId={openRow.id}
              className={openRow.demo ? t('class.staff.demoClass') : openRow.name}
              demoClass={openRow.demo}
            />
          ) : null}
          {openRow ? (
            <HomeworkReview
              key={`hw-${openRow.id}`}
              classId={openRow.id}
              classLabel={openRow.demo ? t('class.staff.demoClass') : openRow.name}
              demoClass={openRow.demo}
              sharedRoom={openRow.demo ? null : realRoom}
            />
          ) : null}
        </div>
      ) : null}

      <div data-testid="class-keep-blocks" className="rounded-3xl border border-[#0D9488]/30 bg-white p-4">
        <p className="font-semibold text-[#0D9488]">{t('score.v1.title')}</p>
        <p className="mt-1 text-[#0D9488]">{t('score.v1.bandsTitle')}</p>
        <p className="mt-1 text-[#0D9488]">{t('score.dual.title')}</p>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{t('teacher.keepBlocks')}</p>
    </section>
  )
}
