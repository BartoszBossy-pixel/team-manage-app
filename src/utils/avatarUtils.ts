/**
 * Utility functions for generating personalized user avatars
 */

/**
 * Generate a consistent color for a user based on their name
 * Uses a simple hash function to ensure the same name always gets the same color
 */
export const generateUserColor = (displayName: string): string => {
  if (!displayName) return '#6b7280'; // Default gray for empty names
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    const char = displayName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert hash to positive number
  const positiveHash = Math.abs(hash);
  
  // Predefined set of pleasant colors for avatars
  const colors = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#f59e0b', // amber-500
    '#eab308', // yellow-500
    '#84cc16', // lime-500
    '#22c55e', // green-500
    '#10b981', // emerald-500
    '#14b8a6', // teal-500
    '#06b6d4', // cyan-500
    '#0ea5e9', // sky-500
    '#3b82f6', // blue-500
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#a855f7', // purple-500
    '#d946ef', // fuchsia-500
    '#ec4899', // pink-500
    '#f43f5e', // rose-500
    '#64748b', // slate-500
    '#6b7280', // gray-500
    '#78716c', // stone-500
  ];
  
  return colors[positiveHash % colors.length];
};

/**
 * Generate initials from a display name
 */
export const getInitials = (displayName: string): string => {
  if (!displayName) return 'UN';
  
  const nameParts = displayName.trim().split(' ');
  if (nameParts.length >= 2) {
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  } else if (nameParts.length === 1) {
    return nameParts[0].substring(0, 2).toUpperCase();
  }
  return 'UN';
};

/**
 * Generate avatar style with personalized background color
 */
export const getAvatarStyle = (displayName: string): React.CSSProperties => {
  const backgroundColor = generateUserColor(displayName);
  
  return {
    backgroundColor,
    color: '#ffffff',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    fontSize: '12px',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
    border: '2px solid rgba(255,255,255,0.2)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };
};