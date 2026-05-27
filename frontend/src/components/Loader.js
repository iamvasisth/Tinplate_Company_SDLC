import React from 'react';
import './Loader.css';

export const FullPageLoader = () => (
  <div className="full-page-loader">
    <div className="spinner">
      <div className="double-bounce1"></div>
      <div className="double-bounce2"></div>
    </div>
    <p className="loading-text">Loading RUP Books...</p>
  </div>
);

export const ContentLoader = () => (
  <div className="content-loader">
    <div className="bounce-spinner">
      <div className="bounce1"></div>
      <div className="bounce2"></div>
      <div className="bounce3"></div>
    </div>
  </div>
);

export const ButtonSpinner = () => (
  <span className="button-spinner"></span>
);
