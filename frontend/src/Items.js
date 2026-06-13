import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import ItemSidePanel from "./ItemSidePanel";

const customCSS = `
  .full-table-container { background:#fff; display:flex; flex-direction:column; height:100%; margin:0; font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .full-table-header { padding:15px 30px; border-bottom:1px solid #eaeaea; display:flex; justify-content:space-between; align-items:center; }
  .full-table-header h3 { margin:0; font-size:18px; font-weight:500; color:#333; display:flex; align-items:center; gap:5px; cursor:pointer; }
  .table-actions { display:flex; gap:10px; }
  .btn-new { background:#3b82f6; color:white; border:none; padding:8px 16px; border-radius:4px; font-size:14px; cursor:pointer; display:flex; align-items:center; gap:5px; font-weight:500; }
  .btn-new:hover { background:#2563eb; }
  .btn-more { background:#f5f5f5; border:1px solid #ddd; color:#555; border-radius:4px; padding:6px 12px; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center; }
  .table-wrapper { flex:1; overflow:auto; }
  .items-table { width:100%; border-collapse:collapse; font-size:13px; table-layout:fixed; }
  .items-table th { text-align:left; padding:12px 15px; color:#64748b; font-weight:600; border-bottom:1px solid #e2e8f0; background:#ffffff; text-transform:uppercase; font-size:11px; letter-spacing:0.5px; white-space:nowrap; resize:horizontal; overflow:hidden; text-overflow:ellipsis; }
  .items-table td { padding:14px 15px; border-bottom:1px solid #f8fafc; color:#334155; }
  .items-table tr:hover { background:#f1f5f9; }
  .item-name-link { color:#2563eb; cursor:pointer; font-weight:500; }
  .item-name-link:hover { text-decoration:underline; }
  .th-icon-wrapper { overflow:visible !important; }
  .th-icon { display:inline-flex; align-items:center; justify-content:center; color:#aaa; cursor:pointer; transition:color 0.2s; }
  .th-icon:hover, .th-icon.active { color:#007bff; }
  .bulk-actions-bar { padding:12px 30px; background:#fdfdfd; border-bottom:1px solid #eaeaea; display:flex; align-items:center; gap:12px; }
  .bulk-btn { background:#f8f9fa; border:1px solid #ddd; color:#444; padding:6px 12px; border-radius:4px; font-size:13px; cursor:pointer; font-weight:500; }
  .bulk-btn:hover { background:#e9ecef; }
  .bulk-divider { width:1px; height:20px; background:#ddd; margin:0 5px; }
  .selected-info { display:flex; align-items:center; font-size:13px; color:#333; }
  .selected-count { background:#e8f0fe; color:#1a73e8; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:bold; margin-right:8px; }
  .close-bulk { margin-left:auto; color:#666; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:4px; }
  .close-bulk:hover { color:#d32f2f; }
  .settings-dropdown { position:absolute; top:30px; left:10px; background:#fff; border:1px solid #e0e0e0; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:1000; width:200px; padding:6px; font-size:14px; }
  .dropdown-item { padding:10px 12px; display:flex; align-items:center; gap:10px; border-radius:4px; cursor:pointer; color:#333; transition:background 0.2s; }
  .dropdown-item:hover { background:#f5f5f5; }
  .dropdown-item svg { width:16px; height:16px; }
  .items-table.clip-text td { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .bulk-update-modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:2000; }
  .bulk-update-modal { background:#fff; width:600px; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.15); display:flex; flex-direction:column; }
  .bulk-update-header { display:flex; justify-content:space-between; align-items:center; padding:16px 24px; border-bottom:1px solid #eaeaea; }
  .bulk-update-header h3 { margin:0; font-size:18px; color:#333; font-weight:500; }
  .bulk-update-close { color:#ef4444; font-size:20px; cursor:pointer; background:none; border:none; padding:0; }
  .bulk-update-body { padding:24px; }
  .bulk-update-desc { color:#4b5563; font-size:14px; margin-bottom:16px; }
  .bulk-update-row { display:flex; gap:16px; margin-bottom:20px; }
  .bulk-update-select, .bulk-update-input { flex:1; padding:10px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; color:#374151; outline:none; }
  .bulk-update-select:focus, .bulk-update-input:focus { border-color:#3b82f6; }
  .bulk-update-note { font-size:13px; color:#6b7280; }
  .bulk-update-note strong { color:#4b5563; font-weight:600; }
  .bulk-update-footer { padding:16px 24px; border-top:1px solid #eaeaea; display:flex; gap:12px; }
  .bulk-btn-primary { background:#4a90e2; color:white; border:none; padding:8px 20px; border-radius:6px; font-weight:500; cursor:pointer; }
  .bulk-btn-primary:hover { background:#357abd; }
  .bulk-btn-secondary { background:#f9fafb; color:#374151; border:1px solid #d1d5db; padding:8px 20px; border-radius:6px; font-weight:500; cursor:pointer; }
  .bulk-btn-secondary:hover { background:#f3f4f6; }
  .view-dropdown-container { position:relative; display:inline-block; }
  .view-dropdown-btn { display:flex; align-items:center; gap:6px; cursor:pointer; padding:6px 10px; border-radius:6px; transition:background 0.2s; }
  .view-dropdown-btn:hover, .view-dropdown-btn.active { background:#f1f5f9; }
  .view-dropdown-menu { position:absolute; top:100%; left:0; margin-top:4px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.1); z-index:1000; width:220px; padding:8px 0; }
  .view-dropdown-item { padding:10px 16px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; font-size:14px; color:#334155; transition:background 0.2s; }
  .view-dropdown-item:hover { background:#f8fafc; }
`;

const COLUMNS_DEFAULT = [
  { id:'name', label:'Name', visible:true, locked:true },
  { id:'purchase_desc', label:'Purchase Description', visible:true },
  { id:'purchase_rate', label:'Purchase Rate', visible:true },
  { id:'desc', label:'Description', visible:true },
  { id:'rate', label:'Rate', visible:true },
  { id:'usage_unit', label:'Usage Unit', visible:true },
  { id:'account_name', label:'Account Name', visible:false },
  { id:'purchase_account_name', label:'Purchase Account Name', visible:false },
  { id:'sku', label:'SKU', visible:false },
  { id:'type', label:'Type', visible:false },
  { id:'vendor_name', label:'Vendor Name', visible:false },
];

function Items() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [clipText, setClipText] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedItemDetailId, setSelectedItemDetailId] = useState(null);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [currentView, setCurrentView] = useState("All Items");
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [columnSearch, setColumnSearch] = useState("");
  const [columns, setColumns] = useState(() => {
    try { const s = localStorage.getItem('itemTableColumns'); return s ? JSON.parse(s) : COLUMNS_DEFAULT; } catch { return COLUMNS_DEFAULT; }
  });
  const [tempColumns, setTempColumns] = useState([]);

  useEffect(() => {
    const h = (e) => {
      if (!e.target.closest('.th-icon-wrapper')) setShowSettings(false);
      if (!e.target.closest('.view-dropdown-container')) setShowViewDropdown(false);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const fetchItems = useCallback(async () => {
    try { setLoading(true); const res = await apiRequest("/items"); if (res) setItems(res.items || []); }
    catch { toast.error("Failed to load items"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const searchQuery = new URLSearchParams(location.search).get("search") || "";
  const filteredItems = items.filter(item => {
    if (searchQuery && !(item.name||"").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (currentView === "Active Items") return item.is_active !== false;
    if (currentView === "Inactive Items") return item.is_active === false;
    if (currentView === "Sales Items") return !!item.sales_account;
    if (currentView === "Purchases Items") return !!item.purchase_account;
    if (currentView === "Goods Items") return item.item_type === "Goods";
    if (currentView === "Services Items") return item.item_type === "Service" || item.item_type === "Services";
    return true;
  });

  const toggleSelectAll = () => setSelectedItems(selectedItems.length === filteredItems.length ? [] : filteredItems.map(i=>i.id));
  const toggleSelect = (id) => setSelectedItems(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedItems.length} items?`)) return;
    try { for (const id of selectedItems) await apiRequest(`/items/${id}`, {method:"DELETE"}); toast.success("Items deleted"); setSelectedItems([]); fetchItems(); }
    catch { toast.error("Failed to delete some items"); }
  };

  const openCustomizeModal = () => { setTempColumns([...columns]); setColumnSearch(""); setShowCustomizeModal(true); setShowSettings(false); };
  const toggleColumn = (id) => setTempColumns(prev => prev.map(c => c.id===id && !c.locked ? {...c, visible:!c.visible} : c));
  const saveColumns = () => { setColumns([...tempColumns]); localStorage.setItem('itemTableColumns', JSON.stringify(tempColumns)); setShowCustomizeModal(false); toast.success("Columns updated"); };

  const renderCell = (col, item) => {
    if (col.id==='name') return <td key={col.id} className="item-name-link" onClick={() => setSelectedItemDetailId(item.id)} title={item.name}>{item.name}</td>;
    if (col.id==='purchase_desc') return <td key={col.id}>{item.purchase_description||'—'}</td>;
    if (col.id==='purchase_rate') return <td key={col.id}>₹{parseFloat(item.cost_price||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>;
    if (col.id==='desc') return <td key={col.id}>{item.description||'—'}</td>;
    if (col.id==='rate') return <td key={col.id}>₹{parseFloat(item.selling_price||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>;
    if (col.id==='usage_unit') return <td key={col.id}>{item.unit||'—'}</td>;
    if (col.id==='account_name') return <td key={col.id}>{item.sales_account||'—'}</td>;
    if (col.id==='purchase_account_name') return <td key={col.id}>{item.purchase_account||'—'}</td>;
    if (col.id==='sku') return <td key={col.id}>{item.sku||'—'}</td>;
    if (col.id==='type') return <td key={col.id}>{item.item_type||'—'}</td>;
    return <td key={col.id}>—</td>;
  };

  const visibleCols = columns.filter(c=>c.visible);

  return (
    <div style={{display:'flex',flexDirection:'row',height:'calc(100vh - 60px)',width:'100%',overflow:'hidden'}}>
      <style>{customCSS}</style>
      <div className="full-table-container" style={{flex:1,borderRight:selectedItemDetailId?'1px solid #eaeaea':'none',overflow:'hidden'}}>

        {selectedItems.length > 0 ? (
          <div className="bulk-actions-bar">
            <button className="bulk-btn" onClick={()=>setShowBulkUpdateModal(true)}>Bulk Update</button>
            <div className="bulk-divider"/>
            <button className="bulk-btn">Mark as Active</button>
            <button className="bulk-btn">Mark as Inactive</button>
            <button className="bulk-btn" onClick={handleBulkDelete}>Delete</button>
            <div className="bulk-divider"/>
            <div className="selected-info"><span className="selected-count">{selectedItems.length}</span> Selected</div>
            <div className="close-bulk" onClick={()=>setSelectedItems([])}>
              Esc <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
          </div>
        ) : (
          <div className="full-table-header">
            <div className="view-dropdown-container">
              <h3 className={`view-dropdown-btn ${showViewDropdown?'active':''}`} onClick={()=>setShowViewDropdown(!showViewDropdown)} style={{fontWeight:600}}>
                {currentView}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{transform:showViewDropdown?'rotate(180deg)':'none',transition:'transform 0.2s'}}><polyline points="6 9 12 15 18 9"/></svg>
              </h3>
              {showViewDropdown && (
                <div className="view-dropdown-menu">
                  {['All','Active','Inactive','Sales','Purchases','Goods','Services'].map(v=>(
                    <div key={v} className="view-dropdown-item" onClick={()=>{setCurrentView(v==='All'?'All Items':`${v} Items`);setShowViewDropdown(false);}}>
                      {v}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="table-actions">
              <button className="btn-new" onClick={()=>navigate("/items/new")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New
              </button>
              <button className="btn-more">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
          </div>
        )}

        <div className="table-wrapper">
          <table className={`items-table ${clipText?'clip-text':''}`}>
            <thead>
              <tr>
                <th style={{width:'50px',textAlign:'center',resize:'none',position:'relative'}} className="th-icon-wrapper">
                  <span className={`th-icon ${showSettings?'active':''}`} onClick={()=>setShowSettings(!showSettings)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="2"/><line x1="3" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="21" y2="8"/><circle cx="14" cy="16" r="2"/><line x1="3" y1="16" x2="12" y2="16"/><line x1="16" y1="16" x2="21" y2="16"/></svg>
                  </span>
                  {showSettings && (
                    <div className="settings-dropdown">
                      <div className="dropdown-item" onClick={openCustomizeModal}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                        Customize Columns
                      </div>
                      <div className="dropdown-item" onClick={()=>{setClipText(!clipText);setShowSettings(false);}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="18" y2="18"/></svg>
                        Clip Text
                      </div>
                    </div>
                  )}
                </th>
                <th style={{width:'40px',textAlign:'center',resize:'none'}}>
                  <input type="checkbox" style={{accentColor:'#4a90e2',margin:0}} checked={filteredItems.length>0&&selectedItems.length===filteredItems.length} onChange={toggleSelectAll}/>
                </th>
                {visibleCols.map(col=>(
                  <th key={col.id} style={{width:['name','desc','purchase_desc'].includes(col.id)?'200px':'150px'}}>
                    {col.label.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={visibleCols.length+2} style={{textAlign:'center',padding:'30px',color:'#888'}}>Loading...</td></tr>
              ) : filteredItems.length===0 ? (
                <tr><td colSpan={visibleCols.length+2} style={{textAlign:'center',padding:'30px',color:'#888'}}>No items found.</td></tr>
              ) : filteredItems.map(item=>(
                <tr key={item.id}>
                  <td style={{textAlign:'center'}}></td>
                  <td style={{textAlign:'center'}}>
                    <input type="checkbox" style={{accentColor:'#4a90e2',margin:0}} checked={selectedItems.includes(item.id)} onChange={()=>toggleSelect(item.id)}/>
                  </td>
                  {visibleCols.map(col=>renderCell(col,item))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customize Columns Modal */}
      {showCustomizeModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:'8px',padding:'25px',width:'400px',boxShadow:'0 4px 20px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #eaeaea',paddingBottom:'15px',marginBottom:'15px'}}>
              <h3 style={{margin:0,fontSize:'18px'}}>Customize Columns</h3>
              <span style={{color:'#d32f2f',cursor:'pointer'}} onClick={()=>setShowCustomizeModal(false)}>✕</span>
            </div>
            <input type="text" placeholder="Search" value={columnSearch} onChange={e=>setColumnSearch(e.target.value)}
              style={{width:'100%',padding:'8px 12px',borderRadius:'4px',border:'1px solid #4a90e2',outline:'none',boxSizing:'border-box',marginBottom:'12px'}}/>
            <div style={{display:'flex',flexDirection:'column',gap:'6px',maxHeight:'320px',overflowY:'auto'}}>
              {tempColumns.filter(c=>c.label.toLowerCase().includes(columnSearch.toLowerCase())).map(col=>(
                <div key={col.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 12px',background:'#fdfdfd',border:'1px solid #f0f0f0',borderRadius:'4px'}}>
                  {col.locked
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    : <input type="checkbox" checked={col.visible} onChange={()=>toggleColumn(col.id)} style={{accentColor:'#4a90e2',width:'15px',height:'15px',margin:0,cursor:'pointer'}}/>}
                  <span style={{fontSize:'14px',color:'#333'}}>{col.label}</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:'10px',marginTop:'20px'}}>
              <button onClick={saveColumns} style={{padding:'8px 20px',background:'#4a90e2',color:'#fff',border:'none',borderRadius:'5px',cursor:'pointer',fontWeight:'500'}}>Save</button>
              <button onClick={()=>setShowCustomizeModal(false)} style={{padding:'8px 20px',background:'#ccc',color:'#333',border:'none',borderRadius:'5px',cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="bulk-update-modal-overlay">
          <div className="bulk-update-modal">
            <div className="bulk-update-header">
              <h3>Bulk Update Items</h3>
              <button className="bulk-update-close" onClick={()=>setShowBulkUpdateModal(false)}>✕</button>
            </div>
            <div className="bulk-update-body">
              <div className="bulk-update-desc">Choose a field from the dropdown and update with new information.</div>
              <div className="bulk-update-row">
                <select className="bulk-update-select" value={bulkUpdateField} onChange={e=>setBulkUpdateField(e.target.value)}>
                  <option value="">Select a field</option>
                  <option value="selling_price">Selling Price</option>
                  <option value="cost_price">Cost Price</option>
                  <option value="unit">Unit</option>
                  <option value="sales_account">Sales Account</option>
                  <option value="purchase_account">Purchase Account</option>
                </select>
                <input type="text" className="bulk-update-input" value={bulkUpdateValue} onChange={e=>setBulkUpdateValue(e.target.value)} placeholder="Enter new value"/>
              </div>
              <div className="bulk-update-note"><strong>Note:</strong> All selected items will be updated and you cannot undo this action.</div>
            </div>
            <div className="bulk-update-footer">
              <button className="bulk-btn-primary" onClick={async()=>{
                if (!bulkUpdateField||!bulkUpdateValue){toast.error("Select a field and enter a value");return;}
                try{await apiRequest("/items/bulk-update",{method:"PUT",body:JSON.stringify({item_ids:selectedItems,field:bulkUpdateField,value:bulkUpdateValue})});
                  toast.success("Items updated");setShowBulkUpdateModal(false);setSelectedItems([]);fetchItems();}
                catch{toast.error("Failed to update items");}
              }}>Update</button>
              <button className="bulk-btn-secondary" onClick={()=>setShowBulkUpdateModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Side Panel */}
      {selectedItemDetailId && (
        <ItemSidePanel itemId={selectedItemDetailId} onClose={()=>setSelectedItemDetailId(null)} onUpdate={fetchItems}/>
      )}
    </div>
  );
}

export default Items;