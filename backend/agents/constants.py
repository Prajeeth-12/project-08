# Agent constants
DEFAULT_JOB_ROLE = "the position"
DEFAULT_COMPANY_NAME = "our company"
DEFAULT_VALUE_NOT_PROVIDED = "Not provided"

MINIMUM_QUESTION_COUNT = 3
ESTIMATED_TIME_PER_QUESTION = 3  # minutes

# Error messages
ERROR_AGENT_LOAD_FAILED = "Agent could not be loaded"
ERROR_INITIALIZATION_FAILED = "Initialization failed, no questions generated."
ERROR_INTERVIEW_SETUP = "Sorry, I encountered an error setting up the interview questions."
ERROR_PROCESSING_REQUEST = "Sorry, I encountered an error processing your request. Please try again."
ERROR_INTERVIEW_CONCLUDED = "The interview has already concluded."
INTERVIEW_CONCLUSION = "Thank you for your time. This concludes the interview."

# Logging messages
LOG_GENERATING_QUESTIONS = "Generating initial interview questions..."
LOG_INTERVIEW_INTRODUCTION = "Interview introduction generated."
LOG_INTERVIEW_CONCLUDED = "Interview concluded based on ReAct decision." 