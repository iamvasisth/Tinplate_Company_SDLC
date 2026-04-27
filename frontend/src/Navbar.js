import React from 'react';
import { useNavigate } from 'react-router-dom';

function Navbar({ onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="navbar">
      <h3>My App</h3>

      <div>
        <button onClick={() => navigate('/dashboard')}>
          Dashboard
        </button>

        <button onClick={onLogout} style={{ marginLeft: '10px' }}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Navbar;