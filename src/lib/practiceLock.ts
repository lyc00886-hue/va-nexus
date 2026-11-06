/**
 * Practice-paper lock.
 * A question can be answered only when all of these are true:
 * - it is question number 1
 * - content status is "complete"
 * - its id is the paper's primaryQuestionId
 * Questions 2–5 stay locked stubs. No answer fields are rendered for them.
 */
export function isPracticeQuestionOpen(
  question: { id: string; number: number; status: string },
  primaryQuestionId: string,
): boolean {
  return question.number === 1 && question.status === 'complete' && question.id === primaryQuestionId
}
