import React from 'react';
import Skeleton from './Skeleton';
import './Skeleton.css';

const TableSkeleton = ({ rows = 5, columns = 5 }) => {
  return (
    <div className="page-skeleton-card">
      <div style={{ overflowX: 'auto' }}>
        <table className="table-skeleton">
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i}>
                  <Skeleton width="80%" height="16px" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex}>
                    <Skeleton width={colIndex === 0 ? "40%" : "70%"} height="16px" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableSkeleton;
