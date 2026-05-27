import React from "react";

function ImportMore() {
  return (
    <div style={{ padding: "30px", maxWidth: "700px", margin: "auto" }}>
      <h2>Import Items</h2>
      <p>This feature is under development. You will be able to upload CSV, TSV, or XLS files and handle duplicates here.</p>
      <ul>
        <li>Skip Duplicates – Keep existing items, ignore duplicates</li>
        <li>Overwrite Items – Replace existing items with imported data</li>
      </ul>
      <p>Supported formats: CSV, TSV, XLS (max 25 MB)</p>
    </div>
  );
}

export default ImportMore;