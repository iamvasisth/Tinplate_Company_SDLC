import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

const customCSS = `
  .item-side-panel {
    width: 600px;
    background: #fff;
    border-left: 1px solid #eaeaea;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: -4px 0 15px rgba(0,0,0,0.03);
    animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .side-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px 16px 24px;
  }
  .side-panel-title {
    font-size: 22px;
    color: #1e293b;
    font-weight: 600;
    margin: 0;
  }
  .side-panel-actions {
    display: flex;
    gap: 12px;
  }
  .btn-panel-edit {
    background: #f8fafc;
    color: #334155;
    border: 1px solid #e2e8f0;
    padding: 6px 10px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-panel-edit:hover { background: #f1f5f9; }
  
  .more-btn-wrapper {
    position: relative;
    display: inline-block;
  }
  .btn-panel-more {
    background: #f8fafc;
    color: #1e293b;
    border: 1px solid #e2e8f0;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13.5px;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-panel-more:hover, .btn-panel-more.active { background: #f1f5f9; }

  .more-dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 6px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    z-index: 1000;
    width: 180px;
    padding: 8px 0;
  }
  .more-dropdown-item {
    padding: 8px 12px;
    margin: 2px 8px;
    cursor: pointer;
    font-size: 14px;
    color: #334155;
    border-radius: 6px;
    transition: all 0.2s;
  }
  .more-dropdown-item:hover { 
    background: #3b82f6;
    color: #fff;
  }
  .more-dropdown-item.delete {
    color: #ef4444;
  }
  .more-dropdown-item.delete:hover {
    background: #3b82f6;
    color: #fff;
  }

  .btn-panel-close {
    background: transparent;
    color: #64748b;
    border: none;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    margin-left: 4px;
    transition: color 0.2s;
  }
  .btn-panel-close:hover { color: #1e293b; }
  
  .side-tabs-container {
    display: flex;
    border-bottom: 1px solid #e2e8f0;
    padding: 0 24px;
    background: #f8fafc;
  }
  .side-tab-item {
    padding: 12px 16px;
    font-size: 13px;
    color: #64748b;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    font-weight: 500;
    margin-bottom: -1px;
  }
  .side-tab-item.active {
    color: #2563eb;
    border-bottom: 2px solid #2563eb;
  }
  
  .side-panel-body {
    padding: 24px;
  }
  .side-details-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .side-detail-group {
    margin-bottom: 4px;
  }
  .side-detail-label {
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 4px;
    font-weight: 500;
  }
  .side-detail-value {
    font-size: 14px;
    color: #1e293b;
  }
  .side-section-title {
    font-size: 15px;
    color: #334155;
    font-weight: 600;
    margin: 24px 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
  }
  .side-empty-state {
    font-size: 13px;
    color: #94a3b8;
    font-style: italic;
  }
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 12px;
  }
  .history-item {
    display: flex;
    gap: 12px;
  }
  .history-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #e0e7ff;
    color: #4f46e5;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .history-content {
    display: flex;
    flex-direction: column;
  }
  .history-action {
    font-size: 14px;
    color: #1e293b;
    font-weight: 500;
  }
  .history-desc {
    font-size: 13px;
    color: #64748b;
    margin-top: 2px;
  }
  .history-time {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
  }
`;

export default function ItemSidePanel({ itemId, onClose, onUpdate }) {
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.more-btn-wrapper')) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!itemId) return;
    const fetchItem = async () => {
      setLoading(true);
      try {
        const res = await apiRequest(`/items/${itemId}`);
        if (res.item) {
          setItem(res.item);
        } else {
          toast.error("Item not found");
          onClose();
        }
      } catch (err) {
        toast.error("Failed to load item details");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [itemId, onClose]);

  useEffect(() => {
    if (activeTab === 'History' && itemId) {
      const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
          const res = await apiRequest(`/items/${itemId}/history`);
          setHistory(res.history || []);
        } catch (err) {
          toast.error("Failed to load history");
        } finally {
          setHistoryLoading(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab, itemId]);

  const handleCloneItem = () => {
    navigate('/items/new', { state: { cloneItem: item } });
  };

  const handleToggleStatus = async () => {
    const newStatus = !item.is_active;
    try {
      await apiRequest(`/items/${itemId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: newStatus })
      });
      toast.success(`Item marked as ${newStatus ? 'Active' : 'Inactive'}`);
      setItem({ ...item, is_active: newStatus });
      if (onUpdate) onUpdate();
      setShowMoreMenu(false);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await apiRequest(`/items/${itemId}`, { method: 'DELETE' });
      toast.success("Item deleted successfully");
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      toast.error("Failed to delete item");
    }
  };

  if (!itemId) return null;

  const formatCurrency = (val) => {
    return "₹" + parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  return (
    <>
      <style>{customCSS}</style>
      <div className="item-side-panel">
        {loading ? (
          <div style={{ padding: "24px" }}>
            <div style={{ height: "30px", width: "60%", background: "#f1f5f9", borderRadius: 6, marginBottom: "20px" }}></div>
            <div style={{ height: "20px", width: "100%", background: "#f1f5f9", borderRadius: 6, marginBottom: "15px" }}></div>
            <div style={{ height: "20px", width: "80%", background: "#f1f5f9", borderRadius: 6, marginBottom: "15px" }}></div>
            <div style={{ height: "20px", width: "90%", background: "#f1f5f9", borderRadius: 6, marginBottom: "15px" }}></div>
          </div>
        ) : !item ? null : (
          <>
            <div className="side-panel-header">
              <h2 className="side-panel-title">{item.name}</h2>
              <div className="side-panel-actions">
                <button className="btn-panel-edit" onClick={() => navigate(`/items/${itemId}/edit`)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <div className="more-btn-wrapper">
                  <button className={`btn-panel-more ${showMoreMenu ? 'active' : ''}`} onClick={() => setShowMoreMenu(!showMoreMenu)}>
                    More
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {showMoreMenu && (
                    <div className="more-dropdown-menu">
                      <div className="more-dropdown-item" onClick={handleCloneItem}>Clone Item</div>
                      <div className="more-dropdown-item" onClick={handleToggleStatus}>
                        {item.is_active === false ? 'Mark as Active' : 'Mark as Inactive'}
                      </div>
                      <div className="more-dropdown-item delete" onClick={handleDelete}>Delete</div>
                    </div>
                  )}
                </div>
                <button className="btn-panel-close" onClick={onClose}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div className="side-tabs-container">
              {['Overview', 'Transactions', 'History'].map(tab => (
                <div
                  key={tab}
                  className={`side-tab-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </div>
              ))}
            </div>

            <div className="side-panel-body">
              {activeTab === 'Overview' && (
                <div className="side-details-grid">
                  <div className="side-detail-group">
                    <div className="side-detail-label">Item Type</div>
                    <div className="side-detail-value">
                      {item.item_type === "Goods" ? "Sales and Purchase Items" : "Sales and Purchase Items (Service)"}
                    </div>
                  </div>
                  <div className="side-detail-group">
                    <div className="side-detail-label">Unit</div>
                    <div className="side-detail-value">{item.unit || "—"}</div>
                  </div>
                  <div className="side-detail-group">
                    <div className="side-detail-label">Created Source</div>
                    <div className="side-detail-value">User</div>
                  </div>

                  <h3 className="side-section-title">Purchase Information</h3>
                  <div className="side-detail-group">
                    <div className="side-detail-label">Cost Price</div>
                    <div className="side-detail-value">{formatCurrency(item.cost_price)}</div>
                  </div>
                  <div className="side-detail-group">
                    <div className="side-detail-label">Purchase Account</div>
                    <div className="side-detail-value">{item.purchase_account || "—"}</div>
                  </div>
                  <div className="side-detail-group">
                    <div className="side-detail-label">Description</div>
                    <div className="side-detail-value">{item.purchase_description || "—"}</div>
                  </div>

                  <h3 className="side-section-title">Sales Information</h3>
                  <div className="side-detail-group">
                    <div className="side-detail-label">Selling Price</div>
                    <div className="side-detail-value">{formatCurrency(item.selling_price)}</div>
                  </div>
                  <div className="side-detail-group">
                    <div className="side-detail-label">Sales Account</div>
                    <div className="side-detail-value">{item.sales_account || "—"}</div>
                  </div>
                  <div className="side-detail-group">
                    <div className="side-detail-label">Description</div>
                    <div className="side-detail-value">{item.description || "—"}</div>
                  </div>

                  {item.is_inventory_tracked && (
                    <>
                      <h3 className="side-section-title">Inventory Information</h3>
                      <div className="side-detail-group">
                        <div className="side-detail-label">Inventory Account</div>
                        <div className="side-detail-value">{item.inventory_account || "—"}</div>
                      </div>
                      <div className="side-detail-group">
                        <div className="side-detail-label">Current Stock</div>
                        <div className="side-detail-value">{item.stock_quantity || "0"}</div>
                      </div>
                      <div className="side-detail-group">
                        <div className="side-detail-label">Reorder Level</div>
                        <div className="side-detail-value">{item.reorder_level || "0"}</div>
                      </div>
                      <div className="side-detail-group">
                        <div className="side-detail-label">Opening Stock Rate</div>
                        <div className="side-detail-value">{formatCurrency(item.opening_stock_rate)}</div>
                      </div>
                    </>
                  )}

                  <h3 className="side-section-title">Reporting Tags</h3>
                  <div className="side-empty-state">No reporting tag has been associated with this item.</div>
                </div>
              )}

              {activeTab === 'Transactions' && (
                <div style={{ color: '#64748b', marginTop: '20px' }}>No transactions found for this item.</div>
              )}

              {activeTab === 'History' && (
                <div className="history-container">
                  {historyLoading ? (
                    <div style={{ color: '#64748b', marginTop: '20px' }}>Loading history...</div>
                  ) : history.length === 0 ? (
                    <div style={{ color: '#64748b', marginTop: '20px' }}>No history found for this item.</div>
                  ) : (
                    <div className="history-list">
                      {history.map(record => (
                        <div className="history-item" key={record.id}>
                          <div className="history-icon">
                            {record.action === 'CREATED' ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20v-8m0 0V4m0 8h8m-8 0H4"></path>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            )}
                          </div>
                          <div className="history-content">
                            <div className="history-action">
                              {record.action === 'CREATED' ? 'Item Created' : 'Item Updated'}
                              {record.username && <span style={{ fontWeight: 'normal', color: '#64748b' }}> by {record.username}</span>}
                            </div>
                            <div className="history-desc">{record.description}</div>
                            <div className="history-time">
                              {new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(record.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
