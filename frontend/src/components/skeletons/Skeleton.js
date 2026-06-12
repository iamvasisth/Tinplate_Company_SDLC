import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, borderRadius, className = '', type = 'block', style = {} }) => {
  const classes = `skeleton skeleton-shimmer ${className} ${type === 'circle' ? 'skeleton-circle' : ''}`;
  
  return (
    <div
      className={classes}
      style={{
        width: width || (type === 'text' ? '100%' : 'auto'),
        height: height || (type === 'text' ? '16px' : type === 'title' ? '24px' : 'auto'),
        borderRadius: borderRadius || (type === 'circle' ? '50%' : '4px'),
        ...style,
      }}
    />
  );
};

export default Skeleton;
