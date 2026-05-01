/**
 * Register.js – User registration with business type
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from './api';
import toast from 'react-hot-toast';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessType, setBusinessType] = useState('Other');

  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }

    try {
      const data = await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          business_type: businessType
        })
      });

      if (data && data.user) {
        toast.success('Registration successful! Please login.');
        navigate('/');
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Register</h2>

        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="input"
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select
          className="input"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
        >
          <option value="Other">Other</option>
          <option value="School">School</option>
          <option value="Hospital">Hospital</option>
          <option value="Retail">Retail</option>
          <option value="Manufacturing">Manufacturing</option>
        </select>

        <button className="button" onClick={handleRegister}>
          Register
        </button>

        <p className="message">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;