const STORAGE_KEY = 'clipboard_items';
const MODAL_STATE_KEY = 'clipboard_modal_closed';
const MODAL_POSITION_KEY = 'clipboard_modal_position';

const state = {
  items: [],
  closed: false,
  dragCounter: 0,
  position: { x: 0, y: 0 }
};

const modal = document.getElementById('clipboard-modal');
const header = document.getElementById('modal-header');
const modalContent = document.getElementById('modal-content');
const dropZone = document.getElementById('drop-zone');
const dropMessage = document.getElementById('drop-message');
const smileyFace = document.getElementById('smiley-face');
const clipboardList = document.getElementById('clipboard-list');
const smileMouth = document.getElementById('smile-mouth');
const statusMessage = document.getElementById('status-message');
const clearButton = document.getElementById('clear-button');
const closeButton = document.getElementById('close-button');
const reopenButton = document.getElementById('reopen-button');

function loadItems() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    state.items = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Unable to read saved clipboard items.', error);
    state.items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function loadModalState() {
  state.closed = localStorage.getItem(MODAL_STATE_KEY) === 'true';

  try {
    const storedPosition = JSON.parse(localStorage.getItem(MODAL_POSITION_KEY) || 'null');
    if (storedPosition && Number.isFinite(storedPosition.x) && Number.isFinite(storedPosition.y)) {
      state.position = storedPosition;
    }
  } catch (error) {
    console.error('Unable to read modal position.', error);
  }
}

function saveModalState() {
  localStorage.setItem(MODAL_STATE_KEY, String(state.closed));
  localStorage.setItem(MODAL_POSITION_KEY, JSON.stringify(state.position));
}

function applyPosition() {
  modal.style.transform = `translate(${state.position.x}px, ${state.position.y}px)`;
}

function updateStatus(message, tone = 'default') {
  statusMessage.textContent = message;
  statusMessage.style.color = tone === 'success' ? 'var(--success)' : 'var(--muted)';
}

function setModalVisibility() {
  modal.classList.toggle('modal-closed', state.closed);
  modalContent.classList.toggle('hidden', state.closed);
  reopenButton.classList.toggle('hidden', !state.closed);
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    updateStatus('Copied back to your clipboard.', 'success');
  } catch (error) {
    console.error('Clipboard write failed.', error);
    updateStatus('Copy failed. Your browser blocked clipboard access.');
  }
}

function renderItems() {
  clipboardList.innerHTML = '';

  if (!state.items.length) {
    updateStatus('Nothing saved yet.');
    return;
  }

  updateStatus('Click any saved snippet to copy it.');

  state.items.forEach((item, index) => {
    const listItem = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'clipboard-item';
    button.innerHTML = `
      <span class="snippet-text">${escapeHtml(item.text)}</span>
      <span class="snippet-meta">Saved ${formatTimestamp(item.createdAt)} · Tap to copy</span>
    `;
    button.addEventListener('click', () => copyToClipboard(item.text));
    button.setAttribute('aria-label', `Copy saved snippet ${index + 1}`);
    listItem.appendChild(button);
    clipboardList.appendChild(listItem);
  });
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function animateSmiley(isEating) {
  smileyFace.classList.toggle('eating', isEating);
  dropZone.classList.toggle('active', isEating);
  smileMouth.setAttribute('d', isEating ? 'M36 69 Q60 108 84 69' : 'M35 72 Q60 94 85 72');
  dropMessage.textContent = isEating ? 'Nom nom nom…' : 'Feed me text';
}

function addSnippet(rawText) {
  const text = rawText.trim();
  if (!text) {
    updateStatus('Only plain text snippets can be saved.');
    return;
  }

  state.items.unshift({
    text,
    createdAt: Date.now()
  });

  saveItems();
  renderItems();
  updateStatus('Saved a new snippet forever.', 'success');
}

function handleDrop(event) {
  event.preventDefault();
  state.dragCounter = 0;
  animateSmiley(false);

  const text = event.dataTransfer?.getData('text/plain') || event.dataTransfer?.getData('text');
  if (!text) {
    updateStatus('Drag plain text onto the smiley face to save it.');
    return;
  }

  addSnippet(text);
}

function clearAll() {
  state.items = [];
  saveItems();
  renderItems();
}

function bindDragging() {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  header.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) {
      return;
    }

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    originX = state.position.x;
    originY = state.position.y;
    modal.classList.add('dragging');
    header.setPointerCapture(pointerId);
  });

  header.addEventListener('pointermove', (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    state.position.x = originX + (event.clientX - startX);
    state.position.y = originY + (event.clientY - startY);
    applyPosition();
  });

  function finishDrag(event) {
    if (pointerId !== event.pointerId) {
      return;
    }

    pointerId = null;
    modal.classList.remove('dragging');
    saveModalState();
  }

  header.addEventListener('pointerup', finishDrag);
  header.addEventListener('pointercancel', finishDrag);
}

function bindDropZone() {
  dropZone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    state.dragCounter += 1;
    animateSmiley(true);
  });

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    animateSmiley(true);
  });

  dropZone.addEventListener('dragleave', () => {
    state.dragCounter = Math.max(0, state.dragCounter - 1);
    if (!state.dragCounter) {
      animateSmiley(false);
    }
  });

  dropZone.addEventListener('drop', handleDrop);
}

function bindButtons() {
  clearButton.addEventListener('click', clearAll);

  closeButton.addEventListener('click', () => {
    state.closed = true;
    setModalVisibility();
    saveModalState();
  });

  reopenButton.addEventListener('click', () => {
    state.closed = false;
    setModalVisibility();
    saveModalState();
  });
}

function initialize() {
  loadItems();
  loadModalState();
  applyPosition();
  setModalVisibility();
  renderItems();
  bindDragging();
  bindDropZone();
  bindButtons();
}

initialize();
