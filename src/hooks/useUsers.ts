import { useState, useEffect } from 'react';
import UserController, { User } from '../controllers/UserController';
import { getAvatarStyle } from '../utils/avatarUtils';

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userController = UserController.getInstance();

  useEffect(() => {
    // Załaduj użytkowników z bazy danych przy pierwszym renderze
    const loadUsers = async () => {
      try {
        const cachedUsers = await userController.getUsers();
        setUsers(cachedUsers);
        console.log(`[useUsers] Loaded ${cachedUsers.length} users from database`);
      } catch (error) {
        console.error('[useUsers] Error loading users:', error);
        setError('Failed to load users');
      }
    };
    
    loadUsers();
  }, []);

  // Pobierz użytkownika po emailu
  const getUserByEmail = (email: string): User | undefined => {
    return users.find(user => user.email?.toLowerCase() === email.toLowerCase());
  };

  // Pobierz użytkownika po ID
  const getUserById = (id: string): User | undefined => {
    return users.find(user => user.id === id);
  };

  // Pobierz kolor użytkownika
  const getUserColor = (user: User): string => {
    return userController.getUserColor(user);
  };

  // Pobierz kolor użytkownika po emailu
  const getUserColorByEmail = (email: string): string | undefined => {
    const user = getUserByEmail(email);
    return user ? getUserColor(user) : undefined;
  };

  // Pobierz rolę użytkownika po emailu
  const getUserRoleByEmail = (email: string): string | undefined => {
    const user = getUserByEmail(email);
    return user?.role;
  };

  // Pobierz styl avatara użytkownika (z niestandardowym kolorem jeśli jest ustawiony)
  const getUserAvatarStyle = (displayName: string) => {
    const user = users.find(u => u.displayName === displayName);
    if (user && user.customColor) {
      return {
        ...getAvatarStyle(displayName),
        backgroundColor: user.customColor
      };
    }
    return getAvatarStyle(displayName);
  };

  // Aktualizuj kolor użytkownika
  const updateUserColor = async (displayName: string, color: string) => {
    const user = users.find(u => u.displayName === displayName);
    if (user) {
      try {
        const updatedUser = await userController.updateUser({
          id: user.id,
          customColor: color
        });
        if (updatedUser) {
          setUsers(prevUsers =>
            prevUsers.map(u =>
              u.id === user.id ? updatedUser : u
            )
          );
          console.log(`[useUsers] Updated color for user: ${displayName}`);
        }
      } catch (error) {
        console.error('[useUsers] Error updating user color:', error);
        setError('Failed to update user color');
      }
    }
  };

  // Aktualizuj użytkownika
  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const updatedUser = await userController.updateUser({ id: userId, ...updates });
      if (updatedUser) {
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId ? updatedUser : user
          )
        );
        console.log(`[useUsers] Updated user: ${updatedUser.displayName}`);
      }
    } catch (error) {
      console.error('[useUsers] Error updating user:', error);
      setError('Failed to update user');
    }
  };

  // Odśwież listę użytkowników z Jira
  const refreshUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const refreshedUsers = await userController.refreshFromJira();
      setUsers(refreshedUsers);
      console.log(`[useUsers] Refreshed ${refreshedUsers.length} users from Jira`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh users from Jira';
      setError(errorMessage);
      console.error('[useUsers] Error refreshing users:', err);
      
      // Fallback do lokalnych danych
      try {
        const cachedUsers = await userController.getUsers();
        setUsers(cachedUsers);
        console.log(`[useUsers] Fallback to ${cachedUsers.length} cached users`);
      } catch (fallbackError) {
        console.error('[useUsers] Error loading fallback users:', fallbackError);
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
    error,
    getUserByEmail,
    getUserById,
    getUserColor,
    getUserColorByEmail,
    getUserRoleByEmail,
    getUserAvatarStyle,
    updateUserColor,
    updateUser,
    refreshUsers
  };
};

export default useUsers;