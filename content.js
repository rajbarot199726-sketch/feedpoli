const ROOT_ID = 'clipboard-smiley-root';
const STORAGE_KEY = 'clipboard_items';
const MODAL_STATE_KEY = 'clipboard_modal_closed';
const MODAL_POSITION_KEY = 'clipboard_modal_position';

const browserStorage = {
  async get(keys) {
    return chrome.storage.local.get(keys);
  },
  async set(values) {
    return chrome.storage.local.set(values);
  }
};

const state = {
  items: [],
  closed: false,
  dragCounter: 0,
  position: { x: 24, y: 24 },
  mounted: false,
  elements: null
};

function createPanel() {
  if (document.getElementById(ROOT_ID)) {
    return document.getElementById(ROOT_ID);
  }

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = `
    <section class="clipboard-smiley-modal" aria-live="polite">
      <header class="clipboard-smiley-header">
        <div>
          <p class="clipboard-smiley-eyebrow">Clipboard buddy</p>
          <h1 class="clipboard-smiley-title">Clipboard Smiley</h1>
        </div>
        <button class="clipboard-smiley-icon-button" data-close type="button" aria-label="Close clipboard smiley panel">×</button>
      </header>

      <button class="clipboard-smiley-reopen hidden" data-reopen type="button">Reopen Clipboard Smiley</button>

      <div class="clipboard-smiley-content">
        <p class="clipboard-smiley-helper">Drag highlighted text onto the smiley face to save it forever.</p>

        <div class="clipboard-smiley-drop-zone" data-drop-zone tabindex="0" role="button" aria-label="Drop text on the smiley face to save it">
          <svg class="clipboard-smiley-face" data-smiley viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" class="clipboard-smiley-face-outline" />
            <circle cx="42" cy="46" r="6" class="clipboard-smiley-face-eye" />
            <circle cx="78" cy="46" r="6" class="clipboard-smiley-face-eye" />
            <path data-mouth class="clipboard-smiley-face-mouth" d="M35 72 Q60 94 85 72" />
          </svg>
          <p class="clipboard-smiley-drop-message" data-drop-message>Feed me text</p>
        </div>

        <section class="clipboard-smiley-list-section">
          <div class="clipboard-smiley-list-header">
            <h2 class="clipboard-smiley-list-title">Saved snippets</h2>
            <button class="clipboard-smiley-secondary-button" data-clear type="button">Clear all</button>
          </div>
          <p class="clipboard-smiley-status" data-status>Nothing saved yet.</p>
          <ul class="clipboard-smiley-list" data-list></ul>
        </section>
      </div>
    </section>
  `;

  document.documentElement.appendChild(root);
  return root;
}

function cacheElements(root) {
  state.elements = {
    root,
    modal: root.querySelector('.clipboard-smiley-modal'),
    header: root.querySelector('.clipboard-smiley-header'),
    content: root.querySelector('.clipboard-smiley-content'),
    dropZone: root.querySelector('[data-drop-zone]'),
    dropMessage: root.querySelector('[data-drop-message]'),
    smiley: root.querySelector('[data-smiley]'),
    mouth: root.querySelector('[data-mouth]'),
    status: root.querySelector('[data-status]'),
    list: root.querySelector('[data-list]'),
    closeButton: root.querySelector('[data-close]'),
    reopenButton: root.querySelector('[data-reopen]'),
    clearButton: root.querySelector('[data-clear]')
  };
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

async function loadState() {
  const stored = await browserStorage.get([STORAGE_KEY, MODAL_STATE_KEY, MODAL_POSITION_KEY]);
  state.items = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
  state.closed = stored[MODAL_STATE_KEY] === true;

  if (
    stored[MODAL_POSITION_KEY] &&
    Number.isFinite(stored[MODAL_POSITION_KEY].x) &&
    Number.isFinite(stored[MODAL_POSITION_KEY].y)
  ) {
    state.position = stored[MODAL_POSITION_KEY];
  }
}

async function persistState() {
  await browserStorage.set({
    [STORAGE_KEY]: state.items,
    [MODAL_STATE_KEY]: state.closed,
    [MODAL_POSITION_KEY]: state.position
  });
}

function applyPosition() {
  state.elements.modal.style.transform = `translate(${state.position.x}px, ${state.position.y}px)`;
}

function updateStatus(message, tone = 'default') {
  state.elements.status.textContent = message;
  state.elements.status.dataset.tone = tone;
}

function animateSmiley(isEating) {
  state.elements.smiley.classList.toggle('eating', isEating);
  state.elements.dropZone.classList.toggle('active', isEating);
  state.elements.mouth.setAttribute('d', isEating ? 'M36 69 Q60 108 84 69' : 'M35 72 Q60 94 85 72');
  state.elements.dropMessage.textContent = isEating ? 'Nom nom nom…' : 'Feed me text';
}

function setModalVisibility() {
  state.elements.modal.classList.toggle('closed', state.closed);
  state.elements.content.classList.toggle('hidden', state.closed);
  state.elements.reopenButton.classList.toggle('hidden', !state.closed);
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
  state.elements.list.innerHTML = '';

  if (!state.items.length) {
    updateStatus('Nothing saved yet.');
    return;
  }

  updateStatus('Click any saved snippet to copy it.');

  state.items.forEach((item, index) => {
    const listItem = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'clipboard-smiley-item';
    button.innerHTML = `
      <span class="clipboard-smiley-snippet-text">${escapeHtml(item.text)}</span>
      <span class="clipboard-smiley-snippet-meta">Saved ${formatTimestamp(item.createdAt)} · Click to copy</span>
    `;
    button.addEventListener('click', () => copyToClipboard(item.text));
    button.setAttribute('aria-label', `Copy saved snippet ${index + 1}`);
    listItem.appendChild(button);
    state.elements.list.appendChild(listItem);
  });
}

async function addSnippet(rawText) {
  const text = rawText.trim();
  if (!text) {
    updateStatus('Only plain text snippets can be saved.');
    return;
  }

  state.items.unshift({
    text,
    createdAt: Date.now()
  });

  await persistState();
  renderItems();
  updateStatus('Saved a new snippet forever.', 'success');
}

async function clearAll() {
  state.items = [];
  await persistState();
  renderItems();
}

function bindDropZone() {
  state.elements.dropZone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    state.dragCounter += 1;
    animateSmiley(true);
  });

  state.elements.dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    animateSmiley(true);
  });

  state.elements.dropZone.addEventListener('dragleave', () => {
    state.dragCounter = Math.max(0, state.dragCounter - 1);
    if (!state.dragCounter) {
      animateSmiley(false);
    }
  });

  state.elements.dropZone.addEventListener('drop', async (event) => {
    event.preventDefault();
    state.dragCounter = 0;
    animateSmiley(false);

    const text = event.dataTransfer?.getData('text/plain') || event.dataTransfer?.getData('text');
    if (!text) {
      updateStatus('Drag plain text onto the smiley face to save it.');
      return;
    }

    await addSnippet(text);
  });
}

function bindDragging() {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  state.elements.header.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) {
      return;
    }

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    originX = state.position.x;
    originY = state.position.y;
    state.elements.header.setPointerCapture(pointerId);
    state.elements.modal.classList.add('dragging');
  });

  state.elements.header.addEventListener('pointermove', (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    state.position.x = Math.max(0, originX + (event.clientX - startX));
    state.position.y = Math.max(0, originY + (event.clientY - startY));
    applyPosition();
  });

  async function finishDrag(event) {
    if (pointerId !== event.pointerId) {
      return;
    }

    pointerId = null;
    state.elements.modal.classList.remove('dragging');
    await persistState();
  }

  state.elements.header.addEventListener('pointerup', finishDrag);
  state.elements.header.addEventListener('pointercancel', finishDrag);
}

function bindButtons() {
  state.elements.clearButton.addEventListener('click', clearAll);

  state.elements.closeButton.addEventListener('click', async () => {
    state.closed = true;
    setModalVisibility();
    await persistState();
  });

  state.elements.reopenButton.addEventListener('click', async () => {
    state.closed = false;
    setModalVisibility();
    await persistState();
  });
}

function bindMessages() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== 'clipboard-smiley/toggle') {
      return;
    }

    state.closed = !state.closed;
    setModalVisibility();
    persistState();
  });
}

async function initialize() {
  if (state.mounted) {
    return;
  }

  const root = createPanel();
  cacheElements(root);
  await loadState();
  applyPosition();
  setModalVisibility();
  renderItems();
  bindDropZone();
  bindDragging();
  bindButtons();
  bindMessages();
  state.mounted = true;
}

initialize();
