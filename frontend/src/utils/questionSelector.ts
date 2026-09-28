import type { AssessmentConfig, Difficulty, Question } from "../types";

const difficultyDistribution: Record<Difficulty, number> = {
  Easy: 0.2,
  Medium: 0.6,
  Hard: 0.2,
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function groupByTopic(questions: Question[]): Map<string, Question[]> {
  const groups = new Map<string, Question[]>();

  for (const question of questions) {
    if (!groups.has(question.topic)) {
      groups.set(question.topic, []);
    }

    groups.get(question.topic)!.push(question);
  }

  return groups;
}

function roundRobinSelect(
  questions: Question[],
  count: number
): Question[] {
  const groups = groupByTopic(questions);
  const topics = shuffle(Array.from(groups.keys()));

  const selected: Question[] = [];
  const indexes = new Map<string, number>();

  for (const topic of topics) {
    indexes.set(topic, 0);
  }

  while (selected.length < count && topics.length > 0) {
    let addedInRound = false;

    for (const topic of topics) {
      if (selected.length >= count) {
        break;
      }

      const topicQuestions = groups.get(topic)!;
      const index = indexes.get(topic)!;

      if (index < topicQuestions.length) {
        selected.push(topicQuestions[index]);
        indexes.set(topic, index + 1);
        addedInRound = true;
      }
    }

    if (!addedInRound) {
      break;
    }
  }

  return selected;
}

function getDifficultyCount(
  total: number,
  difficulty: Difficulty
): number {
  return Math.floor(total * difficultyDistribution[difficulty]);
}

export function selectQuestions(
  questions: Question[],
  config: AssessmentConfig
): Question[] {
  // CTC is informational only.
  // All questions from the question bank are eligible.
  const eligibleQuestions = questions;

  if (eligibleQuestions.length < config.question_count) {
    throw new Error(
      `Not enough questions available. Requested ${config.question_count}, but only ${eligibleQuestions.length} questions exist.`
    );
  }

  const selected: Question[] = [];

  const difficulties: Difficulty[] = [
    "Easy",
    "Medium",
    "Hard",
  ];

  for (const difficulty of difficulties) {
    const requiredCount = getDifficultyCount(
      config.question_count,
      difficulty
    );

    const difficultyQuestions = eligibleQuestions.filter(
      (question) => question.difficulty === difficulty
    );

    const shuffled = shuffle(difficultyQuestions);

    const difficultySelected = roundRobinSelect(
      shuffled,
      requiredCount
    );

    selected.push(...difficultySelected);
  }

  const remainingCount =
    config.question_count - selected.length;

  if (remainingCount > 0) {
    const alreadySelected = new Set(
      selected.map((question) => question.question_id)
    );

    const remainingQuestions = eligibleQuestions.filter(
      (question) => !alreadySelected.has(question.question_id)
    );

    selected.push(
      ...roundRobinSelect(
        shuffle(remainingQuestions),
        remainingCount
      )
    );
  }

  return shuffle(selected).slice(0, config.question_count);
}