/**
 * CLEAR SESSION UTILITY
 * 
 * If you encounter "Invalid Refresh Token" errors, you can:
 * 
 * Option 1: Run this in browser console (F12):
 * -------------------------------------------
 * Copy and paste this entire block:
 */

// Clear all Supabase session data
function clearSupabaseSession() {
  console.log('🧹 Clearing Supabase session data...');
  
  // Get all localStorage keys
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-')) {
      keysToRemove.push(key);
    }
  }
  
  // Remove all Supabase keys
  keysToRemove.forEach(key => {
    console.log(`  Removing: ${key}`);
    localStorage.removeItem(key);
  });
  
  // Clear session storage as well
  sessionStorage.clear();
  
  console.log(`✅ Cleared ${keysToRemove.length} session items`);
  console.log('🔄 Please refresh the page and login again');
  
  return {
    cleared: keysToRemove.length,
    keys: keysToRemove
  };
}

// Run the function
clearSupabaseSession();

/**
 * Option 2: Use this in your code
 * --------------------------------
 * Import and call this function when needed:
 * 
 * import { clearSupabaseSession } from './clear-session'
 * clearSupabaseSession()
 */

// Export for use in Node.js/ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clearSupabaseSession };
}

// Export for ES modules
if (typeof exports !== 'undefined') {
  exports.clearSupabaseSession = clearSupabaseSession;
}

