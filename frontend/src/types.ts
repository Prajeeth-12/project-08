export type Difficulty = "Easy" | "Medium" | "Hard";

export type SampleTestCase = {
  input: string;
  output: string;
};

export type QuestionExample = {
  input: unknown;
  output: unknown;
};

export type Question = {
  question_id: string;
  title: string;
  description: string;
  topic: string;
  ctc_band: string;
  difficulty: Difficulty;
  constraints: string[];
  examples?: QuestionExample[];
  sample_test_cases: SampleTestCase[];
};

export type AssessmentConfig = {
  ctc_band: string;
  question_count: number;
};