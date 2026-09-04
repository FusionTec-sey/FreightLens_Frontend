
export function formatDateTime12hr(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return null;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

export function convertToLocalDateTimeInput(isoTimestamp) {
    /**
     * Converts ISO timestamp to 'YYYY-MM-DDTHH:mm' format
     * suitable for <input type="datetime-local"> without timezone conversion
     * 
     * @param {string} isoTimestamp - ISO string (e.g., "2025-08-10T18:00:00+04:00")
     * @returns {string|null} - Formatted string like "2025-08-10T18:00", or null on error
     */
    try {
        if (!isoTimestamp) return null;
        // Create a Date object from ISO timestamp
        const date = new Date(isoTimestamp);

        if (isNaN(date.getTime())) return null;

        // Get date parts in local time
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
        console.error('Error converting timestamp:', error);
        return null;
    }
}
