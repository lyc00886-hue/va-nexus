/**
 * Break opportunities for a unit title.
 * A token never splits a Chinese word or an English word, including a hyphenated word.
 * Joining the tokens restores the original title, including spaces.
 */

const BREAK_AFTER = /[：:、，,。；;！!？?／/—–]/
const CJK_JOIN = /[同与與]/

function isCjk(char: string | undefined): boolean {
  if (!char) return false
  const code = char.codePointAt(0) ?? 0
  return code >= 0x3400 && code <= 0x9fff
}

export function questLabelTokens(text: string): string[] {
  const tokens: string[] = []
  let buf = ''
  const chars = Array.from(text)
  const flush = () => {
    if (!buf) return
    tokens.push(buf)
    buf = ''
  }
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index]
    buf += char
    if (/\s/u.test(char) || BREAK_AFTER.test(char)) {
      flush()
      continue
    }
    if (CJK_JOIN.test(char) && isCjk(chars[index + 1])) flush()
  }
  flush()
  return tokens
}
