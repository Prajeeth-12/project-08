import type { Question } from "../../src/types";

type QuestionBankProps = {
  questions: Question[];
  selectedQuestionId: string | null;
  onSelectQuestion: (question: Question) => void;
};

function QuestionBank({
  questions,
  selectedQuestionId,
  onSelectQuestion,
}: QuestionBankProps) {
  return (
    <div>
      <h2>Questions</h2>

      {questions.map((question) => (
        <button
          key={question.question_id}
          onClick={() => onSelectQuestion(question)}
          style={{
            display: "block",
            width: "100%",
            marginBottom: "8px",
            padding: "10px",
            textAlign: "left",
            cursor: "pointer",
            fontWeight:
              selectedQuestionId === question.question_id
                ? "bold"
                : "normal",
          }}
        >
          <div>{question.title}</div>
          <div>
            {question.topic} · {question.difficulty}
          </div>
        </button>
      ))}
    </div>
  );
}

export default QuestionBank;