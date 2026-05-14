const API = "/api/tasks";

const statusConfig = {
  todo:        { label: "할 일",   badge: "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200" },
  in_progress: { label: "진행 중", badge: "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  done:        { label: "완료",    badge: "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200" },
};
const nextStatus = { todo: "in_progress", in_progress: "done", done: "todo" };

// 현재 편집 중인 카드 ID
const editingIds = new Set();

// ── 다크모드 ──────────────────────────────────────
function initDarkMode() {
  const isDark = localStorage.getItem("theme") === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.getElementById("themeIcon").textContent = isDark ? "☀️" : "🌙";
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  document.getElementById("themeIcon").textContent = isDark ? "☀️" : "🌙";
}

// ── 날짜 유틸 ─────────────────────────────────────
function combineDateTime(dateId, timeId) {
  const date = document.getElementById(dateId).value;
  if (!date) return null;
  const time = document.getElementById(timeId).value;
  // 시간 미입력 시 날짜만 저장
  return time ? `${date} ${time}` : date;
}

// "YYYY-MM-DD HH:MM" → { date: "YYYY-MM-DD", time: "HH:MM" }
function splitDateTime(str) {
  if (!str) return { date: "", time: "" };
  const [date, time = ""] = str.split(" ");
  return { date, time };
}

function formatDateTime(str) {
  if (!str) return null;
  const [datePart, timePart] = str.split(" ");
  const [, month, day] = datePart.split("-");
  // 시간이 있을 때만 표시, 초는 제거
  const time = timePart ? timePart.slice(0, 5) : null;
  return time ? `${parseInt(month)}/${parseInt(day)} ${time}` : `${parseInt(month)}/${parseInt(day)}`;
}

function isOverdue(dueDateStr, status) {
  if (!dueDateStr || status === "done") return false;
  return new Date(dueDateStr.replace(" ", "T")) < new Date();
}

// ── API 호출 ─────────────────────────────────────
async function loadTasks() {
  const res = await fetch(API);
  const tasks = await res.json();
  renderTasks(tasks);
}

async function addTask() {
  const title = document.getElementById("taskTitle").value.trim();
  if (!title) { document.getElementById("taskTitle").focus(); return; }

  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      description: document.getElementById("taskDesc").value.trim() || null,
      start_date:  combineDateTime("taskStartDate", "taskStartTime"),
      due_date:    combineDateTime("taskDueDate",   "taskDueTime"),
    }),
  });

  ["taskTitle", "taskDesc", "taskStartDate", "taskStartTime", "taskDueDate", "taskDueTime"]
    .forEach(id => { document.getElementById(id).value = ""; });
  loadTasks();
}

async function saveTask(id) {
  const title = document.getElementById(`edit-title-${id}`).value.trim();
  if (!title) { document.getElementById(`edit-title-${id}`).focus(); return; }

  await fetch(`${API}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      description: document.getElementById(`edit-desc-${id}`).value.trim() || null,
      start_date:  combineDateTime(`edit-start-date-${id}`, `edit-start-time-${id}`),
      due_date:    combineDateTime(`edit-due-date-${id}`,   `edit-due-time-${id}`),
    }),
  });

  editingIds.delete(id);
  loadTasks();
}

async function changeStatus(id, currentStatus) {
  await fetch(`${API}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: nextStatus[currentStatus] }),
  });
  loadTasks();
}

async function deleteTask(id) {
  await fetch(`${API}/${id}`, { method: "DELETE" });
  editingIds.delete(id);
  loadTasks();
}

function startEdit(id) {
  editingIds.add(id);
  loadTasks();
}

function cancelEdit(id) {
  editingIds.delete(id);
  loadTasks();
}

// ── 렌더링 ────────────────────────────────────────
function renderTasks(tasks) {
  const list = document.getElementById("taskList");

  if (tasks.length === 0) {
    list.innerHTML = `<p class="text-center text-gray-400 dark:text-gray-500 py-10">등록된 업무가 없습니다.</p>`;
    return;
  }

  list.innerHTML = tasks.map(task =>
    editingIds.has(task.id) ? renderEditCard(task) : renderViewCard(task)
  ).join("");
}

// 보기 카드
function renderViewCard(task) {
  const { label, badge } = statusConfig[task.status];
  const overdue = isOverdue(task.due_date, task.status);

  const dateParts = [];
  if (task.start_date)   dateParts.push(`시작 ${formatDateTime(task.start_date)}`);
  if (task.due_date)     dateParts.push(`<span class="${overdue ? "text-red-500 font-semibold" : ""}">마감 ${formatDateTime(task.due_date)}${overdue ? " ⚠" : ""}</span>`);
  if (task.completed_at) dateParts.push(`<span class="text-green-600 dark:text-green-400">완료 ${formatDateTime(task.completed_at)}</span>`);

  return `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-2 transition-colors ${overdue ? "border-l-4 border-red-400" : ""}">
      <div class="flex items-center justify-between gap-3">
        <span class="flex-1 font-semibold text-gray-800 dark:text-gray-100">${escapeHtml(task.title)}</span>
        <button onclick="changeStatus(${task.id}, '${task.status}')"
          class="text-sm px-3 py-1 rounded-full font-semibold ${badge} hover:opacity-80 transition whitespace-nowrap"
        >${label}</button>
        <button onclick="startEdit(${task.id})"
          class="text-blue-400 hover:text-blue-600 text-sm font-semibold transition">수정</button>
        <button onclick="deleteTask(${task.id})"
          class="text-red-400 hover:text-red-600 text-sm font-semibold transition">삭제</button>
      </div>
      ${task.description ? `<p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(task.description)}</p>` : ""}
      ${dateParts.length ? `<div class="text-xs text-gray-400 dark:text-gray-500 flex flex-wrap gap-x-3 gap-y-1">${dateParts.join(" · ")}</div>` : ""}
    </div>
  `;
}

// 편집 카드 (인라인)
function renderEditCard(task) {
  const start = splitDateTime(task.start_date);
  const due   = splitDateTime(task.due_date);

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";

  return `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-3 border-2 border-blue-400 transition-colors">
      <input id="edit-title-${task.id}" type="text" value="${escapeHtml(task.title)}"
        class="${inputCls} font-semibold" placeholder="업무 제목 *" />
      <textarea id="edit-desc-${task.id}" rows="2"
        class="${inputCls} resize-none" placeholder="업무 내용 (선택)">${escapeHtml(task.description || "")}</textarea>

      <div class="space-y-2">
        <label class="text-xs text-gray-500 dark:text-gray-400">시작일시</label>
        <div class="flex gap-2">
          <input id="edit-start-date-${task.id}" type="date" value="${start.date}"
            class="flex-1 ${inputCls}" />
          <input id="edit-start-time-${task.id}" type="time" value="${start.time}"
            class="w-32 ${inputCls}" />
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-xs text-gray-500 dark:text-gray-400">마감일시</label>
        <div class="flex gap-2">
          <input id="edit-due-date-${task.id}" type="date" value="${due.date}"
            class="flex-1 ${inputCls}" />
          <input id="edit-due-time-${task.id}" type="time" value="${due.time}"
            class="w-32 ${inputCls}" />
        </div>
      </div>

      <div class="flex gap-2 pt-1">
        <button onclick="saveTask(${task.id})"
          class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded-lg text-sm font-semibold transition">저장</button>
        <button onclick="cancelEdit(${task.id})"
          class="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-1.5 rounded-lg text-sm font-semibold transition">취소</button>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── 초기화 ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initDarkMode();
  document.getElementById("taskTitle").addEventListener("keydown", e => {
    if (e.key === "Enter") addTask();
  });
  loadTasks();
});
