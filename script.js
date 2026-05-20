const PRIORITY_LABEL = { high: '높음', medium: '중간', low: '낮음' };
const PRIORITY_NEXT  = { high: 'medium', medium: 'low', low: 'high' };
const PRIORITIES = ['high', 'medium', 'low'];

let dragSrcId = null;
let currentSession = null;
let currentMode = 'login';

// ===== Auth =====

function onSignedIn(session) {
  currentSession = session;
  document.getElementById('auth-overlay').style.display = 'none';
  document.querySelector('main').style.display = '';
  document.getElementById('nav-user').classList.remove('hide');
  document.getElementById('nav-email').textContent = session.user.email;
  renderTodos();
}

function onSignedOut() {
  currentSession = null;
  document.getElementById('auth-overlay').style.display = '';
  document.querySelector('main').style.display = 'none';
  document.getElementById('nav-user').classList.add('hide');
  document.getElementById('todo-list').innerHTML = '';
}

function setAuthMode(mode) {
  currentMode = mode;
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-signup').classList.toggle('active', mode === 'signup');
  document.getElementById('auth-submit-btn').textContent = mode === 'login' ? '로그인' : '회원가입';
  document.getElementById('auth-message').classList.add('hide');
}

function showAuthMessage(text, type) {
  const el = document.getElementById('auth-message');
  el.textContent = text;
  el.className = `auth-message ${type}`;
}

async function handleAuthSubmit() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) {
    showAuthMessage('이메일과 비밀번호를 입력해주세요.', 'error');
    return;
  }

  const btn = document.getElementById('auth-submit-btn');
  btn.disabled = true;

  if (currentMode === 'login') {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) showAuthMessage(error.message, 'error');
    btn.disabled = false;
  } else {
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) {
      showAuthMessage(error.message, 'error');
    } else if (!data.session) {
      showAuthMessage('확인 이메일이 발송되었습니다. 이메일을 확인해주세요.', 'info');
    }
    btn.disabled = false;
  }
}

db.auth.onAuthStateChange((event, session) => {
  if (session) onSignedIn(session);
  else onSignedOut();
});

async function loadTodos() {
  const { data, error } = await db
    .from('todos')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

async function saveTodos(todos) {
  const rows = todos.map((t, i) => ({ ...t, sort_order: i }));
  const { error } = await db.from('todos').upsert(rows);
  if (error) console.error(error);
}

function clearDragState() {
  document.querySelectorAll('.drop-indicator-before, .drop-indicator-after')
    .forEach(el => el.classList.remove('drop-indicator-before', 'drop-indicator-after'));
  document.querySelectorAll('.group-list.drag-over')
    .forEach(el => el.classList.remove('drag-over'));
}

async function renderTodos() {
  const todos = await loadTodos();
  const container = document.getElementById('todo-list');
  container.innerHTML = '';

  PRIORITIES.forEach(priority => {
    const card = document.createElement('div');
    card.className = 'card priority-group z-depth-1';

    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';

    const header = document.createElement('span');
    header.className = `group-header group-header-${priority}`;
    header.textContent = PRIORITY_LABEL[priority];

    const ul = document.createElement('ul');
    ul.className = 'collection group-list';

    ul.addEventListener('dragover', (e) => {
      e.preventDefault();
      clearDragState();
      ul.classList.add('drag-over');
    });
    ul.addEventListener('dragleave', (e) => {
      if (!ul.contains(e.relatedTarget)) ul.classList.remove('drag-over');
    });
    ul.addEventListener('drop', (e) => {
      e.preventDefault();
      clearDragState();
      dropOnGroup(priority);
    });

    todos
      .filter(t => (t.priority || 'medium') === priority)
      .forEach(todo => ul.appendChild(createTodoItem(todo)));

    cardContent.append(header, ul);
    card.appendChild(cardContent);
    container.appendChild(card);
  });
}

function createTodoItem(todo) {
  const priority = todo.priority || 'medium';

  const li = document.createElement('li');
  li.className = `collection-item todo-item priority-${priority}` + (todo.done ? ' done' : '');
  li.draggable = true;

  li.addEventListener('dragstart', (e) => {
    dragSrcId = todo.id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => li.classList.add('dragging'), 0);
  });
  li.addEventListener('dragend', () => {
    li.classList.remove('dragging');
    clearDragState();
    dragSrcId = null;
  });
  li.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearDragState();
    const rect = li.getBoundingClientRect();
    li.classList.add(
      e.clientY < rect.top + rect.height / 2 ? 'drop-indicator-before' : 'drop-indicator-after'
    );
  });
  li.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = li.getBoundingClientRect();
    clearDragState();
    dropOnItem(todo.id, priority, e.clientY < rect.top + rect.height / 2);
  });

  const handle = document.createElement('i');
  handle.className = 'material-icons drag-handle';
  handle.textContent = 'drag_indicator';

  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.done;
  checkbox.addEventListener('change', () => toggleTodo(todo.id, todo.done));
  const checkSpan = document.createElement('span');
  label.append(checkbox, checkSpan);

  const textSpan = document.createElement('span');
  textSpan.className = 'todo-text';
  textSpan.textContent = todo.text;

  const chip = document.createElement('span');
  chip.className = `chip priority-chip priority-chip-${priority}`;
  chip.textContent = PRIORITY_LABEL[priority];
  chip.title = '클릭하여 우선순위 변경';
  chip.addEventListener('click', (e) => {
    e.stopPropagation();
    showPriorityDropdown(chip, todo.id, priority);
  });

  const deleteBtn = document.createElement('a');
  deleteBtn.className = 'secondary-content delete-btn';
  const deleteIcon = document.createElement('i');
  deleteIcon.className = 'material-icons';
  deleteIcon.textContent = 'delete';
  deleteBtn.appendChild(deleteIcon);
  deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

  li.append(handle, label, textSpan, chip, deleteBtn);
  return li;
}

async function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;

  const priority = document.getElementById('priority-select').value;
  const todos = await loadTodos();
  const { error } = await db.from('todos').insert({
    id: Date.now(), text, done: false, priority,
    sort_order: todos.length,
    user_id: currentSession.user.id
  });
  if (error) { console.error(error); return; }

  await renderTodos();
  input.value = '';
  M.updateTextFields();
  input.focus();
}

async function toggleTodo(id, currentDone) {
  const { error } = await db.from('todos').update({ done: !currentDone }).eq('id', id);
  if (error) { console.error(error); return; }
  await renderTodos();
}

function showPriorityDropdown(anchor, id, currentPriority) {
  const existing = document.getElementById('priority-dropdown');
  if (existing) {
    existing.remove();
    if (existing.dataset.anchorId === String(id)) return;
  }

  const dropdown = document.createElement('div');
  dropdown.id = 'priority-dropdown';
  dropdown.className = 'priority-dropdown';
  dropdown.dataset.anchorId = String(id);

  PRIORITIES.forEach(p => {
    const item = document.createElement('div');
    item.className = `priority-dropdown-item priority-chip-${p}` + (p === currentPriority ? ' current' : '');
    item.textContent = PRIORITY_LABEL[p];
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.remove();
      if (p !== currentPriority) changePriority(id, p);
    });
    dropdown.appendChild(item);
  });

  const rect = anchor.getBoundingClientRect();
  dropdown.style.top = `${rect.bottom + 4}px`;
  dropdown.style.left = `${rect.left}px`;
  document.body.appendChild(dropdown);

  setTimeout(() => {
    document.addEventListener('click', () => dropdown.remove(), { once: true });
  }, 0);
}

async function changePriority(id, priority) {
  const { error } = await db.from('todos').update({ priority }).eq('id', id);
  if (error) { console.error(error); return; }
  await renderTodos();
}

async function deleteTodo(id) {
  const { error } = await db.from('todos').delete().eq('id', id);
  if (error) { console.error(error); return; }
  await renderTodos();
}

async function dropOnItem(targetId, targetPriority, insertBefore) {
  if (!dragSrcId || dragSrcId === targetId) return;
  const todos = await loadTodos();
  const srcIdx = todos.findIndex(t => t.id === dragSrcId);
  if (srcIdx === -1) return;

  const [dragged] = todos.splice(srcIdx, 1);
  dragged.priority = targetPriority;

  const targetIdx = todos.findIndex(t => t.id === targetId);
  todos.splice(insertBefore ? targetIdx : targetIdx + 1, 0, dragged);

  await saveTodos(todos);
  await renderTodos();
}

async function dropOnGroup(targetPriority) {
  if (!dragSrcId) return;
  const todos = await loadTodos();
  const srcIdx = todos.findIndex(t => t.id === dragSrcId);
  if (srcIdx === -1) return;

  const [dragged] = todos.splice(srcIdx, 1);
  dragged.priority = targetPriority;

  const lastIdx = todos.reduce((last, t, i) =>
    (t.priority || 'medium') === targetPriority ? i : last, -1);
  todos.splice(lastIdx + 1, 0, dragged);

  await saveTodos(todos);
  await renderTodos();
}

M.FormSelect.init(document.getElementById('priority-select'));

document.getElementById('add-btn').addEventListener('click', addTodo);
document.getElementById('todo-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTodo();
});

document.getElementById('tab-login').addEventListener('click', () => setAuthMode('login'));
document.getElementById('tab-signup').addEventListener('click', () => setAuthMode('signup'));
document.getElementById('auth-submit-btn').addEventListener('click', handleAuthSubmit);
document.getElementById('auth-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleAuthSubmit();
});
document.getElementById('logout-btn').addEventListener('click', (e) => {
  e.preventDefault();
  db.auth.signOut();
});
