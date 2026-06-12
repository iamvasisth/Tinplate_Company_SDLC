import React from 'react';
import Skeleton from './Skeleton';
import './Skeleton.css';

const FormSkeleton = ({ fields = 4 }) => {
  return (
    <div className="form-skeleton">
      <Skeleton width="30%" height="28px" style={{ marginBottom: "10px" }} />
      
      {Array.from({ length: Math.ceil(fields / 2) }).map((_, i) => (
        <div key={i} className="form-skeleton-row">
          <div className="form-skeleton-field">
            <Skeleton width="40%" height="16px" />
            <Skeleton width="100%" height="40px" />
          </div>
          <div className="form-skeleton-field">
            <Skeleton width="40%" height="16px" />
            <Skeleton width="100%" height="40px" />
          </div>
        </div>
      ))}

      <div style={{ marginTop: "20px" }}>
        <Skeleton width="100%" height="100px" />
      </div>
      
      <div className="form-skeleton-row" style={{ marginTop: "20px" }}>
        <Skeleton width="120px" height="40px" />
        <Skeleton width="120px" height="40px" />
      </div>
    </div>
  );
};

export default FormSkeleton;
