/**
 * STORAGE & DATABASE ENGINE FOR TTRPG COLLECTION
 * Manages loading, saving, image conversion, and JSON/JS export for the collection.
 */

const STORAGE_KEY = 'retro_rpg_books_v1';

const TTRPGStorage = {
  /**
   * Retrieves the current list of books.
   * If none exist in localStorage, seeds from window.rpgBooksData.
   */
  getBooks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Error reading localStorage books:", err);
    }
    // Fallback to default books from books-data.js
    if (window.rpgBooksData && Array.isArray(window.rpgBooksData)) {
      this.saveBooks(window.rpgBooksData);
      return window.rpgBooksData;
    }
    return [];
  },

  /**
   * Saves book list to localStorage and triggers storage event.
   */
  saveBooks(books) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
      window.dispatchEvent(new Event('ttrpg-books-updated'));
      return true;
    } catch (err) {
      console.error("Failed to save books:", err);
      if (err.name === 'QuotaExceededError') {
        alert("WARNING: LocalStorage quota exceeded. Image files might be too large. Try smaller images!");
      }
      return false;
    }
  },

  /**
   * Get single book by ID
   */
  getBookById(id) {
    const books = this.getBooks();
    return books.find(b => b.id === id) || null;
  },

  /**
   * Add or update a book.
   */
  upsertBook(book) {
    const books = this.getBooks();
    const index = books.findIndex(b => b.id === book.id);
    if (index >= 0) {
      books[index] = { ...books[index], ...book };
    } else {
      // New book, prepend or append
      if (!book.id) {
        book.id = 'book-' + Date.now();
      }
      books.unshift(book);
    }
    this.saveBooks(books);
    return book;
  },

  /**
   * Delete a book by ID.
   */
  deleteBook(id) {
    let books = this.getBooks();
    books = books.filter(b => b.id !== id);
    this.saveBooks(books);
    return books;
  },

  /**
   * Reset collection back to original 19 default books.
   */
  resetToDefaults() {
    if (window.rpgBooksData && Array.isArray(window.rpgBooksData)) {
      this.saveBooks(window.rpgBooksData);
      return window.rpgBooksData;
    }
    return [];
  },

  /**
   * Export collection to downloadable JSON file.
   */
  exportJson() {
    const books = this.getBooks();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(books, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ttrpg_collection_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  /**
   * Export collection formatted as updated books-data.js file.
   */
  exportJsFile() {
    const books = this.getBooks();
    const fileContent = `/**
 * 1980s & 1990s TTRPG BOOK COMPENDIUM
 * Master archive of vintage D&D and Tabletop RPG rulebooks, boxed sets, and supplements.
 * Exported on ${new Date().toLocaleString()}
 */

const rpgBooksData = ${JSON.stringify(books, null, 2)};

// Export to window for browser usage
window.rpgBooksData = rpgBooksData;
`;
    const dataStr = "data:text/javascript;charset=utf-8," + encodeURIComponent(fileContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "books-data.js");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  /**
   * Import collection from JSON text or object.
   */
  importJson(jsonData) {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.saveBooks(parsed);
        return { success: true, count: parsed.length };
      }
      return { success: false, error: "JSON must contain an array of books." };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

window.TTRPGStorage = TTRPGStorage;
