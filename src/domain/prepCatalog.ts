import type { PrepCatalog, PrepCatalogItem, PrepQuestion } from './types'

export function upsertPrepItem(
  catalog: PrepCatalog,
  name: string,
  prepMinutes: number | null,
  source: PrepCatalogItem['source'],
): PrepCatalog {
  const now = Date.now()
  const existing = catalog.items.find((i) => i.name.toLowerCase() === name.toLowerCase())
  const items = existing
    ? catalog.items.map((i) =>
        i.id === existing.id ? { ...i, prepMinutes, source, updatedAt: now, name } : i,
      )
    : [
        ...catalog.items,
        {
          id: `prep-${now}-${Math.floor(Math.random() * 1000)}`,
          name,
          prepMinutes,
          source,
          updatedAt: now,
        },
      ]

  const openQuestions =
    prepMinutes == null
      ? ensureQuestion(catalog.openQuestions, name)
      : catalog.openQuestions.filter((q) => q.itemName.toLowerCase() !== name.toLowerCase())

  return { items, openQuestions }
}

function ensureQuestion(questions: PrepQuestion[], itemName: string): PrepQuestion[] {
  if (questions.some((q) => q.itemName.toLowerCase() === itemName.toLowerCase())) return questions
  return [
    ...questions,
    {
      id: `q-${Date.now()}`,
      itemName,
      askedAt: Date.now(),
      prompt: `How many minutes does "${itemName}" take to prepare in the kitchen?`,
    },
  ]
}

export function answerPrepQuestion(
  catalog: PrepCatalog,
  questionId: string,
  prepMinutes: number,
): PrepCatalog {
  const question = catalog.openQuestions.find((q) => q.id === questionId)
  if (!question) return catalog
  return upsertPrepItem(catalog, question.itemName, prepMinutes, 'admin')
}
