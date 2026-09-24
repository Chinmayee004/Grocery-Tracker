import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useGrocerySocket } from './hooks/useGrocerySocket';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import ItemInput from './components/ItemInput';
import GroceryList from './components/GroceryList';
import AuthModal from './components/AuthModal';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

function Dashboard() {
  const { session } = useAuth();
  const token = session?.access_token || null;

  const {
    items,
    isLoading,
    fetchError,
    isConnected,
    addItem,
    toggleItem,
    deleteItem,
    refresh,
  } = useGrocerySocket(token);

  return (
    <div className="app-container">
      <Navbar isConnected={isConnected} />

      <main className="main-content">
        <StatsBar items={items} />

        <ItemInput onAddItem={addItem} disabled={!isConnected} />

        {fetchError && (
          <div className="auth-alert" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <strong>Failed to load grocery items:</strong> {fetchError}
            </div>
            <button
              type="button"
              onClick={refresh}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: 'inherit',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="loading-container">
            <Loader2 size={32} className="spin-icon" color="var(--sage-dark)" />
            <p>Fetching your grocery items...</p>
          </div>
        ) : (
          <GroceryList
            items={items}
            onToggle={toggleItem}
            onDelete={deleteItem}
          />
        )}
      </main>
    </div>
  );
}

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <Loader2 size={40} className="spin-icon" color="var(--sage-dark)" />
        <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>
          Loading your session...
        </p>
      </div>
    );
  }

  // If user is not authenticated, block access to the list and render AuthModal
  if (!user) {
    return <AuthModal />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
