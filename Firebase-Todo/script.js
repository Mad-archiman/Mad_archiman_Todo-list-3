// Import Firebase functions
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase 초기화
const firebaseConfig = {
    apiKey: "AIzaSyDv5uRAp5jL0GRvXx_930DzdZOOZtvgfRA",
    authDomain: "mad-todo-backend.firebaseapp.com",
    databaseURL: "https://mad-todo-backend-default-rtdb.firebaseio.com",
    projectId: "mad-todo-backend",
    storageBucket: "mad-todo-backend.firebasestorage.app",
    messagingSenderId: "672923436994",
    appId: "1:672923436994:web:33e90339e536558173f85b"
};

// Firebase 초기화 및 데이터베이스 참조
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const todosRef = ref(database, 'todos');

// 할 일 데이터 저장소
let todos = [];
let currentFilter = 'all'; // 'all' 또는 'date'
let currentPage = 1; // 현재 페이지
const itemsPerPage = 6; // 페이지당 항목 수
let currentView = 'list'; // 'list' 또는 'calendar'
let selectedCalendarDate = null; // 달력에서 선택된 날짜
let isSelectAllMode = true; // true: 전체 선택 모드, false: 삭제 모드

// 할일을 시간 순으로 정렬하는 함수
function sortTodosByTime(todosArray) {
    return todosArray.sort((a, b) => {
        // id에서 날짜/시간 정보 추출 (형식: 텍스트_YYYY_MM_DD_HH_MM_SS)
        const getTimeFromId = (id) => {
            if (!id || typeof id !== 'string') return 0;
            const parts = id.split('_');
            if (parts.length >= 6) {
                // 마지막 6개 부분이 날짜/시간 정보 (YYYY_MM_DD_HH_MM_SS)
                const timeParts = parts.slice(-6);
                const year = parseInt(timeParts[0], 10);
                const month = parseInt(timeParts[1], 10) - 1; // 월은 0부터 시작
                const day = parseInt(timeParts[2], 10);
                const hour = parseInt(timeParts[3], 10);
                const minute = parseInt(timeParts[4], 10);
                const second = parseInt(timeParts[5], 10);
                return new Date(year, month, day, hour, minute, second).getTime();
            }
            return 0;
        };
        
        const timeA = getTimeFromId(a.id);
        const timeB = getTimeFromId(b.id);
        return timeA - timeB; // 오름차순 정렬 (오래된 것부터)
    });
}

// 페이지 로드 시 Firebase에서 데이터 불러오기
function loadTodos() {
    onValue(todosRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Firebase 데이터를 배열로 변환
            todos = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            // 시간 순으로 정렬
            todos = sortTodosByTime(todos);
        } else {
            todos = [];
        }
        if (currentView === 'calendar') {
            renderCalendar();
            if (selectedCalendarDate) {
                renderSelectedDateTodos(selectedCalendarDate);
            }
        } else {
            renderTodos();
        }
    });
}

// 할 일 저장하기 (Firebase에 저장)
function saveTodos() {
    // Firebase는 실시간으로 업데이트되므로 개별 저장 함수에서 처리
}

// 날짜를 년_월_일_시_분_초 형식으로 변환하는 함수
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;
}

// 할 일 추가
function addTodo() {
    const input = document.getElementById('newTodo');
    const text = input.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    // 텍스트를 기반으로 키 생성 (Firebase에서 허용되지 않는 문자 제거)
    const now = new Date();
    const dateTimeStr = formatDateTime(now);
    const safeKey = text
        .replace(/[\/\[\]\.#\$]/g, '_')  // Firebase에서 금지된 문자를 _로 변경
        .replace(/\s+/g, '_')            // 공백을 _로 변경
        .substring(0, 50)                // 너무 길면 자르기
        + '_' + dateTimeStr;             // 년_월_일_시_분_초 형식으로 추가
    
    const newTodo = {
        text: text,
        completed: false
    };
    
    // push() 대신 set()을 사용하여 커스텀 키로 저장
    const todoRef = ref(database, `todos/${safeKey}`);
    set(todoRef, newTodo).then(() => {
        input.value = '';
    }).catch((error) => {
        console.error('할 일 추가 실패:', error);
        alert('할 일 추가에 실패했습니다.');
    });
}

// 할 일 선택 토글 (체크박스)
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const todoRef = ref(database, `todos/${id}`);
        const newSelected = !(todo.selected || false);
        update(todoRef, {
            selected: newSelected
        }).then(() => {
            // 체크박스 상태 변경 후 버튼 상태 확인
            checkSelectAllButtonState();
        }).catch((error) => {
            console.error('할 일 선택 실패:', error);
            alert('할 일 선택에 실패했습니다.');
        });
    }
}

// 할 일 완료 토글
function toggleCompleted(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const todoRef = ref(database, `todos/${id}`);
        update(todoRef, {
            completed: !(todo.completed || false)
        }).catch((error) => {
            console.error('할 일 완료 실패:', error);
            alert('할 일 완료에 실패했습니다.');
        });
    }
}

// 전체 선택 버튼 상태 확인
function checkSelectAllButtonState() {
    const filteredTodos = getFilteredTodos();
    if (filteredTodos.length === 0) {
        isSelectAllMode = true;
        updateSelectAllButton();
        return;
    }
    
    // 선택된 항목이 하나라도 있으면 삭제 모드로 유지
    const hasSelected = filteredTodos.some(todo => todo.selected || false);
    if (!hasSelected && !isSelectAllMode) {
        // 선택된 항목이 없고 삭제 모드라면 전체 선택 모드로 복귀
        isSelectAllMode = true;
        updateSelectAllButton();
    }
    // 선택된 항목이 하나라도 있으면 삭제 모드 유지 (버튼 텍스트 업데이트)
    else if (hasSelected && !isSelectAllMode) {
        updateSelectAllButton();
    }
}

// 전체 선택/해제
function toggleSelectAll() {
    const filteredTodos = getFilteredTodos();
    if (filteredTodos.length === 0) {
        alert('선택할 할 일이 없습니다.');
        return;
    }
    
    if (isSelectAllMode) {
        // 전체 선택 모드: 모든 항목을 선택 상태로 변경
        const updatePromises = filteredTodos.map(todo => {
            const todoRef = ref(database, `todos/${todo.id}`);
            return update(todoRef, {
                selected: true
            });
        });
        
        Promise.all(updatePromises).then(() => {
            // 전체 선택 후 버튼 텍스트를 "삭제"로 변경
            isSelectAllMode = false;
            updateSelectAllButton();
        }).catch((error) => {
            console.error('전체 선택 실패:', error);
            alert('전체 선택에 실패했습니다.');
        });
    } else {
        // 삭제 모드: 확인 후 삭제
        if (confirm('정말 삭제할까요?')) {
            deleteAllSelectedTodos();
        }
    }
}

// 선택된 할 일 전체 삭제
function deleteAllSelectedTodos() {
    const filteredTodos = getFilteredTodos();
    const selectedTodos = filteredTodos.filter(todo => todo.selected || false);
    
    if (selectedTodos.length === 0) {
        alert('삭제할 할 일이 없습니다.');
        isSelectAllMode = true;
        updateSelectAllButton();
        return;
    }
    
    // 선택된 항목을 일괄 삭제
    const deletePromises = selectedTodos.map(todo => {
        const todoRef = ref(database, `todos/${todo.id}`);
        return remove(todoRef);
    });
    
    Promise.all(deletePromises).then(() => {
        // 삭제 후 버튼 텍스트를 "전체 선택"으로 변경
        isSelectAllMode = true;
        updateSelectAllButton();
    }).catch((error) => {
        console.error('전체 삭제 실패:', error);
        alert('전체 삭제에 실패했습니다.');
    });
}

// 전체 선택 버튼 텍스트 업데이트
function updateSelectAllButton() {
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.textContent = isSelectAllMode ? '전체 선택' : '삭제';
    }
}

// 할 일 수정 모드 시작
function startEdit(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const item = document.querySelector(`[data-todo-id="${id}"]`);
    const textElement = item.querySelector('.todo-text');
    const buttons = item.querySelector('.todo-buttons');
    
    // 입력 필드 생성
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-edit-input';
    input.value = todo.text;
    
    // 저장/취소 버튼 생성
    const saveBtn = document.createElement('button');
    saveBtn.className = 'todo-button save-button';
    saveBtn.textContent = '저장';
    saveBtn.onclick = () => saveEdit(id, input.value);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'todo-button cancel-button';
    cancelBtn.textContent = '취소';
    cancelBtn.onclick = () => renderTodos();
    
    // 교체
    textElement.replaceWith(input);
    buttons.innerHTML = '';
    buttons.appendChild(saveBtn);
    buttons.appendChild(cancelBtn);
    
    input.focus();
    input.select();
    
    // Enter 키로 저장
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            saveEdit(id, input.value);
        }
    };
    
    // Escape 키로 취소
    input.onkeydown = (e) => {
        if (e.key === 'Escape') {
            renderTodos();
        }
    };
}

// 할 일 수정 저장
function saveEdit(id, newText) {
    const text = newText.trim();
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const todoRef = ref(database, `todos/${id}`);
    update(todoRef, {
        text: text
    }).catch((error) => {
        console.error('할 일 수정 실패:', error);
        alert('할 일 수정에 실패했습니다.');
    });
}

// 할 일 삭제
function deleteTodo(id) {
    const todoRef = ref(database, `todos/${id}`);
    remove(todoRef).catch((error) => {
        console.error('할 일 삭제 실패:', error);
        alert('할 일 삭제에 실패했습니다.');
    });
}

// 오늘 날짜 문자열 가져오기
function getTodayDateStr() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}_${month}_${day}`;
}

// 날짜별 할 일 필터링
function filterTodosByDate(todos, dateStr) {
    return todos.filter(todo => {
        // Firebase 키에서 날짜 부분 추출 (형식: 텍스트_년_월_일_시_분_초)
        if (todo.id && typeof todo.id === 'string') {
            const parts = todo.id.split('_');
            // 마지막 6개가 날짜시간이므로, 그 중 앞 3개가 년_월_일
            if (parts.length >= 6) {
                const datePart = parts.slice(-6, -3).join('_');
                return datePart === dateStr;
            }
        }
        return false;
    });
}

// 필터링된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = [];
    if (currentFilter === 'date') {
        const todayStr = getTodayDateStr();
        filtered = filterTodosByDate(todos, todayStr);
    } else {
        // 'all' 필터도 오늘 날짜의 할 일만 표시
        const todayStr = getTodayDateStr();
        filtered = filterTodosByDate(todos, todayStr);
    }
    // 시간 순으로 정렬
    return sortTodosByTime(filtered);
}

// 할 일 목록 렌더링
function renderTodos() {
    if (currentView === 'calendar') {
        return; // 달력 뷰일 때는 리스트 렌더링 안 함
    }
    
    const list = document.getElementById('todoList');
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        list.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요!</li>';
        renderPagination(filteredTodos.length);
        updateSelectAllButton();
        return;
    }
    
    // 페이지네이션 계산
    const totalPages = Math.ceil(filteredTodos.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentTodos = filteredTodos.slice(startIndex, endIndex);
    
    list.innerHTML = currentTodos.map(todo => `
        <li class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}">
            <input 
                type="checkbox" 
                class="todo-checkbox" 
                ${(todo.selected || false) ? 'checked' : ''}
                onchange="toggleTodo('${todo.id}')"
            >
                <div class="todo-content">
                    <span class="todo-text">${escapeHtml(todo.text)}</span>
                    <div class="todo-buttons">
                        <button class="todo-button complete-button" onclick="toggleCompleted('${todo.id}')">완료</button>
                        <button class="todo-button edit-button" onclick="startEdit('${todo.id}')">수정</button>
                        <button class="todo-button delete-button" onclick="deleteTodo('${todo.id}')">삭제</button>
                    </div>
                </div>
        </li>
    `).join('');
    
    renderPagination(filteredTodos.length);
    updateSelectAllButton();
}

// 페이지네이션 렌더링
function renderPagination(totalItems) {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage)); // 최소 1페이지
    
    let paginationHTML = '<div class="pagination-buttons">';
    
    // 이전 페이지 버튼
    if (currentPage > 1) {
        paginationHTML += `<button class="page-button" onclick="changePage(${currentPage - 1})">이전</button>`;
    }
    
    // 페이지 번호 버튼
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<button class="page-button active">${i}</button>`;
        } else {
            paginationHTML += `<button class="page-button" onclick="changePage(${i})">${i}</button>`;
        }
    }
    
    // 다음 페이지 버튼
    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-button" onclick="changePage(${currentPage + 1})">다음</button>`;
    }
    
    paginationHTML += '</div>';
    pagination.innerHTML = paginationHTML;
}

// 페이지 변경
function changePage(page) {
    currentPage = page;
    renderTodos();
}

// 필터 변경
function setFilter(filter) {
    currentFilter = filter;
    currentPage = 1; // 필터 변경 시 첫 페이지로 이동
    
    // 날짜별 할일 클릭 시 달력 뷰로 전환
    if (filter === 'date') {
        currentView = 'calendar';
        // selectedCalendarDate가 명시적으로 설정되지 않았을 때만 초기화
        if (selectedCalendarDate === undefined) {
            selectedCalendarDate = null;
        }
        showCalendarView();
    } else if (filter === 'memo') {
        currentView = 'memo';
        showMemoView();
    } else {
        currentView = 'list';
        showListView();
        renderTodos();
    }
    
    // 버튼 활성화 상태 업데이트
    const allBtn = document.getElementById('showAllBtn');
    const dateBtn = document.getElementById('showDateBtn');
    const memoBtn = document.getElementById('showMemoBtn');
    
    // 모든 버튼에서 active 제거
    allBtn.classList.remove('active');
    dateBtn.classList.remove('active');
    if (memoBtn) memoBtn.classList.remove('active');
    
    // 선택된 필터에 active 추가
    if (filter === 'all') {
        allBtn.classList.add('active');
    } else if (filter === 'date') {
        dateBtn.classList.add('active');
    } else if (filter === 'memo') {
        if (memoBtn) memoBtn.classList.add('active');
    }
}

// 리스트 뷰 표시
function showListView() {
    const todoList = document.getElementById('todoList');
    const pagination = document.getElementById('pagination');
    const calendarView = document.getElementById('calendarView');
    const memoView = document.getElementById('memoView');
    const addTodoContainer = document.querySelector('.add-todo-container');
    const selectAllContainer = document.querySelector('.select-all-container');
    const titleContainer = document.querySelector('.title-container');
    const todoApp = document.querySelector('.todo-app');
    
    // title-container를 원래 위치로 복원
    if (titleContainer && todoApp && titleContainer.parentElement !== todoApp) {
        todoApp.insertBefore(titleContainer, todoApp.firstChild);
    }
    
    todoList.style.display = 'block';
    pagination.style.display = 'block';
    calendarView.style.display = 'none';
    if (memoView) memoView.style.display = 'none';
    if (addTodoContainer) addTodoContainer.style.display = 'flex';
    if (selectAllContainer) selectAllContainer.style.display = 'flex';
}

// 달력 뷰 표시
function showCalendarView() {
    const todoList = document.getElementById('todoList');
    const pagination = document.getElementById('pagination');
    const calendarView = document.getElementById('calendarView');
    const memoView = document.getElementById('memoView');
    const addTodoContainer = document.querySelector('.add-todo-container');
    const selectAllContainer = document.querySelector('.select-all-container');
    const titleContainer = document.querySelector('.title-container');
    const calendar = document.getElementById('calendar');
    
    // title-container를 calendar-view 내부로 이동 (calendar 앞에)
    if (titleContainer && calendarView && calendar) {
        if (titleContainer.parentElement !== calendarView) {
            calendarView.insertBefore(titleContainer, calendar);
        }
    }
    
    todoList.style.display = 'none';
    pagination.style.display = 'none';
    calendarView.style.display = 'block';
    if (memoView) memoView.style.display = 'none';
    if (addTodoContainer) addTodoContainer.style.display = 'none';
    if (selectAllContainer) selectAllContainer.style.display = 'none';
    
    // 현재 날짜로 초기화
    const now = new Date();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth();
    calendarDay = now.getDate();
    
    renderCalendar();
}

// 메모장 뷰 표시
function showMemoView() {
    const todoList = document.getElementById('todoList');
    const pagination = document.getElementById('pagination');
    const calendarView = document.getElementById('calendarView');
    const memoView = document.getElementById('memoView');
    const addTodoContainer = document.querySelector('.add-todo-container');
    const selectAllContainer = document.querySelector('.select-all-container');
    const titleContainer = document.querySelector('.title-container');
    const todoApp = document.querySelector('.todo-app');
    
    // title-container를 원래 위치로 복원
    if (titleContainer && todoApp && titleContainer.parentElement !== todoApp) {
        todoApp.insertBefore(titleContainer, todoApp.firstChild);
    }
    
    todoList.style.display = 'none';
    pagination.style.display = 'none';
    calendarView.style.display = 'none';
    if (memoView) memoView.style.display = 'block';
    if (addTodoContainer) addTodoContainer.style.display = 'none';
    if (selectAllContainer) selectAllContainer.style.display = 'none';
    
    // Canvas 초기화
    initMemoCanvas();
}

// 메모장 Canvas 초기화 및 드로잉 기능
function initMemoCanvas() {
    const canvas = document.getElementById('memoCanvas');
    if (!canvas) return;
    
    const memoView = document.getElementById('memoView');
    if (!memoView) return;
    
    // Canvas 크기 설정 (메모장 뷰의 실제 크기에 맞춤)
    // 메모장 뷰는 padding: 30px이므로, 실제 그리기 영역은 width - 60, height - 60
    const setCanvasSize = () => {
        // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 크기 계산
        setTimeout(() => {
            const rect = memoView.getBoundingClientRect();
            const padding = 60; // 좌우 각 30px
            canvas.width = rect.width - padding;
            canvas.height = rect.height - padding;
            
            // Canvas 배경을 흰색으로 설정
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }, 10);
    };
    
    setCanvasSize();
    
    // 윈도우 리사이즈 시 Canvas 크기 재조정
    const resizeHandler = () => {
        setCanvasSize();
    };
    window.addEventListener('resize', resizeHandler);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Canvas 초기 설정
    ctx.strokeStyle = '#000000'; // 검은색
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 초기 배경을 흰색으로 설정
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    // 마우스 좌표 가져오기 (캔버스 기준)
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    // 터치 좌표 가져오기
    function getTouchPos(e) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }
    
    // 그리기 시작
    function startDrawing(e) {
        isDrawing = true;
        const pos = e.type.includes('touch') ? getTouchPos(e) : getMousePos(e);
        lastX = pos.x;
        lastY = pos.y;
    }
    
    // 그리기 중
    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        
        const pos = e.type.includes('touch') ? getTouchPos(e) : getMousePos(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        
        lastX = pos.x;
        lastY = pos.y;
    }
    
    // 그리기 종료
    function stopDrawing() {
        isDrawing = false;
    }
    
    // 마우스 이벤트
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    
    // 터치 이벤트 (모바일 지원)
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrawing(e);
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
    });
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopDrawing();
    });
    canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        stopDrawing();
    });
}

// 달력 렌더링
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const now = new Date();
    const year = calendarYear;
    const month = calendarMonth;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    let calendarHTML = '<div class="calendar-header">';
    calendarHTML += '<div class="calendar-year-nav" onwheel="handleYearWheel(event)">';
    calendarHTML += `<button class="calendar-nav-btn" onclick="changeCalendarYear(-1)">‹</button>`;
    calendarHTML += `<span class="calendar-year">${year}년</span>`;
    calendarHTML += `<button class="calendar-nav-btn" onclick="changeCalendarYear(1)">›</button>`;
    calendarHTML += '</div>';
    calendarHTML += '<div class="calendar-month-nav" onwheel="handleMonthWheel(event)">';
    calendarHTML += `<button class="calendar-nav-btn" onclick="changeCalendarMonth(-1)">‹</button>`;
    calendarHTML += `<span class="calendar-month-year">${month + 1}월</span>`;
    calendarHTML += `<button class="calendar-nav-btn" onclick="changeCalendarMonth(1)">›</button>`;
    calendarHTML += '</div>';
    calendarHTML += '<div class="calendar-day-nav" onwheel="handleDayWheel(event)">';
    calendarHTML += `<button class="calendar-nav-btn" onclick="changeCalendarDay(-1)">‹</button>`;
    calendarHTML += `<span class="calendar-day-text">${calendarDay}일</span>`;
    calendarHTML += `<button class="calendar-nav-btn" onclick="changeCalendarDay(1)">›</button>`;
    calendarHTML += '</div>';
    calendarHTML += '</div>';
    
    calendarHTML += '<div class="calendar-weekdays">';
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    weekdays.forEach(day => {
        calendarHTML += `<div class="calendar-weekday">${day}</div>`;
    });
    calendarHTML += '</div>';
    
    calendarHTML += '<div class="calendar-days">';
    
    // 빈 칸 추가 (첫 날 전까지)
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // 날짜 추가
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}_${String(month + 1).padStart(2, '0')}_${String(day).padStart(2, '0')}`;
        const dayTodos = getTodosByDate(dateStr);
        const completedTodos = dayTodos.filter(todo => todo.completed);
        const totalCount = dayTodos.length;
        const completedCount = completedTodos.length;
        const isToday = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
        const isSelected = selectedCalendarDate === dateStr;
        
        // 색상 클래스 결정
        let countColorClass = '';
        if (totalCount > 0) {
            if (completedCount === totalCount) {
                countColorClass = 'todo-count-complete'; // 초록색
            } else {
                countColorClass = 'todo-count-incomplete'; // 빨간색
            }
        }
        
        calendarHTML += `<div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" onclick="selectCalendarDate('${dateStr}')">`;
        calendarHTML += `<span class="day-number">${day}</span>`;
        if (totalCount > 0) {
            calendarHTML += `<span class="todo-count ${countColorClass}">${completedCount}/${totalCount}</span>`;
        }
        calendarHTML += '</div>';
    }
    
    calendarHTML += '</div>';
    calendar.innerHTML = calendarHTML;
    
    // 선택된 날짜의 할 일 표시
    if (selectedCalendarDate) {
        renderSelectedDateTodos(selectedCalendarDate);
    }
}

// 달력 월 변경
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let calendarDay = new Date().getDate();

function changeCalendarMonth(direction) {
    calendarMonth += direction;
    if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
        // 년도 범위 체크
        if (calendarYear < 1972) {
            calendarYear = 1972;
            calendarMonth = 0;
        }
    } else if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
        // 년도 범위 체크
        if (calendarYear > 2099) {
            calendarYear = 2099;
            calendarMonth = 11;
        }
    }
    renderCalendar();
}

// 달력 년도 변경
function changeCalendarYear(direction) {
    calendarYear += direction;
    // 년도 범위 체크
    if (calendarYear < 1972) {
        calendarYear = 1972;
    } else if (calendarYear > 2099) {
        calendarYear = 2099;
    }
    renderCalendar();
}

// 년도 스크롤 핸들러
function handleYearWheel(event) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    changeCalendarYear(direction);
}

// 월 스크롤 핸들러
function handleMonthWheel(event) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    changeCalendarMonth(direction);
}

// 달력 일자 변경
function changeCalendarDay(direction) {
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    calendarDay += direction;
    
    if (calendarDay < 1) {
        // 이전 달의 마지막 날로 이동
        calendarMonth--;
        if (calendarMonth < 0) {
            calendarMonth = 11;
            calendarYear--;
            if (calendarYear < 1972) {
                calendarYear = 1972;
                calendarMonth = 0;
                calendarDay = 1;
            }
        }
        calendarDay = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    } else if (calendarDay > lastDay) {
        // 다음 달의 첫 날로 이동
        calendarMonth++;
        if (calendarMonth > 11) {
            calendarMonth = 0;
            calendarYear++;
            if (calendarYear > 2099) {
                calendarYear = 2099;
                calendarMonth = 11;
                calendarDay = new Date(calendarYear, calendarMonth + 1, 0).getDate();
            }
        }
        calendarDay = 1;
    }
    
    // 선택된 날짜 업데이트
    const dateStr = `${calendarYear}_${String(calendarMonth + 1).padStart(2, '0')}_${String(calendarDay).padStart(2, '0')}`;
    selectedCalendarDate = dateStr;
    renderCalendar();
    renderSelectedDateTodos(dateStr);
}

// 일자 스크롤 핸들러
function handleDayWheel(event) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    changeCalendarDay(direction);
}

// 날짜별 할 일 가져오기
function getTodosByDate(dateStr) {
    const filtered = todos.filter(todo => {
        if (todo.id && typeof todo.id === 'string') {
            const parts = todo.id.split('_');
            if (parts.length >= 6) {
                const todoDateStr = parts.slice(-6, -3).join('_');
                return todoDateStr === dateStr;
            }
        }
        return false;
    });
    // 시간 순으로 정렬
    return sortTodosByTime(filtered);
}

// 달력에서 날짜 선택
function selectCalendarDate(dateStr) {
    selectedCalendarDate = dateStr;
    // 날짜 문자열에서 일자 추출하여 calendarDay 업데이트
    const parts = dateStr.split('_');
    if (parts.length >= 3) {
        calendarDay = parseInt(parts[2], 10);
    }
    renderCalendar();
    renderSelectedDateTodos(dateStr);
}

// 선택된 날짜의 할 일 렌더링
function renderSelectedDateTodos(dateStr) {
    const container = document.getElementById('selectedDateTodos');
    const dayTodos = getTodosByDate(dateStr);
    
    const [year, month, day] = dateStr.split('_');
    const date = new Date(year, parseInt(month) - 1, day);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    
    let html = `<div class="selected-date-header">${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${dayName}요일</div>`;
    
    // 날짜별 할일 입력 필드 추가
    html += `<div class="date-add-todo-container">
        <input 
            type="text" 
            id="dateTodoInput" 
            class="todo-input" 
            placeholder="이 날짜에 할 일을 입력하세요"
        >
        <button class="add-button" onclick="addTodoForDate('${dateStr}')">+</button>
    </div>`;
    
    if (dayTodos.length === 0) {
        html += '<div class="empty-message">이 날짜에 할 일이 없습니다.</div>';
    } else {
        html += '<ul class="date-todo-list">';
        html += dayTodos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}">
                <div class="todo-content">
                    <span class="todo-text">${escapeHtml(todo.text)}</span>
                    <div class="todo-buttons">
                        <button class="todo-button complete-button" onclick="toggleCompleted('${todo.id}')">완료</button>
                        <button class="todo-button edit-button" onclick="startEdit('${todo.id}')">수정</button>
                        <button class="todo-button delete-button" onclick="deleteTodo('${todo.id}')">삭제</button>
                    </div>
                </div>
            </li>
        `).join('');
        html += '</ul>';
    }
    
    container.innerHTML = html;
    
    // Enter 키로 추가할 수 있도록 이벤트 리스너 추가
    const dateTodoInput = document.getElementById('dateTodoInput');
    if (dateTodoInput) {
        dateTodoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTodoForDate(dateStr);
            }
        });
    }
}

// 특정 날짜에 할 일 추가
function addTodoForDate(dateStr) {
    const input = document.getElementById('dateTodoInput');
    const text = input.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    // 선택된 날짜의 시간 정보 사용
    const [year, month, day] = dateStr.split('_');
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const dateTimeStr = `${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;
    
    // 텍스트를 기반으로 키 생성
    const safeKey = text
        .replace(/[\/\[\]\.#\$]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 50)
        + '_' + dateTimeStr;
    
    const newTodo = {
        text: text,
        completed: false,
        selected: false
    };
    
    // Firebase에 추가
    const todoRef = ref(database, `todos/${safeKey}`);
    set(todoRef, newTodo).then(() => {
        input.value = '';
        // 선택된 날짜의 할 일 목록 다시 렌더링
        renderSelectedDateTodos(dateStr);
        // 달력도 다시 렌더링하여 할 일 개수 업데이트
        renderCalendar();
    }).catch((error) => {
        console.error('할 일 추가 실패:', error);
        alert('할 일 추가에 실패했습니다.');
    });
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 날짜 표시 함수
function updateDateDisplay() {
    const dateDisplay = document.getElementById('dateDisplay');
    if (!dateDisplay) return;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const day = dayNames[now.getDay()];
    
    dateDisplay.textContent = `${year}년 ${month}월 ${date}일 ${day}요일`;
    dateDisplay.style.cursor = 'pointer';
    dateDisplay.onclick = goToTodayDate;
}

// 오늘 날짜로 이동
function goToTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const dayStr = String(day).padStart(2, '0');
    const todayStr = `${year}_${String(month + 1).padStart(2, '0')}_${dayStr}`;
    
    // 달력 년도, 월, 일을 오늘 날짜로 설정
    calendarYear = year;
    calendarMonth = month;
    calendarDay = day;
    selectedCalendarDate = todayStr;
    
    // 날짜별 할일 필터로 전환
    currentFilter = 'date';
    currentPage = 1;
    currentView = 'calendar';
    
    // 버튼 활성화 상태 업데이트
    const allBtn = document.getElementById('showAllBtn');
    const dateBtn = document.getElementById('showDateBtn');
    
    allBtn.classList.remove('active');
    dateBtn.classList.remove('active');
    dateBtn.classList.add('active');
    
    showCalendarView();
}

// 전역 함수로 내보내기 (HTML에서 onclick 사용을 위해)
window.toggleTodo = toggleTodo;
window.toggleCompleted = toggleCompleted;
window.startEdit = startEdit;
window.deleteTodo = deleteTodo;
window.setFilter = setFilter;
window.changePage = changePage;
window.changeCalendarMonth = changeCalendarMonth;
window.changeCalendarYear = changeCalendarYear;
window.handleYearWheel = handleYearWheel;
window.handleMonthWheel = handleMonthWheel;
window.selectCalendarDate = selectCalendarDate;
window.changeCalendarDay = changeCalendarDay;
window.handleDayWheel = handleDayWheel;
window.addTodoForDate = addTodoForDate;

// 책 표지 닫기
function closeBookCover() {
    const bookCover = document.getElementById('bookCover');
    if (bookCover) {
        // 항상 닫힌 상태로 만들기 (이미 닫혀있어도 다시 닫히는 애니메이션 실행)
        if (!bookCover.classList.contains('closed')) {
            bookCover.classList.add('closed');
        } else {
            // 이미 닫혀있으면 다시 닫히는 애니메이션을 위해 클래스를 제거했다가 다시 추가
            bookCover.classList.remove('closed');
            // 리플로우를 강제하여 애니메이션 재실행
            void bookCover.offsetWidth;
            bookCover.classList.add('closed');
        }
    }
}

// 초기 화면 상태로 복귀
function resetToInitialState() {
    const bookCover = document.getElementById('bookCover');
    
    // 1. 책 표지를 열린 상태로 복귀 (closed 클래스 제거)
    if (bookCover) {
        bookCover.classList.remove('closed');
        bookCover.classList.remove('hidden');
        bookCover.classList.remove('opened');
    }
    
    // 2. 오늘의 할일 페이지로 전환
    currentFilter = 'all';
    currentView = 'list';
    currentPage = 1;
    
    // 3. 리스트 뷰 표시
    showListView();
    
    // 4. 할 일 목록 렌더링
    renderTodos();
    
    // 5. 필터 버튼 상태 업데이트
    const allBtn = document.getElementById('showAllBtn');
    const dateBtn = document.getElementById('showDateBtn');
    const memoBtn = document.getElementById('showMemoBtn');
    
    if (allBtn) allBtn.classList.remove('active');
    if (dateBtn) dateBtn.classList.remove('active');
    if (memoBtn) memoBtn.classList.remove('active');
    if (allBtn) allBtn.classList.add('active');
}

// 책 표지 토글 (열기/닫기)
function toggleBookCover() {
    const bookCover = document.getElementById('bookCover');
    if (bookCover && !bookCover.classList.contains('hidden')) {
        if (bookCover.classList.contains('closed')) {
            // 닫힌 상태(좌측에 유지된 상태) → 열린 상태로 (역재생)
            bookCover.classList.remove('closed');
        } else {
            // 열린 상태(초기 상태) → 닫힌 상태로 (좌측으로 넘어가는 애니메이션)
            bookCover.classList.add('closed');
        }
    }
}

// 책 표지 열기
function openBookCover() {
    const bookCover = document.getElementById('bookCover');
    if (bookCover) {
        if (bookCover.classList.contains('closed')) {
            bookCover.classList.remove('closed');
            bookCover.classList.add('opened');
            // 애니메이션 완료 후 책 표지 숨기기 및 오늘의 할일 탭으로 이동
            setTimeout(() => {
                bookCover.classList.add('hidden');
                setFilter('all');
            }, 2000);
        } else {
            // 열린 상태이거나 초기 상태에서 클릭 시 즉시 사라지게
            if (!bookCover.classList.contains('hidden')) {
                bookCover.classList.add('hidden');
                setFilter('all');
            }
        }
    }
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    loadTodos();
    updateDateDisplay();
    
    const addButton = document.getElementById('addButton');
    const newTodoInput = document.getElementById('newTodo');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const showAllBtn = document.getElementById('showAllBtn');
    const showDateBtn = document.getElementById('showDateBtn');
    const appTitle = document.getElementById('appTitle');
    const bookCover = document.getElementById('bookCover');
    
    addButton.addEventListener('click', addTodo);
    
    newTodoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', toggleSelectAll);
    }
    
    showAllBtn.addEventListener('click', () => setFilter('all'));
    showDateBtn.addEventListener('click', () => setFilter('date'));
    
    const showMemoBtn = document.getElementById('showMemoBtn');
    if (showMemoBtn) {
        showMemoBtn.addEventListener('click', () => setFilter('memo'));
    }
    
    // My Todo List 클릭 시 초기 화면 상태로 복귀 (오늘의 할일, 날짜별 할일 모두에서 작동)
    if (appTitle) {
        appTitle.addEventListener('click', (e) => {
            e.stopPropagation(); // 이벤트 전파 방지
            resetToInitialState();
        });
    }
    
    // 날짜별 할일 페이지에서도 My Todo List 클릭 시 초기 화면 상태로 복귀
    // calendar-view 내부의 title-container에도 이벤트 리스너 추가
    const calendarView = document.getElementById('calendarView');
    if (calendarView) {
        calendarView.addEventListener('click', (e) => {
            // calendar-view 내부의 app-title 클릭 시
            if (e.target.id === 'appTitle' || e.target.closest('#appTitle')) {
                e.stopPropagation();
                resetToInitialState();
            }
        });
    }
    
    // 책 표지 클릭 시 책 표지 토글 (열기/닫기)
    if (bookCover) {
        bookCover.addEventListener('click', toggleBookCover);
    }
    
    // 뷰포트에 맞게 스케일 조정
    adjustScale();
    window.addEventListener('resize', adjustScale);
});

// 뷰포트에 맞게 스케일 조정
function adjustScale() {
    const appWrapper = document.querySelector('.app-wrapper');
    if (!appWrapper) return;
    
    // 고정된 앱 크기 (오늘의 할일 페이지 기준)
    const appWidth = 500; // 고정 너비
    const appHeight = 725; // 고정 높이
    
    // 임시로 스케일을 1로 설정하여 실제 크기 측정
    appWrapper.style.transform = 'scale(1)';
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 여유 공간을 고려한 스케일 계산 (좌우 20px, 상하 20px 여유)
    const scaleX = (viewportWidth - 40) / appWidth;
    const scaleY = (viewportHeight - 40) / appHeight;
    const scale = Math.min(scaleX, scaleY, 1); // 1보다 크게 확대하지 않음
    
    appWrapper.style.transform = `scale(${scale})`;
}
