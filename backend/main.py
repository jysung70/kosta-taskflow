from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import init_db, get_conn
from models import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskResponse
from typing import List
from datetime import datetime
import os

app = FastAPI(title="TaskFlow API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

# 업무 목록 조회
@app.get("/api/tasks", response_model=List[TaskResponse])
def get_tasks():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM tasks ORDER BY created_at DESC").fetchall()
    return [dict(row) for row in rows]

# 업무 추가
@app.post("/api/tasks", response_model=TaskResponse, status_code=201)
def create_task(body: TaskCreate):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO tasks (title, description, start_date, due_date) VALUES (?, ?, ?, ?)",
            (body.title, body.description, body.start_date, body.due_date),
        )
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)

# 업무 내용 수정 (제목, 내용, 시작일, 마감일)
@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, body: TaskUpdate):
    with get_conn() as conn:
        affected = conn.execute(
            "UPDATE tasks SET title = ?, description = ?, start_date = ?, due_date = ? WHERE id = ?",
            (body.title, body.description, body.start_date, body.due_date, task_id),
        ).rowcount
        if affected == 0:
            raise HTTPException(status_code=404, detail="업무를 찾을 수 없습니다")
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return dict(row)

# 업무 상태 변경 (done 으로 변경 시 완료일 자동 기록)
@app.patch("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task_status(task_id: int, body: TaskStatusUpdate):
    completed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S") if body.status == "done" else None
    with get_conn() as conn:
        affected = conn.execute(
            "UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?",
            (body.status, completed_at, task_id),
        ).rowcount
        if affected == 0:
            raise HTTPException(status_code=404, detail="업무를 찾을 수 없습니다")
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return dict(row)

# 업무 삭제
@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: int):
    with get_conn() as conn:
        affected = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,)).rowcount
        if affected == 0:
            raise HTTPException(status_code=404, detail="업무를 찾을 수 없습니다")

# 프론트엔드 정적 파일 서빙
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
