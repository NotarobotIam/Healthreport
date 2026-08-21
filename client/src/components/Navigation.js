import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestDigitalTwinHandoff } from '../api';
import './Navigation.css';

const DIGITAL_TWIN_URL = 'http://localhost:5183';

function Navigation({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  // Hands the current session off to the digital-twin app (a different
  // origin, so it can't read this app's localStorage token) via a
  // short-lived, single-use code rather than putting the real JWT in a URL.
  // Opens in a NAMED window so clicking the link again reuses the same tab
  // instead of piling up new ones. Falls back to an unauthenticated open if
  // the handoff request fails, rather than blocking navigation entirely.
  const openDigitalTwin = async (e) => {
    e.preventDefault();
    try {
      const res = await requestDigitalTwinHandoff();
      window.open(`${DIGITAL_TWIN_URL}?code=${res.data.code}`, 'digital-twin');
    } catch (err) {
      window.open(DIGITAL_TWIN_URL, 'digital-twin');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          🏥 HealthReport Dashboard
        </Link>
        <div className="navbar-menu">
          <Link to="/dashboard" className="nav-link">
            Dashboard
          </Link>
          <Link to="/transpose" className="nav-link">
            Data Analysis
          </Link>
          <Link to="/profile" className="nav-link">
            Profile
          </Link>
          <a
            href={DIGITAL_TWIN_URL}
            onClick={openDigitalTwin}
            target="digital-twin"
            rel="noopener noreferrer"
            className="nav-link"
          >
            Digital Twin
          </a>
          <span className="nav-user">Welcome, {user.name}</span>
          <button className="nav-logout btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
