import React, { useState, useEffect } from 'react';
import { getInitials, generateUserColor } from '../utils/avatarUtils';
import AnimatedTooltip from './AnimatedTooltip';
import { useUsers } from '../hooks/useUsers';

const UserManagement: React.FC = () => {
  const {
    users,
    loading,
    error,
    getUserAvatarStyle,
    updateUser,
    refreshUsers
  } = useUsers();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    // Załaduj użytkowników z localStorage przy pierwszym renderze
    // Nie odświeżaj automatycznie z Jira, aby zachować niestandardowe kolory
    // Użytkownik może ręcznie odświeżyć przyciskiem
    if (users.length === 0) {
      // Tylko jeśli nie ma użytkowników, spróbuj odświeżyć z Jira
      refreshUsers();
    }
  }, []);

  const handleEditUser = (user: any) => {
    setEditingUser(user.id);
    setEditForm({
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      customColor: user.customColor
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    await updateUser(editingUser, editForm);
    setEditingUser(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const getUserColor = (user: any) => {
    return getUserAvatarStyle(user.displayName).backgroundColor;
  };

  // Funkcja do wymuszenia odświeżenia danych
  const handleRefresh = () => {
    refreshUsers();
  };

  const availableColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b',
    '#6b7280', '#78716c'
  ];

  if (loading) {
    return (
      <div className="user-management">
        <div className="dashboard-header">
          <h1><i className="fas fa-users"></i> Zarządzanie użytkownikami</h1>
          <p>Edytuj dane użytkowników i personalizuj ich avatary</p>
        </div>
        <div className="kpi-card" style={{
            border: '1px solid var(--win11-dark-surface-stroke);'
        }}>
          <div className="loading" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '40px',
            color: 'var(--win11-dark-text-secondary)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(0, 95, 184, 0.3)',
              borderTop: '3px solid var(--win11-accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                <i className="fas fa-hourglass-half"></i> Ładowanie użytkowników zespołu Pixels...
              </div>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>
                Pobieranie danych z Jira...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-management">
        <div className="dashboard-header">
          <h1><i className="fas fa-users"></i> Zarządzanie użytkownikami</h1>
          <p>Edytuj dane użytkowników i personalizuj ich avatary</p>
        </div>
        <div className="kpi-card">
          <div className="error" style={{ textAlign: 'center', padding: '40px' }}>
            <h3><i className="fas fa-times-circle"></i> Błąd podczas pobierania użytkowników</h3>
            <p>{error}</p>
            <AnimatedTooltip content="Spróbuj ponownie" position="bottom">
              <button onClick={handleRefresh} className="refresh-icon-button">
                <i className="fas fa-redo-alt"></i> Odśwież
              </button>
            </AnimatedTooltip>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="dashboard-header">
        <h1><i className="fas fa-users"></i> Zarządzanie użytkownikami zespołu Pixels</h1>
        <p>Edytuj dane użytkowników i personalizuj ich avatary - dane pobrane z Jira</p>
        <AnimatedTooltip content="Odśwież listę użytkowników" position="bottom">
          <button onClick={handleRefresh} className="refresh-icon-button">
            <i className="fas fa-redo-alt"></i>
          </button>
        </AnimatedTooltip>
      </div>

      <div className="kpi-card">
        <h3><i className="fas fa-user-cog"></i> Lista użytkowników ({users.length})</h3>
        
        <div className="users-grid">
          {users.map(user => (
            <div key={user.id} className="user-card">
              {editingUser === user.id ? (
                // Tryb edycji
                <div className="user-edit-form">
                  <div className="user-avatar-section">
                    <div
                      className="user-avatar-large"
                      style={{
                        ...getUserAvatarStyle(editForm.displayName || user.displayName),
                        backgroundColor: editForm.customColor || getUserColor(user),
                        width: '80px',
                        height: '80px',
                        fontSize: '24px'
                      }}
                    >
                      {getInitials(editForm.displayName || user.displayName)}
                    </div>
                    
                    <div className="color-picker">
                      <label>Kolor avatara:</label>
                      <div className="color-options">
                        {availableColors.map(color => (
                          <div
                            key={color}
                            className={`color-option ${editForm.customColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditForm({ ...editForm, customColor: color })}
                          />
                        ))}
                        <div
                          className={`color-option ${!editForm.customColor ? 'selected' : ''}`}
                          style={{ 
                            backgroundColor: generateUserColor(user.displayName),
                            border: '2px solid #fff',
                            position: 'relative'
                          }}
                          onClick={() => setEditForm({ ...editForm, customColor: undefined })}
                        >
                          <span style={{ 
                            position: 'absolute', 
                            top: '50%', 
                            left: '50%', 
                            transform: 'translate(-50%, -50%)',
                            fontSize: '10px',
                            color: '#fff',
                            fontWeight: 'bold'
                          }}>AUTO</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-fields">
                    <div className="form-group">
                      <label>Imię i nazwisko:</label>
                      <input
                        type="text"
                        value={editForm.displayName || ''}
                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Email:</label>
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Rola:</label>
                      <input
                        type="text"
                        value={editForm.role || ''}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      />
                    </div>

                    <div className="form-actions">
                      <button className="save-button" onClick={handleSaveUser}>
                        <i className="fas fa-save"></i> Zapisz
                      </button>
                      <button className="cancel-button" onClick={handleCancelEdit}>
                        <i className="fas fa-times"></i> Anuluj
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Tryb wyświetlania
                <div className="user-display">
                  <div className="user-avatar-section">
                    <div
                      className="user-avatar-large"
                      style={{
                        ...getUserAvatarStyle(user.displayName),
                        backgroundColor: getUserColor(user),
                        width: '60px',
                        height: '60px',
                        fontSize: '18px'
                      }}
                    >
                      {getInitials(user.displayName)}
                    </div>
                  </div>

                  <div className="user-info">
                    <h4>{user.displayName}</h4>
                    <p className="user-email">{user.email}</p>
                    <p className="user-role">{user.role}</p>
                    {user.customColor && (
                      <p className="user-custom-color">
                        <i className="fas fa-palette"></i> Niestandardowy kolor
                      </p>
                    )}
                  </div>

                  <div className="user-actions">
                    <AnimatedTooltip content="Edytuj użytkownika" position="top">
                      <button 
                        className="edit-button"
                        onClick={() => handleEditUser(user)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                    </AnimatedTooltip>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;