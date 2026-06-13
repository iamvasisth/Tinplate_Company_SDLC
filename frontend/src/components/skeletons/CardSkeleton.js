import React from 'react';
import Skeleton from './Skeleton';
import './Skeleton.css';

const CardSkeleton = () => {
  return (
    <div className="card-skeleton">
      <Skeleton width="40%" height="20px" style={{ marginBottom: "10px" }} />
      <Skeleton width="100%" height="32px" />
      <Skeleton width="60%" height="16px" style={{ marginTop: "10px" }} />
    </div>
  );
};

export default CardSkeleton;
