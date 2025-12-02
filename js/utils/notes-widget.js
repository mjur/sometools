// Reusable Notes Widget Module
// Can be imported and initialized on any page

import { toast, on, qs } from '/js/ui.js';

const STORAGE_KEY = 'notes-tool-notes'; // Same storage as main notes tool
const TITLE_LENGTH = 50;

// Initialize notes widget on a page
export function initNotesWidget() {
  // Check if widget already exists
  if (document.getElementById('notes-widget')) {
    console.log('Notes widget already initialized');
    return;
  }

  // Create widget HTML
  const widgetHTML = `
    <div id="notes-widget" class="notes-widget">
      <div class="notes-widget-toggle" id="notes-widget-toggle">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span>Notes</span>
      </div>
      <div class="notes-widget-panel" id="notes-widget-panel">
        <div class="notes-widget-header">
          <h3>Notes</h3>
          <button class="notes-widget-close" id="notes-widget-close" aria-label="Close notes">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="notes-widget-content">
          <div class="notes-widget-sidebar">
            <div class="notes-widget-sidebar-header">
              <span id="notes-widget-count" class="notes-widget-count">0 notes</span>
              <button id="notes-widget-download-all" class="notes-widget-btn-small">Download All</button>
            </div>
            <div id="notes-widget-list" class="notes-widget-list"></div>
          </div>
          <div class="notes-widget-editor">
            <textarea id="notes-widget-content-input" placeholder="Enter your note content here..." rows="15"></textarea>
            <div class="notes-widget-actions">
              <button id="notes-widget-new" class="notes-widget-btn">New Note</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add widget to body
  document.body.insertAdjacentHTML('beforeend', widgetHTML);

  // Add CSS if not already added
  if (!document.getElementById('notes-widget-styles')) {
    const style = document.createElement('style');
    style.id = 'notes-widget-styles';
    style.textContent = `
      /* Notes Widget Styles */
      .notes-widget {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
      }
      
      .notes-widget-toggle {
        background: var(--accent);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 0.75rem 1.25rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        font-size: 0.9rem;
        font-weight: 500;
      }
      
      .notes-widget-toggle:hover {
        background: #1976d2;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        transform: translateY(-2px);
      }
      
      .notes-widget-toggle svg {
        width: 20px;
        height: 20px;
      }
      
      .notes-widget-panel {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 800px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 120px);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: slideDown 0.3s ease;
      }
      
      .notes-widget-panel.expanded {
        display: flex;
      }
      
      .notes-widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border);
        background: var(--bg-elev);
      }
      
      .notes-widget-header h3 {
        margin: 0;
        font-size: 1.2rem;
      }
      
      .notes-widget-close {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text);
        border-radius: 4px;
        transition: background 0.2s;
      }
      
      .notes-widget-close:hover {
        background: var(--bg-hover);
      }
      
      .notes-widget-content {
        display: grid;
        grid-template-columns: 280px 1fr;
        flex: 1;
        overflow: hidden;
        min-height: 0;
      }
      
      .notes-widget-sidebar {
        background: var(--bg-elev);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .notes-widget-sidebar-header {
        padding: 1rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }
      
      .notes-widget-count {
        font-size: 0.875rem;
        color: var(--muted);
      }
      
      .notes-widget-btn-small {
        padding: 0.4rem 0.8rem;
        font-size: 0.8rem;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .notes-widget-btn-small:hover {
        background: var(--bg-hover);
      }
      
      .notes-widget-list {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
      }
      
      .notes-widget-item {
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .notes-widget-item:hover {
        background: var(--bg-hover);
        border-color: var(--accent);
      }
      
      .notes-widget-item.active {
        background: var(--bg-hover);
        border-color: var(--accent);
        border-width: 2px;
      }
      
      .notes-widget-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }
      
      .notes-widget-item-title {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 600;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .notes-widget-item-actions {
        display: flex;
        gap: 0.25rem;
        flex-shrink: 0;
      }
      
      .notes-widget-item-btn {
        background: transparent;
        border: 1px solid var(--border);
        padding: 0.2rem;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        transition: all 0.2s;
      }
      
      .notes-widget-item-btn:hover {
        background: var(--bg-hover);
      }
      
      .notes-widget-item-btn.delete:hover {
        background: var(--error);
        border-color: var(--error);
        color: white;
      }
      
      .notes-widget-item-btn svg {
        width: 14px;
        height: 14px;
      }
      
      .notes-widget-editor {
        display: flex;
        flex-direction: column;
        padding: 1.5rem;
        overflow: hidden;
      }
      
      .notes-widget-editor textarea {
        flex: 1;
        min-height: 200px;
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--bg);
        color: var(--text);
        font-family: inherit;
        font-size: 0.9rem;
        resize: none;
      }
      
      .notes-widget-actions {
        margin-top: 1rem;
      }
      
      .notes-widget-btn {
        padding: 0.6rem 1.2rem;
        background: var(--bg-elev);
        border: 1px solid var(--border);
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
      }
      
      .notes-widget-btn:hover {
        background: var(--bg-hover);
      }
      
      .notes-widget-placeholder {
        padding: 2rem;
        text-align: center;
        color: var(--muted);
        font-size: 0.9rem;
      }
      
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
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @media (max-width: 900px) {
        .notes-widget-panel {
          width: calc(100vw - 40px);
          right: 20px;
          left: 20px;
        }
        
        .notes-widget-content {
          grid-template-columns: 1fr;
        }
        
        .notes-widget-sidebar {
          border-right: none;
          border-bottom: 1px solid var(--border);
          max-height: 200px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize widget functionality
  initWidgetFunctionality();
  
  // Also initialize model cache widget
  import('/js/utils/model-cache-widget.js').then(module => {
    if (module && module.initModelCacheWidget) {
      module.initModelCacheWidget();
    }
  }).catch(err => {
    console.log('Model cache widget not available:', err);
  });
}

// Initialize widget functionality
function initWidgetFunctionality() {
  let currentNoteId = null;
  let originalContent = '';
  let isLoadingNote = false;

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
    // CRITICAL: Never save if we're in the middle of loading a note
    if (isLoadingNote) {
      return;
    }
    
    const content = noteContentInput.value.trim();
    
    // Don't save empty notes
    if (!content) {
      return;
    }
    
    // Check if content actually changed (compare trimmed versions)
    if (currentNoteId) {
      const originalContentTrimmed = (originalContent || '').trim();
      if (content === originalContentTrimmed) {
        // Content hasn't changed, don't save
        return;
      }
    }
    
    const notes = loadNotes();
    const noteId = currentNoteId || generateId();
    
    // If this is an existing note, check if content actually changed by comparing with stored content
    if (notes[noteId]) {
      const storedContentTrimmed = (notes[noteId].content || '').trim();
      const currentContentTrimmed = content.trim();
      
      // If content hasn't changed, don't save at all
      if (storedContentTrimmed === currentContentTrimmed) {
        // Content unchanged, just update tracked content and return
        originalContent = content;
        return;
      }
    }
    
    // Content has changed (or it's a new note), proceed with save
    const now = Date.now();
    const title = generateTitle(content);
    
    if (notes[noteId]) {
      // Content has changed, update it
      notes[noteId].title = title;
      notes[noteId].content = content;
      notes[noteId].updated = now;
      originalContent = content; // Update tracked content (already trimmed)
      if (showToast) {
        toast('Note updated', 'success');
      }
      // Save to storage and update display
      if (saveNotes(notes)) {
        displayNotes();
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
      originalContent = content; // Track the new content (already trimmed)
      if (showToast) {
        toast('Note saved', 'success');
      }
      // Save to storage and update display
      if (saveNotes(notes)) {
        displayNotes();
      }
    }
  }

  // Debounce function for autosave
  let autosaveTimeout = null;
  function debouncedAutosave() {
    // Don't autosave if we're loading a note programmatically
    if (isLoadingNote) {
      return;
    }
    clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(() => {
      saveNote(false);
    }, 1000);
  }

  // Create new note
  function newNote() {
    // Save current note before creating new one (only if changed)
    if (noteContentInput.value.trim()) {
      const currentContent = noteContentInput.value.trim();
      // Only save if content actually changed
      if (!currentNoteId || currentContent !== originalContent) {
        saveNote(false);
      }
    }
    
    // Set flag to prevent autosave from triggering when we clear the value
    isLoadingNote = true;
    
    currentNoteId = null;
    originalContent = '';
    noteContentInput.value = '';
    noteContentInput.focus();
    displayNotes();
    
    // Clear the flag after a short delay
    setTimeout(() => {
      isLoadingNote = false;
    }, 100);
  }

  // Load note for editing
  function loadNote(noteId) {
    // Don't reload if it's already the current note
    if (currentNoteId === noteId) {
      return;
    }
    
    // Clear any pending autosave immediately
    clearTimeout(autosaveTimeout);
    autosaveTimeout = null;
    
    // Set flag EARLY to prevent any autosave from triggering
    isLoadingNote = true;
    
    const notes = loadNotes();
    const note = notes[noteId];
    
    if (note) {
      // Save current note first ONLY if it has changes (only if changed)
      // Do this check BEFORE loading the new note
      if (currentNoteId && noteContentInput.value.trim()) {
        const currentContent = noteContentInput.value.trim();
        const originalContentTrimmed = (originalContent || '').trim();
        
        // Only save if content actually changed (compare trimmed versions)
        if (currentContent !== originalContentTrimmed) {
          // Temporarily allow save for the previous note
          const wasLoading = isLoadingNote;
          isLoadingNote = false;
          saveNote(false);
          isLoadingNote = wasLoading;
        }
        // If content hasn't changed, do NOT save - just skip it
      }
      
      // Now load the new note
      // IMPORTANT: Set originalContent to the trimmed content to match what we compare against
      // This must be set BEFORE changing currentNoteId to prevent any race conditions
      const noteContentTrimmed = (note.content || '').trim();
      originalContent = noteContentTrimmed; // Store trimmed version for accurate comparison
      currentNoteId = noteId;
      
      // Set the value - this might trigger input event, but isLoadingNote is true so saveNote will return early
      // Use a small delay to ensure flag is set before value change
      setTimeout(() => {
        noteContentInput.value = note.content;
        noteContentInput.focus();
        
        // Update display immediately to show active state
        displayNotes();
      }, 10);
      
      // Clear the flag after events have settled (longer delay to be safe)
      setTimeout(() => {
        isLoadingNote = false;
      }, 1000);
    } else {
      // Note not found, clear the flag
      isLoadingNote = false;
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
    // Save current note when closing (only if changed)
    if (noteContentInput.value.trim()) {
      const content = noteContentInput.value.trim();
      // Only save if content actually changed
      if (!currentNoteId || content !== originalContent) {
        saveNote(false);
      }
    }
  }

  // Event listeners
  on(widgetToggle, 'click', toggleWidget);
  on(widgetClose, 'click', closeWidget);
  on(newBtn, 'click', newNote);
  on(downloadAllBtn, 'click', downloadAllNotes);

  // Set up event delegation for notes list (only once, not on every render)
  // This handles clicks on note items and buttons
  on(notesList, 'click', (e) => {
    // Find the closest note item
    const noteItem = e.target.closest('.notes-widget-item');
    if (!noteItem) return;
    
    // Check if clicking on a button
    const btn = e.target.closest('.notes-widget-item-btn');
    if (btn) {
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
      return;
    }
    
    // Clicking on the note item itself (not a button)
    e.stopPropagation(); // Prevent event from bubbling to document
    const noteId = noteItem.dataset.noteId;
    if (noteId) {
      loadNote(noteId);
    }
  });

  // Autosave on input
  on(noteContentInput, 'input', (e) => {
    // Only autosave if we're not loading a note
    if (!isLoadingNote) {
      debouncedAutosave();
    }
  });

  // Save on blur (only if changed)
  on(noteContentInput, 'blur', () => {
    // CRITICAL: Never save on blur if we're loading a note
    if (isLoadingNote) {
      return;
    }
    
    clearTimeout(autosaveTimeout);
    autosaveTimeout = null;
    
    const content = noteContentInput.value.trim();
    const originalContentTrimmed = (originalContent || '').trim();
    
    // Only save if content actually changed
    if (content && currentNoteId && content !== originalContentTrimmed) {
      saveNote(false);
    } else if (content && !currentNoteId) {
      // New note with content
      saveNote(false);
    }
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

  // Initial display
  displayNotes();
}



