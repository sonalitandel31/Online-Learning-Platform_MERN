const Result = require("../models/resultModel");
const Exam = require("../models/examModel");

//save a result when student submit exam
exports.createResult = async (req, res) => {
  try {
    const { exam, student, answers } = req.body;

    const examData = await Exam.findById(exam);
    if (!examData) return res.status(404).json({ message: "Exam not found" });

    let score = 0;
    examData.questions.forEach((q) => {
      const userAnswer = answers.find(a => a.questionId === q._id.toString());
      if (userAnswer && userAnswer.selectedOption === q.correctAnswer) {
        score += q.marks || 1;
      }
    });

    const result = await Result.create({
      exam,
      student,
      answers,
      score,
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Error saving result:", err);
    res.status(500).json({ message: "Error saving result" });
  }
};

//get result by id
exports.getResultById = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate("exam", "title duration")
      .populate("student", "name email");

    if (!result) return res.status(404).json({ message: "Result not found" });

    res.json(result);
  } catch (err) {
    console.error("Error fetching result:", err);
    res.status(500).json({ message: "Error fetching result" });
  }
};
