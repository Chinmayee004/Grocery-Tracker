import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, LogOut, Wifi, WifiOff } from 'lucide-react';

export default function Navbar({ isConnected }) {
  const { user, signOut } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <ShoppingBag size={20} />
          </div>
          <h1 className="brand-title">Shared Grocery List</h1>
        </div>

        <div className="nav-actions">
          {/* Real-time WebSocket connection indicator */}
          <div
            className={`socket-badge ${isConnected ? 'connected' : 'disconnected'}`}
            title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to WebSocket server...'}
          >
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            <span>{isConnected ? 'Live Sync' : 'Reconnecting...'}</span>
          </div>

          {/* User Profile Pill & Signout */}
          {user && (
            <>
              <div className="user-pill" title={`Logged in as ${user.email}`}>
                <span>{user.email}</span>
                {user.isDemo && (
                  <span style={{ fontSize: '0.72rem', background: '#ffd2c2', color: '#3a2a24', padding: '2px 6px', borderRadius: 4, marginLeft: 6, fontWeight: 700 }}>Demo</span>
                )}
              </div>
              <button
                type="button"
                className="btn-signout"
                onClick={signOut}
                title="Sign out of account"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
