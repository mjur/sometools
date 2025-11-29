// Notes Widget - Floating widget version of notes tool
import { toast, on, qs } from '/js/ui.js';

const STORAGE_KEY = 'notes-tool-notes'; // Same storage as main notes tool
const TITLE_LENGTH = 50;
let currentNoteId = null;

// Widget elements
const widgetToggle = qs('#notes-widget-toggle');
const widgetPanel = qs('#notes-widget-panel');
const widgetClose = qs('#notes-widget-close');
const noteContentInput = qs('#notes-widget-content-input');
const newBtn = qs('#notes-widget-new');
const downloadAllBtn = qs('#notes-widget-download-all');
const notesList = qs('#notes-widget-list');
const notesCount = qs('#notes-widget-count');

// Load notes from localStorage
function loadNotes() {
  try {
    const notesJson = localStorage.getItem(STORAGE_KEY);
    return notesJson ? JSON.parse(notesJson) : {};
  } catch (e) {
    console.error('Error loading notes:', e);
    return {};
  }
}

// Save notes to localStorage
function saveNotes(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch (e) {
    console.error('Error saving notes:', e);
    toast('Error saving notes. Storage may be full.', 'error');
    return false;
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Generate title from content
function generateTitle(content) {
  if (!content || content.trim() === '') {
    return 'Untitled';
  }
  const trimmed = content.trim();
  if (trimmed.length <= TITLE_LENGTH) {
    return trimmed;
  }
  return trimmed.substring(0, TITLE_LENGTH) + '...';
}

// Save current note (autosave)
function saveNote(showToast = false) {
  const content = noteContentInput.value.trim();
  
  // Don't save empty notes
  if (!content) {
    return;
  }
  
  const notes = loadNotes();
  const noteId = currentNoteId || generateId();
  const now = Date.now();
  const title = generateTitle(content);
  
  if (notes[noteId]) {
    // Update existing note
    notes[noteId].title = title;
    notes[noteId].content = content;
    notes[noteId].updated = now;
    if (showToast) {
      toast('Note updated', 'success');
    }
  } else {
    // Create new note
    notes[noteId] = {
      id: noteId,
      title: title,
      content: content,
      created: now,
      updated: now
    };
    currentNoteId = noteId;
    if (showToast) {
      toast('Note saved', 'success');
    }
  }
  
  if (saveNotes(notes)) {
    displayNotes();
  }
}

// Debounce function for autosave
let autosaveTimeout = null;
function debouncedAutosave() {
  clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    saveNote(false);
  }, 1000);
}

// Create new note
function newNote() {
  // Save current note before creating new one
  if (noteContentInput.value.trim()) {
    saveNote(false);
  }
  currentNoteId = null;
  noteContentInput.value = '';
  noteContentInput.focus();
  displayNotes();
}

// Load note for editing
function loadNote(noteId) {
  const notes = loadNotes();
  const note = notes[noteId];
  
  if (note) {
    currentNoteId = noteId;
    noteContentInput.value = note.content;
    noteContentInput.focus();
    displayNotes();
  }
}

// Show delete confirmation modal
function showDeleteModal(noteId) {
  const notes = loadNotes();
  const note = notes[noteId];
  const noteTitle = note ? note.title : 'this note';
  
  const modal = document.createElement('div');
  modal.className = 'delete-modal-overlay';
  modal.innerHTML = `
    <div class="delete-modal">
      <h3>Delete Note?</h3>
      <p>Are you sure you want to delete "${escapeHtml(noteTitle)}"?</p>
      <p class="modal-warning">This action cannot be undone.</p>
      <div class="modal-actions">
        <button class="modal-btn cancel-btn">Cancel</button>
        <button class="modal-btn delete-btn">Delete</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const cancelBtn = modal.querySelector('.cancel-btn');
  const deleteBtn = modal.querySelector('.delete-btn');
  
  const closeModal = () => {
    document.body.removeChild(modal);
  };
  
  on(cancelBtn, 'click', closeModal);
  on(deleteBtn, 'click', () => {
    closeModal();
    deleteNote(noteId);
  });
  
  on(modal, 'click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// Delete note
function deleteNote(noteId) {
  const notes = loadNotes();
  delete notes[noteId];
  
  if (saveNotes(notes)) {
    if (currentNoteId === noteId) {
      newNote();
    }
    displayNotes();
    toast('Note deleted', 'success');
  }
}

// Download individual note
function downloadNote(noteId) {
  const notes = loadNotes();
  const note = notes[noteId];
  
  if (!note) {
    toast('Note not found', 'error');
    return;
  }
  
  const filename = (note.title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.txt';
  const content = note.content;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast('Note downloaded', 'success');
}

// Download all notes as ZIP
async function downloadAllNotes() {
  const notes = loadNotes();
  const noteIds = Object.keys(notes);
  
  if (noteIds.length === 0) {
    toast('No notes to download', 'error');
    return;
  }
  
  try {
    const zip = new JSZip();
    
    noteIds.forEach(noteId => {
      const note = notes[noteId];
      const filename = (note.title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.txt';
      const content = note.content;
      zip.file(filename, content);
    });
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast(`Downloaded ${noteIds.length} note(s) as ZIP`, 'success');
  } catch (error) {
    console.error('Error creating ZIP:', error);
    toast('Error creating ZIP file', 'error');
  }
}

// Display all notes
function displayNotes() {
  const notes = loadNotes();
  const noteIds = Object.keys(notes).sort((a, b) => {
    const timeA = notes[a].updated || notes[a].created || 0;
    const timeB = notes[b].updated || notes[b].created || 0;
    return timeB - timeA;
  });
  
  notesCount.textContent = `${noteIds.length} note${noteIds.length !== 1 ? 's' : ''}`;
  
  if (noteIds.length === 0) {
    notesList.innerHTML = '<div class="notes-widget-placeholder">No notes saved yet. Create your first note!</div>';
    return;
  }
  
  let html = '';
  noteIds.forEach(noteId => {
    const note = notes[noteId];
    const isActive = currentNoteId === noteId;
    
    html += `<div class="notes-widget-item ${isActive ? 'active' : ''}" data-note-id="${noteId}">`;
    html += `<div class="notes-widget-item-header">`;
    html += `<h4 class="notes-widget-item-title">${escapeHtml(note.title)}</h4>`;
    html += `<div class="notes-widget-item-actions">`;
    html += `<button class="notes-widget-item-btn edit-btn" data-action="edit" data-note-id="${noteId}" aria-label="Edit note" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>`;
    html += `<button class="notes-widget-item-btn download-btn" data-action="download" data-note-id="${noteId}" aria-label="Download note" title="Download"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>`;
    html += `<button class="notes-widget-item-btn delete-btn delete" data-action="delete" data-note-id="${noteId}" aria-label="Delete note" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`;
    html += `</div>`;
    html += `</div>`;
    html += `</div>`;
  });
  
  notesList.innerHTML = html;
  
  // Add event listeners
  notesList.querySelectorAll('.notes-widget-item-btn').forEach(btn => {
    on(btn, 'click', (e) => {
      e.stopPropagation(); // Prevent event from bubbling to document
      const action = btn.dataset.action;
      const noteId = btn.dataset.noteId;
      
      if (action === 'edit') {
        loadNote(noteId);
      } else if (action === 'download') {
        downloadNote(noteId);
      } else if (action === 'delete') {
        showDeleteModal(noteId);
      }
    });
  });
  
  // Make note items clickable to edit
  notesList.querySelectorAll('.notes-widget-item').forEach(item => {
    on(item, 'click', (e) => {
      if (e.target.classList.contains('notes-widget-item-btn')) {
        return;
      }
      e.stopPropagation(); // Prevent event from bubbling to document
      const noteId = item.dataset.noteId;
      loadNote(noteId);
    });
  });
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Toggle widget panel
function toggleWidget() {
  widgetPanel.classList.toggle('expanded');
  if (widgetPanel.classList.contains('expanded')) {
    displayNotes();
    noteContentInput.focus();
  }
}

// Close widget panel
function closeWidget() {
  widgetPanel.classList.remove('expanded');
  // Save current note when closing
  if (noteContentInput.value.trim()) {
    saveNote(false);
  }
}

// Event listeners
on(widgetToggle, 'click', toggleWidget);
on(widgetClose, 'click', closeWidget);
on(newBtn, 'click', newNote);
on(downloadAllBtn, 'click', downloadAllNotes);

// Autosave on input
on(noteContentInput, 'input', debouncedAutosave);

// Save on blur
on(noteContentInput, 'blur', () => {
  clearTimeout(autosaveTimeout);
  saveNote(false);
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && widgetPanel.classList.contains('expanded')) {
    closeWidget();
  }
});

// Close when clicking outside the widget
document.addEventListener('click', (e) => {
  // Only close if panel is expanded
  if (!widgetPanel.classList.contains('expanded')) {
    return;
  }
  
  // Don't close if clicking on the toggle button (it handles its own toggle)
  if (widgetToggle.contains(e.target) || widgetToggle === e.target) {
    return;
  }
  
  // Don't close if clicking inside the panel or any of its children
  if (widgetPanel.contains(e.target) || widgetPanel === e.target) {
    return;
  }
  
  // Don't close if clicking on the delete modal overlay
  const deleteModal = document.querySelector('.delete-modal-overlay');
  if (deleteModal && (deleteModal.contains(e.target) || deleteModal === e.target)) {
    return;
  }
  
  // Close if clicking outside both toggle and panel
  closeWidget();
});

// Add modal styles
const style = document.createElement('style');
style.textContent = `
  .delete-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    animation: fadeIn 0.2s;
  }
  
  .delete-modal {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.2s;
  }
  
  .delete-modal h3 {
    margin: 0 0 1rem 0;
    color: var(--text);
  }
  
  .delete-modal p {
    margin: 0.5rem 0;
    color: var(--text);
  }
  
  .modal-warning {
    color: var(--error);
    font-weight: 500;
  }
  
  .modal-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1.5rem;
    justify-content: flex-end;
  }
  
  .modal-btn {
    padding: 0.6rem 1.2rem;
    border-radius: 6px;
    border: 1px solid var(--border);
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }
  
  .modal-btn.cancel-btn {
    background: var(--bg-elev);
    color: var(--text);
  }
  
  .modal-btn.cancel-btn:hover {
    background: var(--bg-hover);
  }
  
  .modal-btn.delete-btn {
    background: var(--error);
    color: white;
    border-color: var(--error);
  }
  
  .modal-btn.delete-btn:hover {
    background: #d32f2f;
    border-color: #d32f2f;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);

// Initial display
displayNotes();

