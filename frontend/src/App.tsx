import { useEffect, useRef, useState } from "react";

  import "./App.css";
  import {
    runCode,
    submitCode,
    type RunResponse,
    type SubmitResponse,
  } from "./services/executionService";
  import MonacoEditor from "../components/team_a/MonacoEditor";
  import QuestionBank from "../components/team_a/QuestionBank";
  import { getQuestions } from "./services/questionService";
  import { selectQuestions } from "./utils/questionSelector";
  import type { Question } from "./types";
function formatExampleValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => formatExampleValue(item)).join(", ")}]`;
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${key}: ${formatExampleValue(val)}`)
      .join("\n");
  }

  if (typeof value === "string") {
    return value;
  }

  return String(value);
}
  function App() {
    const [isFullscreen, setIsFullscreen] = useState(false);      
    const [assessmentStarted, setAssessmentStarted] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(150 * 60);
    const [assessmentEnded, setAssessmentEnded] = useState(false);
    const [fullscreenViolations, setFullscreenViolations] = useState(0);
    const [assessmentBlocked, setAssessmentBlocked] = useState(false);
    const [runResult, setRunResult] = useState<RunResponse | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentCode, setCurrentCode] = useState("");
    const [currentLanguage, setCurrentLanguage] = useState("cpp");
    const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    // const [isPageVisible, setIsPageVisible] = useState(true);
    // const visibilityViolationRef = useRef(false);
    const [showViolationPopup, setShowViolationPopup] = useState(false);
    const [popupType, setPopupType] = useState<"fullscreen" | "violation" | null>(null);
    const windowBlurRef = useRef(false);
    useEffect(() => {
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (
      assessmentStarted &&
      !assessmentEnded &&
      !assessmentBlocked
    ) {
      event.preventDefault();
      event.returnValue = "";
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, [
  assessmentStarted,
  assessmentEnded,
  assessmentBlocked,
]);
    useEffect(() => {
  const handleBlur = () => {
    if (
      !assessmentStarted ||
      assessmentEnded ||
      assessmentBlocked
    ) {
      return;
    }

    // if (document.hidden) {
    //   return;
    // }

    windowBlurRef.current = true;
  };

  const handleFocus = () => {
    if (!windowBlurRef.current) {
      return;
    }

    windowBlurRef.current = false;

    if (
      assessmentStarted &&
      !assessmentEnded &&
      !assessmentBlocked
    ) {
      setFullscreenViolations((previous) => {
        const newCount = previous + 1;

        if (newCount > 3) {
          setAssessmentBlocked(true);
        }

        return newCount;
      });

      setPopupType("violation");
      setShowViolationPopup(true);
    }
  };

  window.addEventListener("blur", handleBlur);
  window.addEventListener("focus", handleFocus);

  return () => {
    window.removeEventListener("blur", handleBlur);
    window.removeEventListener("focus", handleFocus);
  };
}, [
  assessmentStarted,
  assessmentEnded,
  assessmentBlocked,
]);
// useEffect(() => {
//   const handleVisibilityChange = () => {
//     if (!document.hidden) {
//       setIsPageVisible(true);
//       visibilityViolationRef.current = false;
//       return;
//     }

//     setIsPageVisible(false);

//     if (
//       assessmentStarted &&
//       !assessmentEnded &&
//       !assessmentBlocked
//     ) {
//       visibilityViolationRef.current = true;

//       setFullscreenViolations((previous) => {
//         const newCount = previous + 1;

//         if (newCount > 3) {
//           setAssessmentBlocked(true);
//         }

//         return newCount;
//       });
//     }
//   };

//   document.addEventListener(
//     "visibilitychange",
//     handleVisibilityChange
//   );

//   return () => {
//     document.removeEventListener(
//       "visibilitychange",
//       handleVisibilityChange
//     );
//   };
// }, [
//   assessmentStarted,
//   assessmentEnded,
//   assessmentBlocked,
// ]);
useEffect(() => {
  async function loadQuestions() {
    try {
      const allQuestions = await getQuestions();

      console.log("Questions received:", allQuestions.length);

      console.log("First question:", allQuestions[0]);

      console.log(
        "Difficulty counts:",
        allQuestions.reduce(
          (counts, question) => {
            counts[question.difficulty] =
              (counts[question.difficulty] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>
        )
      );

      const questionsForAssessment = selectQuestions(allQuestions, {
        ctc_band: "Above 10 LPA",
        question_count: 5,
      });

      setSelectedQuestions(questionsForAssessment);
      console.log("Selected questions:", questionsForAssessment);

console.log(
  "Selected difficulty counts:",
  questionsForAssessment.reduce(
    (counts, question) => {
      counts[question.difficulty] =
        (counts[question.difficulty] || 0) + 1;

      return counts;
    },
    {} as Record<string, number>
  )
);

console.log(
  "Unique question IDs:",
  new Set(
    questionsForAssessment.map(q => q.question_id)
  ).size
);

      if (questionsForAssessment.length > 0) {
        setCurrentQuestion(questionsForAssessment[0]);
      }
    } catch (error) {
      console.error("Failed to load questions:", error);
    }
  }

  loadQuestions();
}, []);   useEffect(() => {
  if (!assessmentStarted || assessmentEnded || assessmentBlocked) {
    return;
  }

  if (timeRemaining <= 0) {
    setAssessmentEnded(true);
    return;
  }

  const timer = setInterval(() => {
    setTimeRemaining((previous) => previous - 1);
  }, 1000);

  return () => clearInterval(timer);
}, [
  assessmentStarted,
  assessmentEnded,
  assessmentBlocked,
  timeRemaining,
]);
useEffect(() => {
  const handleFullscreenChange = () => {
    const fullscreen = document.fullscreenElement !== null;

    setIsFullscreen(fullscreen);

    if (
      assessmentStarted &&
      !fullscreen &&
      !assessmentEnded &&
      !assessmentBlocked
    ) {
      setPopupType("fullscreen");
      setShowViolationPopup(true);
    }
  };

  document.addEventListener(
    "fullscreenchange",
    handleFullscreenChange
  );

  return () => {
    document.removeEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );
  };
}, [
  assessmentStarted,
  assessmentEnded,
  assessmentBlocked,
]);
const startAssessment = async () => {
  try {
    await document.documentElement.requestFullscreen();
    setIsFullscreen(true);
    setAssessmentStarted(true);
  } catch (error) {
    console.error("Failed to start assessment:", error);
  }
};
const enterFullscreen = async () => {
  try {
    await document.documentElement.requestFullscreen();

    setIsFullscreen(true);
    setShowViolationPopup(false);
    setPopupType(null);
  } catch (error) {
    console.error("Failed to enter fullscreen:", error);
  }
};
const exitFullscreen = async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }

    setIsFullscreen(false);
  } catch (error) {
    console.error("Failed to exit fullscreen:", error);
  }
};
const handleRun = async () => {
  if (!currentQuestion) {
    return;
  }

  if (!currentCode.trim()) {
    return;
  }

  setIsRunning(true);
  setRunResult(null);
  setSubmitResult(null);

  try {
    const result = await runCode({
      question_id: currentQuestion.question_id,
      language: currentLanguage,
      source_code: currentCode,
      test_cases: currentQuestion.sample_test_cases.map(
        (testCase) => ({
          input: testCase.input,
          expected_output: testCase.output,
        })
      ),
    });

    setRunResult(result);
  } catch (error) {
    console.error("Run failed:", error);
  } finally {
    setIsRunning(false);
  }
};
const handleEndAssessment = () => {
  const confirmed = window.confirm(
    "Are you sure you want to end and submit the assessment?"
  );

  if (!confirmed) {
    return;
  }

  setAssessmentEnded(true);
};
const handleSubmit = async () => {
  if (!currentQuestion) {
    return;
  }

  if (!currentCode.trim()) {
    return;
  }

  setIsSubmitting(true);
  setSubmitResult(null);
  setRunResult(null);

  try {
    const result = await submitCode({
      question_id: currentQuestion.question_id,
      language: currentLanguage,
      source_code: currentCode,
    });

    setSubmitResult(result);
  } catch (error) {
    console.error("Submission failed:", error);
  } finally {
    setIsSubmitting(false);
  }
};
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
  // const [timeRemaining, setTimeRemaining] = useState(120 * 60);
  // const [assessmentEnded, setAssessmentEnded] = useState(false);
return (
  <div className="assessment-app">
    {!assessmentStarted ? (
      <div className="start-screen">
        <div className="start-card">
          <div className="project-label">
            08 · PROJECT 08
          </div>

          <h1>Coding Assessment</h1>

          <p>
            Complete the coding assessment within 150 minutes.
            Your progress will be automatically saved.
          </p>

          <button
            className="primary-button"
            onClick={startAssessment}
          >
            Start Assessment
          </button>
        </div>
      </div>
    ) : assessmentBlocked ? (
      <div className="end-screen">
        <div className="end-card">
          <h1>Assessment Blocked</h1>

          <p>
            You exceeded the maximum number of fullscreen
            violations.
          </p>

          <p>
            Your assessment has been terminate.
          </p>
        </div>
      </div>
    ) : assessmentEnded ? (
      <div className="end-screen">
        <div className="end-card">
          <h1>Assessment Ended</h1>

          <p>
            Your assessment has been completed.
          </p>
        </div>
      </div>
    ) : (
      <>
        <header className="assessment-header">
          <div className="brand">
            <div className="brand-mark">
              08
            </div>

            <div className="brand-divider" />

            <div className="assessment-title">
              PROJECT 08 · CODING ASSESSMENT
            </div>
          </div>

          <div className="header-right">
                            <button
  className="end-button"
  onClick={handleEndAssessment}
>
  End Assessment
</button>
<div
  className={`timer ${
    timeRemaining <= 5 * 60
      ? "timer-critical"
      : timeRemaining <= 15 * 60
      ? "timer-warning"
      : ""
  }`}
>
  <span className="timer-icon">⏱</span>
  <span>{formattedTime}</span>
</div>
          </div>
        </header>

        <main className="workspace">
          <aside className="question-sidebar">
            <div className="sidebar-heading-row">
              <div className="sidebar-heading">
                QUESTIONS
              </div>

              <span className="question-count">
                {selectedQuestions.length}
              </span>
            </div>

            <div className="question-list">
              {selectedQuestions.map((question, index) => (
                <button
                key={question.question_id}
                className={`question-item ${
                  currentQuestion?.question_id === question.question_id
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setCurrentQuestion(question);
                  setRunResult(null);
                  setSubmitResult(null);
                }}
              >
                <div className="question-top-row">
                  <span className="question-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className={`difficulty-dot ${question.difficulty.toLowerCase()}`} />
                </div>

                <div className="question-name">
                  {question.title}
                </div>

                <div className="question-meta">
                  {question.topic} · {question.difficulty}
                </div>
              </button>
              ))}
            </div>
          </aside>

          <section className="content-area">
            <h1>Assessment</h1>

            {showViolationPopup && (
<div className="fullscreen-overlay">
  <div className="fullscreen-modal">
    <div className="warning-icon">
      ⚠
    </div>

    {popupType === "fullscreen" ? (
      <>
        <h2>Fullscreen Required</h2>

        <p>
          You exited fullscreen mode.
          Please return to fullscreen mode to continue
          the assessment.
        </p>

        <button
          className="primary-button"
          onClick={enterFullscreen}
        >
          Enter Fullscreen
        </button>
      </>
    ) : (
      <>
        <h2>Warning</h2>

        <p>
          You switched away from the assessment window.
        </p>

        <div className="violation-count">
          Fullscreen violations: {fullscreenViolations} / 3
        </div>

        <p>
          Please remain in the assessment window.
          Further violations may terminate the assessment.
        </p>

        <button
          className="primary-button"
          onClick={enterFullscreen}
        >
          Return to Assessment
        </button>
      </>
    )}
  </div>
</div>
            )}

            {isFullscreen && currentQuestion && (
              <>
                <div className="question-header">
                  <h1>{currentQuestion.title}</h1>

                  <div className="question-meta-large">
                    <span>
                      {currentQuestion.topic}
                    </span>

                    <span>•</span>

                    <span className="badge">
                      {currentQuestion.difficulty}
                    </span>
                  </div>
                </div>

<div className="description-card">
  <p>
    {currentQuestion.description}
  </p>
</div>

<div className="examples-section">
  <div className="section-title">
    Examples
  </div>

  <div className="examples-grid">
{(currentQuestion.examples ?? []).map((example, index) => (      <div className="example-card" key={index}>
        <h4>
          EXAMPLE{" "}
          {String(index + 1).padStart(2, "0")}
        </h4>

        <div className="example-label">
          Input
        </div>

<pre className="example-code">
  {formatExampleValue(example.input)}
</pre>

        <div className="example-label">
          Output
        </div>

<pre className="example-code">
  {formatExampleValue(example.output)}
</pre>
      </div>
    ))}
  </div>
</div>
                <div className="constraints">
                  <div className="section-title">
                    Constraints
                  </div>

                  <ul>
                    {currentQuestion.constraints.map(
                      (constraint, index) => (
                        <li key={index}>
                          {constraint}
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div className="sample-section">
                  <div className="section-title">
                    Sample Test Cases
                  </div>

                  <div className="sample-grid">
                    {currentQuestion.sample_test_cases.map(
                      (testCase, index) => (
                        <div
                          className="sample-card"
                          key={index}
                        >
                          <h4>
                            TEST CASE{" "}
                            {String(index + 1).padStart(
                              2,
                              "0"
                            )}
                          </h4>

                          <div className="sample-label">
                            Input
                          </div>
<pre className="example-code">
  {formatExampleValue(testCase.input)}
</pre>
                          <div className="sample-label">
                            Expected Output
                          </div>

                        <pre className="example-code">
  {formatExampleValue(testCase.output)}
</pre>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="editor-card">
                  <div className="editor-header">
                    <span className="editor-language">
                      {currentLanguage.toUpperCase()}
                    </span>

                    <span className="editor-status">
                      ✓ Draft
                    </span>
                  </div>

                  <MonacoEditor
                    userId="00000000-0000-0000-0000-000000000001"
                    sessionId="00000000-0000-0000-0000-000000000002"
                    questionId={
                      currentQuestion.question_id
                    }
                    onCodeChange={(code, language) => {
                      setCurrentCode(code);
                      setCurrentLanguage(language);
                      setRunResult(null);
                      setSubmitResult(null);
                    }}
                  />
                </div>

                <div className="action-bar">
                  <button
                    className="run-button"
                    onClick={handleRun}
                    disabled={isRunning}
                  >
                    {isRunning
                      ? "Running..."
                      : "▶ Run"}
                  </button>

                  <button
                    className="submit-button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : "Submit Solution"}
                  </button>
                </div>
                {runResult && (
                  <div className="result-card">
                    <div className="result-header">
                      <h3>Run Result</h3>

                      <span
                        className={
                          runResult.passed
                            ? "result-success"
                            : "result-failure"
                        }
                      >
                        {runResult.passed
                          ? "✓ PASSED"
                          : "✕ FAILED"}
                      </span>
                    </div>

                    <p>
                      Passed{" "}
                      {runResult.passed_test_cases} /{" "}
                      {runResult.total_test_cases} test
                      cases
                    </p>

                    {runResult.results.map(
                      (result) => (
                        <div
                          className="test-result"
                          key={result.test_case}
                        >
                          <span>
                            Test Case{" "}
                            {result.test_case}
                          </span>

                          <strong>
                            {result.status}
                          </strong>
                        </div>
                      )
                    )}

                    {runResult.error && (
                      <pre className="result-output">
                        {runResult.error}
                      </pre>
                    )}

                    {runResult.compiler_output && (
                      <pre className="result-output">
                        {runResult.compiler_output}
                      </pre>
                    )}
                  </div>
                )}

                {submitResult && (
                  <div className="result-card">
                    <div className="result-header">
                      <h3>
                        Submission Result
                      </h3>

                      <span
                        className={
                          submitResult.passed
                            ? "result-success"
                            : "result-failure"
                        }
                      >
                        {submitResult.passed
                          ? "✓ PASSED"
                          : "✕ FAILED"}
                      </span>
                    </div>

                    <p>
                      Passed{" "}
                      {submitResult.passed_test_cases} /{" "}
                      {submitResult.total_test_cases} test
                      cases
                    </p>

                    {submitResult.results.map(
                      (result) => (
                        <div
                          className="test-result"
                          key={result.test_case}
                        >
                          <span>
                            Test Case{" "}
                            {result.test_case}
                          </span>

                          <strong>
                            {result.status}
                          </strong>
                        </div>
                      )
                    )}

                    {submitResult.error && (
                      <pre className="result-output">
                        {submitResult.error}
                      </pre>
                    )}

                    {submitResult.compiler_output && (
                      <pre className="result-output">
                        {submitResult.compiler_output}
                      </pre>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      </>
    )}
  </div>
);
  }
export default App;