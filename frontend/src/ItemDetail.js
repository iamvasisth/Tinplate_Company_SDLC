import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

const customCSS = `
  .item-detail-container { background:#fff; min-height:calc(100vh - 60px); font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; padding:24px 32px; }
  .item-detail-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
  .item-detail-title { font-size:24px; color:#1e293b; font-weight:500; margin:0; }
  .item-detail-actions { display:flex; gap:12px; }
  .btn-edit { background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; padding:6px 16px; border-radius:6px; font-size:14px; font-weight:500; cursor:pointer; transition:background 0.2s; }
  .btn-edit:hover { background:#e2e8f0; }
  .btn-close { background:#fff; color:#ef4444; border:1px solid #fca5a5; padding:6px 16px; border-radius:6px; font-size:14px; font-weight:500; cursor:pointer; transition:background 0.2s; }
  .btn-close:hover { background:#fef2f2; }
  .tabs-container { display:flex; border-bottom:1px solid #e2e8f0; margin-bottom:24px; }
  .tab-item { padding:10px 16px; font-size:14px; color:#64748b; cursor:pointer; border-bottom:2px solid transparent; font-weight:500; margin-bottom:-1px; }
  .tab-item.active { color:#2563eb; border-bottom:2px solid #2563eb; }
  .details-grid { display:grid; grid-template-columns:1fr; gap:20px; max-width:600px; }
  .detail-group { margin-bottom:8px; }
  .detail-label { font-size:13px; color:#94a3b8; margin-bottom:6px; }
  .detail-value { font-size:14px; color:#1e293b; font-weight:400; }
  .section-title { font-size:16px; color:#334155; font-weight:500; margin:32px 0 16px 0; }
  .empty-state { font-size:13px; color:#94a3b8; }
`;

function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await apiRequest(`/items/${id}`);
        if (res.item) { setItem(res.item); }
        else { toast.error("Item not found"); navigate("/items"); }
      } catch { toast.error("Failed to load item details"); navigate("/items"); }
      finally { setLoading(false); }
    };
    fetchItem();
  }, [id, navigate]);

  if (loading) return (
    <div className="item-detail-container">
      <div style={{padding:"24px"}}>
        <div style={{height:"30px",width:"60%",background:"#f1f5f9",borderRadius:6,marginBottom:"20px"}}></div>
        <div style={{height:"20px",width:"100%",background:"#f1f5f9",borderRadius:6,marginBottom:"15px"}}></div>
        <div style={{height:"20px",width:"80%",background:"#f1f5f9",borderRadius:6,marginBottom:"15px"}}></div>
      </div>
    </div>
  );

  if (!item) return null;

  const fmt = (val) => "₹" + parseFloat(val||0).toLocaleString('en-IN',{minimumFractionDigits:2});

  return (
    <>
      <style>{customCSS}</style>
      <div className="item-detail-container">
        <div className="item-detail-header">
          <h2 className="item-detail-title">{item.name}</h2>
          <div className="item-detail-actions">
            <button className="btn-edit" onClick={()=>navigate(`/items/${id}/edit`)}>Edit</button>
            <button className="btn-close" onClick={()=>navigate("/items")}>Close</button>
          </div>
        </div>

        <div className="tabs-container">
          {['Overview','Transactions','History'].map(tab=>(
            <div key={tab} className={`tab-item ${activeTab===tab?'active':''}`} onClick={()=>setActiveTab(tab)}>{tab}</div>
          ))}
        </div>

        {activeTab==='Overview' && (
          <div className="details-grid">
            <div className="detail-group">
              <div className="detail-label">Item Type</div>
              <div className="detail-value">{item.item_type==="Goods"?"Sales and Purchase Items (Goods)":"Sales and Purchase Items (Service)"}</div>
            </div>
            <div className="detail-group">
              <div className="detail-label">Unit</div>
              <div className="detail-value">{item.unit||"—"}</div>
            </div>
            <div className="detail-group">
              <div className="detail-label">Created Source</div>
              <div className="detail-value">User</div>
            </div>

            <h3 className="section-title">Purchase Information</h3>
            <div className="detail-group"><div className="detail-label">Cost Price</div><div className="detail-value">{fmt(item.cost_price)}</div></div>
            <div className="detail-group"><div className="detail-label">Purchase Account</div><div className="detail-value">{item.purchase_account||"—"}</div></div>
            <div className="detail-group"><div className="detail-label">Description</div><div className="detail-value">{item.purchase_description||"—"}</div></div>

            <h3 className="section-title">Sales Information</h3>
            <div className="detail-group"><div className="detail-label">Selling Price</div><div className="detail-value">{fmt(item.selling_price)}</div></div>
            <div className="detail-group"><div className="detail-label">Sales Account</div><div className="detail-value">{item.sales_account||"—"}</div></div>
            <div className="detail-group"><div className="detail-label">Description</div><div className="detail-value">{item.description||"—"}</div></div>

            <h3 className="section-title">Reporting Tags</h3>
            <div className="empty-state">No reporting tag has been associated with this item.</div>
          </div>
        )}
        {activeTab==='Transactions' && <div style={{color:'#64748b',marginTop:'20px'}}>No transactions found for this item.</div>}
        {activeTab==='History' && <div style={{color:'#64748b',marginTop:'20px'}}>Item created successfully.</div>}
      </div>
    </>
  );
}

export default ItemDetail;
