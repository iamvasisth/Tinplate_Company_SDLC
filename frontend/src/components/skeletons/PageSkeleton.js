import React from 'react';
import Skeleton from './Skeleton';
import './Skeleton.css';

const PageSkeleton = () => {
  return (
    <div className="page-skeleton">
      <div className="page-skeleton-header">
        <div>
          <Skeleton width="200px" height="32px" style={{ marginBottom: "8px" }} />
          <Skeleton width="120px" height="16px" />
        </div>
        <div className="page-skeleton-actions">
          <Skeleton width="100px" height="40px" />
          <Skeleton width="120px" height="40px" />
        </div>
      </div>
      
      <div style={{ marginBottom: "20px" }}>
        <Skeleton width="100%" height="48px" />
      </div>
      
      <div className="page-skeleton-card">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <Skeleton width="150px" height="20px" />
          <Skeleton width="100px" height="20px" />
        </div>
        
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>
            <Skeleton width="20%" height="16px" />
            <Skeleton width="30%" height="16px" />
            <Skeleton width="25%" height="16px" />
            <Skeleton width="25%" height="16px" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PageSkeleton;
