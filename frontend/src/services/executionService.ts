export type ExecutionTestCase = {
  input: string;
  expected_output: string;
};

export type RunRequest = {
  question_id: string;
  language: string;
  source_code: string;
  test_cases: ExecutionTestCase[];
};
export type SubmitRequest = {
  question_id: string;
  language: string;
  source_code: string;
};

export type TestCaseResult = {
  test_case: number;
  status: string;
  actual_output?: string;
};

export type RunResponse = {
  status: string;
  passed: boolean;
  total_test_cases: number;
  passed_test_cases: number;
  results: TestCaseResult[];
  error?: string;
  compiler_output?: string;
};
export type SubmitResponse = RunResponse;
export async function runCode(
  request: RunRequest
): Promise<RunResponse> {
  const response = await fetch(
    "http://127.0.0.1:8000/api/execution/run",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(`Execution failed: ${response.status}`);
  }

  return response.json();
}
export async function submitCode(
  request: SubmitRequest
): Promise<SubmitResponse> {
    const response = await fetch(
    "http://127.0.0.1:8000/api/execution/submit",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(`Submission failed: ${response.status}`);
  }

  return response.json();
}