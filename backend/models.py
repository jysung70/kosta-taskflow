from pydantic import BaseModel
from typing import Literal, Optional

# 업무 상태 타입
TaskStatus = Literal["todo", "in_progress", "done"]

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: Optional[str] = None   # YYYY-MM-DD
    due_date: Optional[str] = None     # YYYY-MM-DD

class TaskUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: TaskStatus

class TaskResponse(BaseModel):
    id: int
    title: str
    status: TaskStatus
    description: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str
