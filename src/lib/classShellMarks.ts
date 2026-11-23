/**
 * Door from the class teacher shell to the class mark record.
 * The shell updates first. This route keeps the confirmed sentence with the class.
 */
import { classOwnerId } from './classInvite'
import { adoptClassShellMarks, type HwTeacherMark } from './homeworkSubmit'

const PATH = '/api/class-shell-marks'

type ShellResult = { ok?: boolean; marks?: { id?: unknown; classId?: unknown; mark?: unknown }[] }

function asMarks(rows: ShellResult['marks'], classId: string): HwTeacherMark[] {
  if (!Array.isArray(rows)) return []
  const marks: HwTeacherMark[] = []
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || typeof row.mark !== 'string') continue
    if (row.classId !== classId) continue
    const id = row.id.trim()
    const mark = row.mark.trim()
    if (!id || !mark) continue
    marks.push({ id, classId, mark })
  }
  return marks
}

async function post(body: Record<string, unknown>): Promise<ShellResult | null> {
  try {
    const res = await fetch(PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const parsed = (await res.json()) as ShellResult
    if (!parsed || parsed.ok !== true) return null
    return parsed
  } catch {
    return null
  }
}

export async function pullClassShellMarks(classId: string): Promise<void> {
  const scope = classId.trim()
  if (!scope) return
  const result = await post({ action: 'list', classId: scope, ownerId: classOwnerId() })
  if (!result) return
  adoptClassShellMarks(asMarks(result.marks, scope), scope)
}

export async function pushClassShellMark(classId: string, id: string, mark: string): Promise<void> {
  const scope = classId.trim()
  const cleanId = id.trim()
  const clean = mark.trim()
  if (!scope || !cleanId || !clean) return
  await post({ action: 'confirm', classId: scope, ownerId: classOwnerId(), id: cleanId, mark: clean })
}
