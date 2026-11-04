import bank from '../src/content/socratic-zh-hk.json' with { type: 'json' }

/** Feldman API stages. `analyze` matches /api/feedback; the short name is 分析. */
export type SocraticStage = 'describe' | 'analyze' | 'interpret' | 'judge'

type Cue = { id: string; ask: string }

type StageBank = {
  name: string
  goal: string
  questions: Cue[]
  probes: string[]
  frame: string
  dont: string
}

const STAGES = bank.stages as Record<SocraticStage, StageBank>

const HOOKS: Record<SocraticStage, Array<{ re: RegExp; probe: number }>> = {
  describe: [{ re: /靚|鮮|色|醜|差/, probe: 0 }],
  analyze: [{ re: /亂|乱/, probe: 1 }],
  interpret: [{ re: /孤獨|孤独|感覺|感觉/, probe: 0 }],
  judge: [{ re: /靚|準則|准则/, probe: 0 }],
}

export function socraticStageBank(stage: SocraticStage): StageBank {
  return STAGES[stage]
}

export function socraticStageNames(): Record<SocraticStage, string> {
  return {
    describe: STAGES.describe.name,
    analyze: STAGES.analyze.name,
    interpret: STAGES.interpret.name,
    judge: STAGES.judge.name,
  }
}

/**
 * One cue for this turn. Short notes start at Q1.
 * A value-word hook, or a longer note, gets a single probe.
 * The rest of the bank stays on the server.
 */
export function pickSocraticCue(stage: SocraticStage, text: string): Cue {
  const stageBank = STAGES[stage]
  const trimmed = text.trim()
  const hook = HOOKS[stage].find((item) => item.re.test(trimmed))
  if (hook) {
    const ask = stageBank.probes[hook.probe] ?? stageBank.probes[0]
    return { id: `${stage}-probe-${hook.probe}`, ask }
  }
  if (trimmed.length < 18) return stageBank.questions[0]
  return { id: `${stage}-probe-0`, ask: stageBank.probes[0] }
}
