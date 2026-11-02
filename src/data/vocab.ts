/** Oral Cantonese / plain Chinese → DSE Visual Arts exam vocabulary */
export const ORAL_TO_DSE: Record<string, string> = {
  靚: '美感／審美特質 (aesthetic quality)',
  好靚: '具強烈視覺吸引力 (strong visual appeal)',
  亂: '動態構成／視覺張力 (dynamic composition / visual tension)',
  靜: '靜態氣氛／沉思感 (still atmosphere / contemplative mood)',
  光猛: '高對比光影 (high-contrast lighting)',
  暗沉: '低沉色調／陰鬱氣氛 (subdued palette / sombre mood)',
  空蕩蕩: '疏離感／負空間運用 (alienation / use of negative space)',
  真實: '寫實手法 (realist approach)',
  唔真實: '抽象化／表現性處理 (abstraction / expressive treatment)',
  開心: '明快感／正向情緒表達 (buoyant mood / affirmative affect)',
  傷心: '傷感基調／情感張力 (melancholic tone / emotional intensity)',
  粗糙: '質感對比／肌理 (tactile contrast / texture)',
  平滑: '平滑表面／精緻處理 (smooth surface / refined finish)',
  對稱: '對稱構圖 (symmetrical composition)',
  不平衡: '不對稱平衡／視覺張力 (asymmetrical balance)',
  故事感: '敘事性 (narrative quality)',
  好深: '空間深度／層次感 (spatial depth / layering)',
  平面: '平面性／二維強調 (flatness / two-dimensional emphasis)',
  大膽: '強烈視覺衝擊 (strong visual impact)',
  細緻: '細節描寫／精準描繪 (detailed rendering)',
}

export function boostOralText(input: string): { original: string; boosted: string; hits: string[] } {
  let boosted = input
  const hits: string[] = []
  // Longer keys first so 「好靚」 beats 「靚」
  const keys = Object.keys(ORAL_TO_DSE).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (boosted.includes(key)) {
      hits.push(key)
      boosted = boosted.split(key).join(ORAL_TO_DSE[key])
    }
  }
  return { original: input, boosted, hits }
}
