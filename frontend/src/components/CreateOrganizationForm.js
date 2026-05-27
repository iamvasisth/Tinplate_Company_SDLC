// frontend/src/components/CreateOrganizationForm.js
import React, { useState } from 'react';
import { apiRequest } from '../api';
import './CreateOrganizationForm.css';

const CreateOrganizationForm = ({ username = "utsargtiwary55" }) => {
  const [formData, setFormData] = useState({
    orgName: '',
    orgLocation: 'India',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.orgName.trim()) newErrors.orgName = 'Organization name is required';
    if (!formData.orgLocation.trim()) newErrors.orgLocation = 'Organization location is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const data = await apiRequest('/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.orgName,
          location: formData.orgLocation,
        }),
      });
      alert(`Organization "${formData.orgName}" created successfully!`);
      setFormData({ orgName: '', orgLocation: 'India' });
      setErrors({});
    } catch (error) {
      alert(error.message || 'Error creating organization. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({ orgName: '', orgLocation: 'India' });
    setErrors({});
  };

  const handlePrivacyPolicy = () => {
    window.open('/privacy-policy', '_blank');
  };

  return (
    <div className="create-org-container">
      <div className="create-org-card">
        <h1 className="welcome-title">Welcome {username}</h1>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Organization Name <span className="required-star">*</span></label>
            <input
              type="text"
              name="orgName"
              value={formData.orgName}
              onChange={handleChange}
              placeholder="Enter organization name"
              className={errors.orgName ? 'error-input' : ''}
              disabled={isSubmitting}
            />
            {errors.orgName && <span className="error-message">{errors.orgName}</span>}
          </div>

          <div className="form-group">
            <label>Organization Location <span className="required-star">*</span></label>
            <select
              name="orgLocation"
              value={formData.orgLocation}
              onChange={handleChange}
              className={errors.orgLocation ? 'error-input' : ''}
              disabled={isSubmitting}
            >
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Germany">Germany</option>
              <option value="Other">Other</option>
            </select>
            {errors.orgLocation && <span className="error-message">{errors.orgLocation}</span>}
          </div>

          <div className="signin-note">
            To create an organization with another country, <a href="/signin">sign in here</a>.
          </div>

          <div className="button-group">
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : "Let's get started!"}
            </button>
            <button type="button" className="btn-secondary" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </button>
          </div>

          <div className="privacy-link">
            <button type="button" className="link-button" onClick={handlePrivacyPolicy}>
              Privacy Policy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrganizationForm;