
const COLORS = ["#2f6fed","#b8309e","#8a8578","#7c4fd6","#0e9ba3"];

// ---- Sample starter data ----
let DATA = [
  {name:"Scenario 1", tests:[
    {id:"A1", description:"Test Case 1", expected:"Expected Output 1", status:"pending", remarks:""},
    {id:"A2", description:"Test Case 2", expected:"Expected Output 2", status:"pass", remarks:"Test case passed"},
	{id:"A3", description:"Test Case 3", expected:"Expected Output 3", status:"fail", remarks:"Test case failed"},
  ]},
  {name:"Scenario 2", tests:[
    {id:"B1", description:"Test Case 1", expected:"Expected Output 1", status:"blocked", remarks:"Test case blocked"}
  ]}
];

let expanded = {};
DATA.forEach((c,i)=>expanded[i]=true);

// empty set = no filter active = show everything
let activeFilters = new Set();

function toggleFilter(status){
  if(activeFilters.has(status)) activeFilters.delete(status);
  else activeFilters.add(status);
  render();
}
function resetFilter(){
  activeFilters.clear();
  render();
}
function updateCounts(){
  let pass=0, fail=0, blocked=0, pending=0, total=0;
  DATA.forEach(cat=>cat.tests.forEach(t=>{
    total++;
    if(t.status==="pass") pass++;
    else if(t.status==="fail") fail++;
    else if(t.status==="blocked") blocked++;
    else pending++;
  }));
  document.getElementById("cnt-pass").textContent = pass;
  document.getElementById("cnt-fail").textContent = fail;
  document.getElementById("cnt-blocked").textContent = blocked;
  document.getElementById("cnt-pending").textContent = pending;
  document.getElementById("cnt-total").textContent = total;
}

function updateFilterChips(){
  document.querySelectorAll(".filter-chip").forEach(btn => {
    const s = btn.getAttribute("data-status");
    btn.classList.toggle("active", activeFilters.has(s));
  });
}

// ---- Add test case form ----
function toggleAddForm(){
  const form = document.getElementById("addForm");
  const isHidden = form.style.display === "none";
  if(isHidden){
    populateCategoryOptions();
    form.style.display = "block";
  } else {
    form.style.display = "none";
  }
}
function populateCategoryOptions(){
  const dl = document.getElementById("categoryOptions");
  dl.innerHTML = DATA.map(c => `<option value="${escapeHtml(c.name)}"></option>`).join("");
}
function submitAddForm(){
  const category = document.getElementById("af-category").value.trim();
  const id = document.getElementById("af-id").value.trim();
  const description = document.getElementById("af-description").value.trim();
  const expected = document.getElementById("af-expected").value.trim();
  if(!category){ alert("Please enter a category."); return; }
  if(!description){ alert("Please enter a description."); return; }
  let cat = DATA.find(c => c.name.toLowerCase() === category.toLowerCase());
  if(!cat){
    cat = {name: category, tests: []};
    DATA.push(cat);
    expanded[DATA.length - 1] = true;
  }
  cat.tests.push({
    id: id || ("T" + (cat.tests.length + 1)),
    description, expected,
    status: "pending",
    remarks: ""
  });
  document.getElementById("af-category").value = "";
  document.getElementById("af-id").value = "";
  document.getElementById("af-description").value = "";
  document.getElementById("af-expected").value = "";
  document.getElementById("addForm").style.display = "none";
  const ci = DATA.indexOf(cat);
  expanded[ci] = true;
  render();
}

function ensureIds(){
  DATA.forEach(cat=>{
    cat.tests.forEach(t=>{
      if(t.status===undefined || t.status==="") t.status="pending";
      if(t.remarks===undefined) t.remarks="";
    });
  });
}

function render(){
  ensureIds();
  const el = document.getElementById("tree");
  if(!DATA.length){
    el.innerHTML = '<div class="empty-state">No categories loaded. Import a file or download a template to get started.</div>';
    updateCounts();
    updateFilterChips();
    return;
  }

  const filtering = activeFilters.size > 0;
  let anyVisible = false;

  el.innerHTML = DATA.map((cat, ci) => {
    const color = COLORS[ci % COLORS.length];
    const passCount = cat.tests.filter(t=>t.status==="pass").length;
    const failCount = cat.tests.filter(t=>t.status==="fail").length;
    const isOpen = !!expanded[ci];

    const rows = cat.tests.map((t, ti) => ({t, ti}))
      .filter(({t}) => !filtering || activeFilters.has(t.status));

    if(filtering && rows.length === 0) return "";
    anyVisible = true;

    return `
    <div class="category" style="--cat-color:${color};">
      <div class="category-head">
        <div class="category-title-wrap" onclick="toggleCat(${ci})">
          <span class="chev ${isOpen?'open':''}">&#9656;</span>
          <span class="category-title">${escapeHtml(cat.name)}</span>
        </div>
        <div class="category-head-right">
          <span class="category-stats">${filtering ? rows.length + " shown &middot; " : ""}${passCount} pass &middot; ${failCount} fail &middot; ${cat.tests.length} total</span>
          <button class="icon-btn danger" title="Delete this category and all its test cases" onclick="event.stopPropagation(); deleteCategory(${ci})">✖</button>
        </div>
      </div>
      ${isOpen ? `<div class="category-body">
        ${rows.map(({t, ti}) => `
          <div class="test-row">
            <div class="test-top">
              <div class="test-desc">
                <div class="test-text"><span class="test-id">${escapeHtml(t.id||('T'+ti))}</span> &middot; ${escapeHtml(t.description||"")}</div>
                ${t.expected ? `<div class="test-expected">Expected: ${escapeHtml(t.expected)}</div>` : ""}
              </div>
              <div class="status-btns">
                <button class="status-btn ${t.status==='pass'?'active-pass':''}" onclick="setStatus(${ci},${ti},'pass')">Pass</button>
                <button class="status-btn ${t.status==='fail'?'active-fail':''}" onclick="setStatus(${ci},${ti},'fail')">Fail</button>
                <button class="status-btn ${t.status==='blocked'?'active-blocked':''}" onclick="setStatus(${ci},${ti},'blocked')">Blocked</button>
                <button class="icon-btn danger" title="Delete this test case" onclick="deleteTest(${ci},${ti})">✖</button>
              </div>
            </div>
            <textarea placeholder="Remarks..." oninput="setRemark(${ci},${ti},this.value)">${escapeHtml(t.remarks||"")}</textarea>
          </div>
        `).join("")}
      </div>` : ""}
    </div>`;
  }).join("");

  if(filtering && !anyVisible){
    el.innerHTML = '<div class="empty-state">No test cases match the current filter.</div>';
  }

  updateCounts();
  updateFilterChips();
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function setStatus(ci, ti, status){
  const t = DATA[ci].tests[ti];
  t.status = t.status === status ? "pending" : status;
  render();
}
function setRemark(ci, ti, val){
  DATA[ci].tests[ti].remarks = val;
}
function toggleCat(ci){
  expanded[ci] = !expanded[ci];
  render();
}

function deleteTest(ci, ti){
  const cat = DATA[ci];
  const t = cat.tests[ti];
  const label = t.id ? `"${t.id}"` : "this test case";
  if(!confirm(`Delete ${label}? This can't be undone.`)) return;
  cat.tests.splice(ti, 1);
  render();
}
function deleteCategory(ci){
  const cat = DATA[ci];
  if(!confirm(`Delete the category "${cat.name}" and all ${cat.tests.length} test case(s) in it? This can't be undone.`)) return;
  DATA.splice(ci, 1);
  // rebuild expanded map since indices shift
  const newExpanded = {};
  DATA.forEach((c, i) => newExpanded[i] = true);
  expanded = newExpanded;
  render();
  render();
}

function expandAll(){ DATA.forEach((c,i)=>expanded[i]=true); render(); }
function collapseAll(){ DATA.forEach((c,i)=>expanded[i]=false); render(); }

// ---- Flatten / unflatten helpers ----
function flatten(){
  const rows = [];
  DATA.forEach(cat => cat.tests.forEach(t => {
    rows.push({
      Category: cat.name,
      ID: t.id || "",
      Description: t.description || "",
      Expected: t.expected || "",
      Status: t.status || "pending",
      Remarks: t.remarks || ""
    });
  }));
  return rows;
}

function unflatten(rows){
  const map = {};
  const order = [];
  rows.forEach(r => {
    const catName = (r.Category || r.category || "Uncategorized").toString().trim() || "Uncategorized";
    if(!map[catName]){ map[catName] = []; order.push(catName); }
    map[catName].push({
      id: (r.ID || r.Id || r.id || "").toString(),
      description: (r.Description || r.description || "").toString(),
      expected: (r.Expected || r.expected || "").toString(),
      status: normalizeStatus(r.Status || r.status || "pending"),
      remarks: (r.Remarks || r.remarks || "").toString()
    });
  });
  return order.map(name => ({name, tests: map[name]}));
}

function normalizeStatus(s){
  s = (s||"").toString().trim().toLowerCase();
  if(["pass","fail","blocked"].includes(s)) return s;
  return "pending";
}

// ---- Import ----
function handleImport(event){
  const file = event.target.files[0];
  if(!file) return;
  const name = file.name.toLowerCase();
  const reader = new FileReader();

  if(name.endsWith(".json")){
    reader.onload = e => {
      try{
        const parsed = JSON.parse(e.target.result);
        if(Array.isArray(parsed) && parsed.length && parsed[0].tests){
          DATA = parsed.map(c => ({
            name: c.category || c.name || "Uncategorized",
            tests: (c.tests||[]).map(t => ({
              id: t.id || "", description: t.description || "", expected: t.expected || "",
              status: normalizeStatus(t.status), remarks: t.remarks || ""
            }))
          }));
        } else if(Array.isArray(parsed)){
          DATA = unflatten(parsed.map(r => ({
            Category: r.category || r.Category, ID: r.id || r.ID,
            Description: r.description || r.Description, Expected: r.expected || r.Expected,
            Status: r.status || r.Status, Remarks: r.remarks || r.Remarks
          })));
        }
        expanded = {}; DATA.forEach((c,i)=>expanded[i]=true);
        render();
      } catch(err){ alert("Could not parse JSON file: " + err.message); }
    };
    reader.readAsText(file);
  } else if(name.endsWith(".csv")){
    reader.onload = e => {
      const rows = parseCSV(e.target.result);
      DATA = unflatten(rows);
      expanded = {}; DATA.forEach((c,i)=>expanded[i]=true);
      render();
    };
    reader.readAsText(file);
  } else if(name.endsWith(".xlsx") || name.endsWith(".xls")){
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, {type:"array"});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {defval:""});
      DATA = unflatten(rows);
      expanded = {}; DATA.forEach((c,i)=>expanded[i]=true);
      render();
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert("Unsupported file type. Please use .json, .csv, or .xlsx");
  }
  event.target.value = "";
}

function parseCSV(text){
  const lines = text.replace(/\r\n/g,"\n").split("\n").filter(l => l.trim().length);
  if(!lines.length) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (cells[i] !== undefined ? cells[i] : ""));
    return obj;
  });
}
function splitCSVLine(line){
  const result = []; let cur = ""; let inQuotes = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(inQuotes){
      if(ch === '"'){
        if(line[i+1] === '"'){ cur += '"'; i++; } else { inQuotes = false; }
      } else { cur += ch; }
    } else {
      if(ch === '"'){ inQuotes = true; }
      else if(ch === ','){ result.push(cur); cur=""; }
      else { cur += ch; }
    }
  }
  result.push(cur);
  return result;
}

// ---- Template download ----
function downloadTemplate(){
  const format = document.getElementById("templateFormat").value;
  const sample = [
    {Category:"Category name", ID:"T1", Description:"What this test case verifies", Expected:"What should happen if it passes", Status:"pending", Remarks:""},
    {Category:"Category name", ID:"T2", Description:"Another test case in the same category", Expected:"Expected result", Status:"pending", Remarks:""}
  ];
  if(format === "json"){
    downloadBlob(JSON.stringify(sample, null, 2), "test_case_template.json", "application/json");
  } else if(format === "csv"){
    downloadBlob(rowsToCSV(sample), "test_case_template.csv", "text/csv");
  } else {
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Test cases");
    XLSX.writeFile(wb, "test_case_template.xlsx");
  }
}

// ---- Export results ----
function exportResults(format){
  const rows = flatten();
  if(format === "json"){
    downloadBlob(JSON.stringify(DATA.map(c=>({category:c.name, tests:c.tests})), null, 2), "test_case_results.json", "application/json");
  } else if(format === "csv"){
    downloadBlob(rowsToCSV(rows), "test_case_results.csv", "text/csv");
  } else {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "test_case_results.xlsx");
  }
}

function rowsToCSV(rows){
  if(!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach(r => {
    lines.push(headers.map(h => `"${String(r[h]).replace(/"/g,'""')}"`).join(","));
  });
  return lines.join("\n");
}

function downloadBlob(content, filename, mime){
  const blob = new Blob([content], {type:mime});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

render();