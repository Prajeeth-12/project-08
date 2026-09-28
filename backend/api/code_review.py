import ast
import json
from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.review import CodeReview

router = APIRouter(prefix="/ai", tags=["AI Code Review & AST Complexity (Member A5)"])

class CodeReviewRequest(BaseModel):
    code: str
    language: str = "python"
    session_id: Optional[str] = None
    submission_id: Optional[str] = None

class CodeReviewResponse(BaseModel):
    review_id: str
    time_complexity: str
    space_complexity: str
    cyclomatic_complexity: int
    max_loop_depth: int
    feedback: str
    code_smells: List[str]
    suggestions: List[str]

class ASTComplexityVisitor(ast.NodeVisitor):
    """AST NodeVisitor computing Cyclomatic Complexity and nested loop depth."""
    def __init__(self):
        self.cyclomatic_complexity = 1
        self.max_loop_depth = 0
        self.current_loop_depth = 0
        self.code_smells = []
        self.has_recursion = False

    def visit_FunctionDef(self, node):
        self.func_name = node.name
        self.generic_visit(node)

    def visit_If(self, node):
        self.cyclomatic_complexity += 1
        self.generic_visit(node)

    def visit_For(self, node):
        self.cyclomatic_complexity += 1
        self.current_loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.current_loop_depth)
        self.generic_visit(node)
        self.current_loop_depth -= 1

    def visit_While(self, node):
        self.cyclomatic_complexity += 1
        self.current_loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.current_loop_depth)
        self.generic_visit(node)
        self.current_loop_depth -= 1

    def visit_ExceptHandler(self, node):
        self.cyclomatic_complexity += 1
        if node.type is None:
            self.code_smells.append("Bare 'except:' clause catches all exceptions including system signals.")
        self.generic_visit(node)

def analyze_ast(source_code: str) -> tuple[str, str, int, int, list[str], list[str], str]:
    """Parse code AST to estimate Big-O complexity and detect anti-patterns."""
    try:
        tree = ast.parse(source_code)
        visitor = ASTComplexityVisitor()
        visitor.visit(tree)

        # Infer Time Complexity from loop nesting
        if visitor.max_loop_depth == 0:
            time_comp = "O(1)"
        elif visitor.max_loop_depth == 1:
            time_comp = "O(N)"
        elif visitor.max_loop_depth == 2:
            time_comp = "O(N^2)"
        else:
            time_comp = f"O(N^{visitor.max_loop_depth})"

        space_comp = "O(1)"
        if "list(" in source_code or "[" in source_code or "dict(" in source_code or "{" in source_code:
            space_comp = "O(N)"

        if visitor.max_loop_depth >= 2:
            visitor.code_smells.append(f"Nested loop detected ({time_comp}). Consider hash table or two-pointer approach to optimize to O(N).")

        suggestions = [
            f"Current estimated time complexity is {time_comp}. Space complexity is {space_comp}.",
            "Ensure input edge cases (empty list, single element, negative numbers) are explicitly guarded.",
        ]
        if visitor.cyclomatic_complexity > 5:
            suggestions.append("High branching complexity detected; refactor helper logic into modular sub-functions.")

        feedback = (
            f"Code passed AST syntax validation. Cyclomatic Complexity is {visitor.cyclomatic_complexity}. "
            f"Estimated runtime bound is {time_comp} with {space_comp} auxiliary memory."
        )

        return time_comp, space_comp, visitor.cyclomatic_complexity, visitor.max_loop_depth, visitor.code_smells, suggestions, feedback

    except SyntaxError as e:
        return "N/A", "N/A", 0, 0, [f"Syntax error on line {e.lineno}: {e.msg}"], ["Fix syntax errors before static AST review"], "AST Parse failed due to syntax error."

@router.post("/code-review", response_model=CodeReviewResponse)
async def review_code(req: CodeReviewRequest, db: AsyncSession = Depends(get_db)):
    """Analyze source code AST for Big-O complexity, cyclomatic density, and code smells."""
    time_comp, space_comp, cyc, loop_depth, smells, suggestions, feedback = analyze_ast(req.code)

    review = CodeReview(
        submission_id=req.submission_id,
        session_id=req.session_id,
        time_complexity=time_comp,
        space_complexity=space_comp,
        cyclomatic_complexity=cyc,
        max_loop_depth=loop_depth,
        feedback=feedback,
        code_smells=json.dumps(smells),
        suggestions=json.dumps(suggestions),
    )
    db.add(review)
    await db.flush()

    return CodeReviewResponse(
        review_id=review.id,
        time_complexity=review.time_complexity,
        space_complexity=review.space_complexity,
        cyclomatic_complexity=review.cyclomatic_complexity,
        max_loop_depth=review.max_loop_depth,
        feedback=review.feedback,
        code_smells=smells,
        suggestions=suggestions,
    )
