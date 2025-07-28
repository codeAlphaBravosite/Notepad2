import { StorageManager } from './storage.js';

export class NoteManager {
  constructor() {
    this.notes = StorageManager.load('notes', []);
  }

  createNote() {
    const initialToggles = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      title: `Section ${i + 1}`,
      content: '',
      isOpen: i === 0
    }));

    const note = {
      id: Date.now(),
      title: '',
      toggles: initialToggles,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    this.notes.unshift(note);
    this.saveNotes();
    return note;
  }

  updateNote(note) {
    note.updated = new Date().toISOString();
    const index = this.notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      this.notes[index] = JSON.parse(JSON.stringify(note));
      this.saveNotes();
    }
  }

  deleteNote(noteId) {
    this.notes = this.notes.filter(note => note.id !== noteId);
    this.saveNotes();
  }

  getNotes(searchTerm = '') {
    return this.notes.filter(note => {
      const titleMatch = note.title.toLowerCase().includes(searchTerm);
      const contentMatch = note.toggles.some(toggle => 
        toggle.title.toLowerCase().includes(searchTerm) ||
        toggle.content.toLowerCase().includes(searchTerm)
      );
      return titleMatch || contentMatch;
    });
  }

  // --- ADDED: NEW METHODS FOR IMPORT/EXPORT ---

  /**
   * Returns all notes as a JSON string for export.
   * @returns {string} All notes formatted as a JSON string.
   */
  exportNotes() {
    return JSON.stringify(this.notes, null, 2); // null, 2 for pretty-printing
  }
  
  /**
   * Imports and merges notes from a JSON string with existing notes.
   * Does not overwrite. If an imported note has an ID that already exists,
   * it's re-created as a new note with a new unique ID.
   * @param {string} jsonString The JSON string of notes to import.
   * @returns {boolean} True if import was successful, false otherwise.
   */
  importAndMergeNotes(jsonString) {
    try {
      const importedNotes = JSON.parse(jsonString);

      if (!this._validateImportData(importedNotes)) {
        console.error('Import validation failed. The file is not a valid notes backup.');
        return false;
      }
      
      const existingIds = new Set(this.notes.map(note => note.id));
      let newNotesAdded = 0;

      importedNotes.forEach(importedNote => {
        let noteToAdd = { ...importedNote };

        if (existingIds.has(noteToAdd.id)) {
          // CONFLICT: The imported note's ID already exists.
          // Create it as a new note with a new unique ID to avoid conflicts.
          noteToAdd.id = Date.now() + newNotesAdded;
          noteToAdd.title = noteToAdd.title ? `${noteToAdd.title} (Imported)` : 'Untitled Note (Imported)';
          
          // Generate new IDs for all its internal toggles as well.
          noteToAdd.toggles = noteToAdd.toggles.map((toggle, i) => ({
            ...toggle,
            id: noteToAdd.id + i + 1
          }));
        }
        
        this.notes.unshift(noteToAdd); 
        newNotesAdded++;
      });
      
      this.saveNotes();
      return true;

    } catch (error) {
      console.error('Failed to parse or import notes:', error);
      return false;
    }
  }

  /**
   * Validates the structure of the data to be imported.
   * @private
   * @param {any} data The data parsed from the JSON file.
   * @returns {boolean} True if the data is valid, false otherwise.
   */
  _validateImportData(data) {
    if (!Array.isArray(data)) {
      console.error('Validation Error: Imported data is not an array.');
      return false;
    }

    for (const note of data) {
      const hasBaseKeys = 'id' in note && 'title' in note && 'toggles' in note && 'created' in note && 'updated' in note;
      if (!hasBaseKeys || !Array.isArray(note.toggles)) {
        console.error('Validation Error: A note is missing required keys or `toggles` is not an array.', note);
        return false;
      }
      
      for(const toggle of note.toggles) {
         const hasToggleKeys = 'id' in toggle && 'title' in toggle && 'content' in toggle && 'isOpen' in toggle;
         if (!hasToggleKeys) {
            console.error('Validation Error: A toggle is missing required keys.', toggle);
            return false;
         }
      }
    }

    return true;
  }
  
  // --- END OF NEW METHODS ---

  saveNotes() {
    StorageManager.save('notes', this.notes);
  }
}