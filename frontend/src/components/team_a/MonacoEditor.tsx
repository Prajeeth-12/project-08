import { useEffect, useRef, useState } from "react";
import "./MonacoEditor.css";
import Editor, { type OnMount } from "@monaco-editor/react";
const languages = [
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
  { label: "Java", value: "java" },
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
];
type MonacoEditorProps = {
  userId: string;
  sessionId: string;
  questionId: string;
  onCodeChange: (code: string, language: string) => void;
};

function MonacoEditor({
  userId,
  sessionId,
  questionId,
  onCodeChange,
}: MonacoEditorProps) {
  const [language, setLanguage] = useState("cpp");

const [codeByQuestionAndLanguage, setCodeByQuestionAndLanguage] =
  useState<Record<string, Record<string, string>>>({});

const draftIdByQuestionAndLanguage = useRef<Record<string, Record<string, string>>>({});


 const sourceCode = codeByQuestionAndLanguage[questionId]?.[language] ?? "";
  useEffect(() => {
  if (!sourceCode) {
    return;
  }

  const timer = setTimeout(async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/code/drafts",  
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            draft_id:
              draftIdByQuestionAndLanguage.current[questionId]?.[language] ??
              null,
            user_id: userId,
            session_id: sessionId,
            question_id: questionId,
            language,
            source_code: sourceCode,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Auto-save failed: ${response.status}`);
      }

      const draft = await response.json();

      if (!draftIdByQuestionAndLanguage.current[questionId]) {
        draftIdByQuestionAndLanguage.current[questionId] = {};
      }

      draftIdByQuestionAndLanguage.current[questionId][language] =
        draft.id;

      console.log("Draft auto-saved:", draft);
    } catch (error) {
      console.error("Failed to auto-save draft:", error);
    }
  }, 300);

  return () => clearTimeout(timer);
}, [sourceCode, language, userId, sessionId, questionId]);
const handleLanguageChange = (nextLanguage: string) => {
  setLanguage(nextLanguage);

  // Immediately update the parent component
  onCodeChange(sourceCode, nextLanguage);
};

  const handleEditorChange = (value: string | undefined) => {
  const newCode = value ?? "";

  setCodeByQuestionAndLanguage((previous) => ({
    ...previous,
    [questionId]: {
      ...previous[questionId],
      [language]: newCode,
    },
  }));

  onCodeChange(newCode, language);
};
const handleEditorMount = (editorInstance: any) => {
  const editorElement = editorInstance.getDomNode();

  if (!editorElement) {
    return;
  }

  const blockPaste = (event: ClipboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const blockDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const blockKeyboardPaste = (event: KeyboardEvent) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "v"
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  editorElement.addEventListener("paste", blockPaste);
  editorElement.addEventListener("drop", blockDrop);
  editorElement.addEventListener("keydown", blockKeyboardPaste);

  return () => {
    editorElement.removeEventListener("paste", blockPaste);
    editorElement.removeEventListener("drop", blockDrop);
    editorElement.removeEventListener("keydown", blockKeyboardPaste);
  };
};
return (
  <div className="editor-container">
    <div className="editor-toolbar">
      <label htmlFor="language">Language:</label>

      <select
        id="language"
        value={language}
        onChange={(event) => handleLanguageChange(event.target.value)}
      >
        {languages.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>

    <div className="editor-wrapper">
      <Editor
        height="500px"
        language={language}
        onMount={handleEditorMount}
        value={sourceCode}
        theme="vs-dark"
        onChange={handleEditorChange}
        options={{
          minimap: {
            enabled: true,
          },
          fontSize: 16,
          automaticLayout: true,
          dragAndDrop: false,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          parameterHints: {
            enabled: false,
          },
          wordBasedSuggestions: "off",
          inlineSuggest: {
            enabled: false,
          },
        }}
      />
    </div>
  </div>
);
}
export default MonacoEditor;