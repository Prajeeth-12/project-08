
import type { Question, Difficulty } from "../types";

const API_BASE_URL = "http://127.0.0.1:8000";

type BackendQuestion = {
  question_id: string;
  title: string;
  description: string;
  topic: string;
  ctc_band: string;
  difficulty: string;
  constraints: string[] | string | null;
  examples: {
    input: unknown;
    output: unknown;
  }[] | null;
  sample_test_cases: {
    input: string;
    output: string;
  }[] | null;
};

function normalizeDifficulty(value: string): Difficulty {
  const difficulty = value.toLowerCase();

  if (difficulty === "easy") return "Easy";
  if (difficulty === "hard") return "Hard";

  return "Medium";
}

export async function getQuestions(): Promise<Question[]> {
  const response = await fetch(`${API_BASE_URL}/api/questions`);

  if (!response.ok) {
    throw new Error("Failed to fetch questions");
  }

  const data: BackendQuestion[] = await response.json();

  return data.map((question) => {
    const sampleTestCases = question.sample_test_cases?.length
    ? question.sample_test_cases
    : (question.examples ?? []).map((example) => ({
        input: String(example.input ?? ""),
        output: String(example.output ?? ""),
      }));

    const constraints = Array.isArray(question.constraints)
      ? question.constraints
      : typeof question.constraints === "string"
        ? [question.constraints]
        : [];

    return {
      question_id: String(question.question_id),
      title: question.title,
      description: question.description,
      topic: question.topic,
      ctc_band: question.ctc_band,
      difficulty: normalizeDifficulty(question.difficulty),
      constraints,
      examples: question.examples ?? [],
      sample_test_cases: sampleTestCases,
    };
  });
}
