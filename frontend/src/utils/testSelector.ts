import { questions } from "../data/questions";
import { selectQuestions } from "./questionSelector";

const config = {
  ctc_band: "10_LPA",
  question_count: 5,
};

const selectedQuestions = selectQuestions(questions, config);

console.log("Selected Questions:");

for (const question of selectedQuestions) {
  console.log(
    question.question_id,
    "|",
    question.topic,
    "|",
    question.difficulty
  );
}