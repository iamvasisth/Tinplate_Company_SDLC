import React from 'react';
import Skeleton from './Skeleton';
import './Skeleton.css';

const DetailSkeleton = () => {
  return (
    <div className="detail-skeleton">
      <div className="detail-skeleton-header">
        <Skeleton type="circle" width="60px" height="60px" />
        <div>
          <Skeleton width="200px" height="24px" style={{ marginBottom: "8px" }} />
          <Skeleton width="150px" height="16px" />
        </div>
      </div>
      
      <div className="detail-skeleton-content">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          <div>
            <Skeleton width="30%" height="16px" style={{ marginBottom: "10px" }} />
            <Skeleton width="80%" height="20px" style={{ marginBottom: "8px" }} />
            <Skeleton width="60%" height="16px" style={{ marginBottom: "8px" }} />
            <Skeleton width="70%" height="16px" />
          </div>
          <div>
            <Skeleton width="30%" height="16px" style={{ marginBottom: "10px" }} />
            <Skeleton width="80%" height="20px" style={{ marginBottom: "8px" }} />
            <Skeleton width="60%" height="16px" style={{ marginBottom: "8px" }} />
            <Skeleton width="70%" height="16px" />
          </div>
        </div>
        
        <Skeleton width="100%" height="200px" />
      </div>
    </div>
  );
};

export default DetailSkeleton;
