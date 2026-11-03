import { useEffect, useState } from 'react'
import { useGame } from '../../context/GameContext'
import { getUnits } from '../../game/curriculum'
import { getF4Units } from '../../game/f4Demo'
import { isSequentialUnlocked } from '../../game/mediaCatalog'
import { getMediaUnits } from '../../game/mediaIntro'
import { getResearchQuests } from '../../game/research'
import type { Unit } from '../../game/types'
import { t } from '../../i18n'
import { pickEasyEmpty, showOfflineNote } from '../../lib/easyReadMode'
import { FeldmanWriter } from '../FeldmanWriter'
import { MapOneLesson } from '../game/MapOneLesson'
import { EasyReadBar } from './EasyReadBar'
import { EasyReadEmpty } from './EasyReadEmpty'

type Track = 'history' | 'media' | 'f4'

function useOffline(): boolean {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  useEffect(() => {
    const markOn = () => setOffline(false)
    const markOff = () => setOffline(true)
    window.addEventListener('online', markOn)
    window.addEventListener('offline', markOff)
    return () => {
      window.removeEventListener('online', markOn)
      window.removeEventListener('offline', markOff)
    }
  }, [])
  return offline
}

function currentOf(lessons: { id: string; unlocked: boolean; done: boolean }[]) {
  return lessons.find((lesson) => lesson.unlocked && !lesson.done) ?? null
}

export function StepMap() {
  const { state, isUnlocked } = useGame()
  const offline = useOffline()
  const [track, setTrack] = useState<Track>('history')
  const [lessonId, setLessonId] = useState<string | null>(null)
  const completed = (id: string) => Boolean(state.nodes[id]?.completed)

  const history = getUnits()
  const f4 = getF4Units()
  const media = getMediaUnits().filter((unit) => !unit.pending)
  const units: Unit[] = track === 'f4' ? f4 : track === 'media' ? media : history
  const rows = units.flatMap((unit) => {
    const ids = unit.nodes.map((node) => node.id)
    return unit.nodes.map((node) => ({
      lesson: node,
      unlocked: track === 'history' ? isUnlocked(node.id) : isSequentialUnlocked(ids, node.id, completed),
      done: completed(node.id),
    }))
  })
  const open = lessonId ? rows.find((row) => row.lesson.id === lessonId)?.lesson : undefined
  const current = currentOf(rows.map((row) => ({ id: row.lesson.id, unlocked: row.unlocked, done: row.done })))
  const empty = pickEasyEmpty({
    offline,
    hasDownload: rows.length > 0,
    lessonCount: rows.length,
    hasCurrent: Boolean(current),
  })

  if (open) {
    const index = rows.findIndex((row) => row.lesson.id === open.id)
    const next = rows.slice(index + 1).find((row) => row.unlocked && !row.done)
    return (
      <MapOneLesson
        step
        lesson={open}
        exitLabel={t('er.map.back')}
        following={next ? { id: next.lesson.id, open: true } : { id: null, open: false }}
        onExit={() => setLessonId(null)}
        onOpenLesson={setLessonId}
      />
    )
  }

  const unit = current ? units.find((item) => item.nodes.some((node) => node.id === current.id)) : undefined
  const ticks = unit?.nodes ?? []

  return (
    <div data-easy-read="map" className="space-y-4">
      <EasyReadBar />
      {showOfflineNote(offline, rows.length > 0) ? (
        <p className="text-sm font-semibold text-teal-900" role="status">
          {t('er.empty.offline')}
        </p>
      ) : null}
      <div className="inline-flex max-w-full flex-wrap rounded-full bg-slate-100 p-1 ring-1 ring-slate-200" role="tablist" aria-label={t('map.track.aria')}>
        {(['history', 'media', 'f4'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={track === id}
            onClick={() => setTrack(id)}
            className={
              track === id
                ? 'min-h-11 rounded-full bg-white px-4 text-sm font-semibold text-teal-800 shadow'
                : 'min-h-11 rounded-full px-4 text-sm font-medium text-slate-600'
            }
          >
            {t(id === 'history' ? 'map.track.history' : id === 'media' ? 'map.track.media' : 'map.track.f4')}
          </button>
        ))}
      </div>
      <p className="text-sm font-semibold text-teal-800">
        <span className="mr-2 rounded-full bg-teal-700 px-2 py-0.5 text-xs font-bold text-white">{t('er.mode.badge')}</span>
        {t('er.lesson.oneTask')}
      </p>
      {empty ? (
        <EasyReadEmpty kind={empty} />
      ) : current ? (
        <>
          <button
            type="button"
            data-testid="easy-read-continue"
            onClick={() => setLessonId(current.id)}
            className="w-full rounded-3xl border border-teal-100 bg-[#FFF9E9] p-5 text-left"
          >
            <span className="block text-lg font-bold text-slate-900">{rows.find((row) => row.lesson.id === current.id)?.lesson.title}</span>
            <span className="mt-4 block min-h-11 rounded-2xl bg-teal-700 py-3 text-center text-base font-bold text-white">
              {t('er.map.continue')}
            </span>
          </button>
          <ol aria-label={t('er.map.progress')} className="flex flex-wrap gap-2">
            {ticks.map((node) => {
              const row = rows.find((item) => item.lesson.id === node.id)
              const done = Boolean(row?.done)
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    disabled={!row?.unlocked}
                    onClick={() => row?.unlocked && setLessonId(node.id)}
                    className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-bold ${
                      done ? 'bg-teal-700 text-white' : row?.unlocked ? 'bg-white text-teal-900 ring-2 ring-teal-700' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <span className="sr-only">{node.title}</span>
                    {done ? '✓' : ticks.indexOf(node) + 1}
                  </button>
                </li>
              )
            })}
          </ol>
        </>
      ) : null}
    </div>
  )
}

export function StepResearch() {
  const { state } = useGame()
  const offline = useOffline()
  const quests = getResearchQuests()
  const [openId, setOpenId] = useState<string | null>(null)
  const [bench, setBench] = useState(false)
  const done = (id: string) => Boolean(state.quests[id]?.completed)
  const open = quests.find((quest) => quest.id === openId)
  const current = quests.find((quest) => !done(quest.id)) ?? null
  const empty = pickEasyEmpty({
    offline,
    hasDownload: quests.length > 0,
    lessonCount: quests.length,
    hasCurrent: Boolean(current) || quests.some((quest) => done(quest.id)),
  })

  if (open) {
    const index = quests.findIndex((quest) => quest.id === open.id)
    const next = quests.slice(index + 1).find((quest) => !done(quest.id))
    return (
      <MapOneLesson
        step
        kind="quest"
        lesson={open}
        exitLabel={t('er.lesson.leave')}
        following={next ? { id: next.id, open: true } : { id: null, open: false }}
        onExit={() => setOpenId(null)}
        onOpenLesson={setOpenId}
      />
    )
  }

  if (bench) {
    return (
      <div data-easy-read="research-ai" className="space-y-4">
        <button
          type="button"
          onClick={() => setBench(false)}
          className="min-h-11 text-base font-semibold text-teal-800 underline-offset-2 hover:underline"
        >
          {t('er.cta.back')}
        </button>
        <p className="text-sm font-semibold text-teal-800">{t('er.lesson.oneTask')}</p>
        <FeldmanWriter shell="steps" onLater={() => setBench(false)} />
      </div>
    )
  }

  const showEmpty = empty === 'no-lessons' || empty === 'offline' || (empty === 'next-lesson' && !quests.some((quest) => done(quest.id)))

  return (
    <div data-easy-read="research" className="space-y-4">
      <EasyReadBar />
      {showOfflineNote(offline, quests.length > 0) ? (
        <p className="text-sm font-semibold text-teal-900" role="status">
          {t('er.empty.offline')}
        </p>
      ) : null}
      <h2 className="text-2xl font-bold text-slate-900">{t('tab.research')}</h2>
      {showEmpty && empty ? (
        <EasyReadEmpty kind={empty === 'next-lesson' ? 'no-content' : empty} />
      ) : (
        <>
          {current ? (
            <button
              type="button"
              data-testid="easy-read-continue"
              onClick={() => setOpenId(current.id)}
              className="w-full rounded-3xl border border-teal-100 bg-[#FFF9E9] p-5 text-left"
            >
              <span className="block text-lg font-bold text-slate-900">{current.title}</span>
              <span className="mt-4 block min-h-11 rounded-2xl bg-teal-700 py-3 text-center text-base font-bold text-white">
                {t('er.lesson.start')}
              </span>
            </button>
          ) : (
            <EasyReadEmpty kind="next-lesson" />
          )}
          <ol aria-label={t('er.map.progress')} className="flex flex-wrap gap-2">
            {quests.map((quest, index) => (
              <li key={quest.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(quest.id)}
                  className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-bold ${
                    done(quest.id) ? 'bg-teal-700 text-white' : 'bg-white text-teal-900 ring-2 ring-teal-700'
                  }`}
                >
                  <span className="sr-only">{quest.title}</span>
                  {done(quest.id) ? '✓' : index + 1}
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            data-testid="easy-read-ai-tip"
            onClick={() => setBench(true)}
            className="min-h-11 text-base font-semibold text-teal-800 underline-offset-2 hover:underline"
          >
            {t('ai.title')}
          </button>
        </>
      )}
    </div>
  )
}
