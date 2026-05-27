import React from "react";
import "./createitems.css";

function CreateItemsMenu() {
  return (
    <div className="mega-menu">

      {/* GENERAL */}
      <div className="menu-column">
        <h3>GENERAL</h3>

        <p>➕ Add User</p>
        <p>➕ Item</p>
        <p>➕ Journal Entry</p>
        <p>➕ Log Time</p>
        <p>➕ Weekly Log</p>
      </div>

      {/* INVENTORY */}
      <div className="menu-column">
        <h3>INVENTORY</h3>

        <p>➕ Inventory Adjustments</p>
      </div>

      {/* SALES */}
      <div className="menu-column">
        <h3>SALES</h3>

        <p>➕ Customer</p>
        <p>➕ Quotes</p>
        <p>➕ Delivery Challan</p>
        <p>➕ Invoices</p>
        <p>➕ Recurring Invoice</p>
        <p>➕ Retail Invoice</p>
        <p>➕ Sales Order</p>
        <p>➕ Customer Payment</p>
        <p>➕ Credit Notes</p>
      </div>

      {/* PURCHASES */}
      <div className="menu-column">
        <h3>PURCHASES</h3>

        <p>➕ Vendor</p>
        <p>➕ Expenses</p>
        <p>➕ Bill</p>
        <p>➕ Purchase Order</p>
        <p>➕ Vendor Payment</p>
        <p>➕ Vendor Credit</p>
      </div>

      {/* BANKING */}
      <div className="menu-column">
        <h3>BANKING</h3>

        <p>➕ Bank Transfer</p>
        <p>➕ Card Payment</p>
        <p>➕ Owner Drawings</p>
        <p>➕ Other Income</p>
      </div>

    </div>
  );
}

export default CreateItemsMenu;