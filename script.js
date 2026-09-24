const DB_KEY="FINOCA_EXTREME_V1";

let db=JSON.parse(localStorage.getItem(DB_KEY)||"null");

if(!db){
db={
transactions:[],
wallets:[],
budgets:[],
goals:[],
loans:[],
recurring:[],
settings:{
currency:"₹",
theme:"dark",
emergencyTarget:0,
emergencySaved:0
},
pro:false
};
}

function save(){
localStorage.setItem(DB_KEY,JSON.stringify(db));
}

function money(value){
return (db.settings.currency||"₹")+
Number(value||0).toLocaleString("en-IN",{maximumFractionDigits:2});
}

function esc(v){
return String(v??"").replace(/[&<>"']/g,x=>({
"&":"&amp;",
"<":"&lt;",
">":"&gt;",
'"':"&quot;",
"'":"&#039;"
}[x]));
}

function toast(message){
const box=document.getElementById("toast-container");
const item=document.createElement("div");
item.className="toast";
item.textContent=message;
box.appendChild(item);
setTimeout(()=>item.remove(),3000);
}

function toggleSidebar(){
document.getElementById("sidebar").classList.toggle("open");
}

function toggleTheme(){
db.settings.theme=db.settings.theme==="dark"?"light":"dark";
document.documentElement.dataset.theme=db.settings.theme;
save();
}

function goTo(page){
document.querySelectorAll(".nav-btn").forEach(b=>{
b.classList.toggle("active",b.dataset.page===page);
});

const title={
dashboard:"Dashboard",
transactions:"Transactions",
wallets:"Wallets",
budgets:"Budgets",
goals:"Savings Goals",
loans:"Loans",
recurring:"Recurring",
receipts:"Receipt Scanner",
analytics:"Analytics",
reports:"Reports",
pro:"Finance Pro",
backup:"Backup & Restore",
settings:"Settings"
};

document.getElementById("page-title").textContent=title[page]||"FINOCA";

render(page);

if(innerWidth<900)
document.getElementById("sidebar").classList.remove("open");
}

document.querySelectorAll(".nav-btn").forEach(button=>{
button.addEventListener("click",()=>{
goTo(button.dataset.page);
});
});

function totals(){
const income=db.transactions
.filter(t=>t.type==="income")
.reduce((a,t)=>a+Number(t.amount),0);

const expense=db.transactions
.filter(t=>t.type==="expense")
.reduce((a,t)=>a+Number(t.amount),0);

return{
income,
expense,
balance:income-expense
};
}

/* =========================
   HEALTH ENGINE
========================= */

function healthScore(){

const t=totals();

if(!t.income&&!t.expense)
return 50;

let score=50;

if(t.income>0){
const saving=(t.income-t.expense)/t.income;

score+=Math.round(saving*45);
}

if(db.budgets.length)
score+=5;

if(db.goals.length)
score+=5;

if(t.expense>t.income)
score-=25;

return Math.max(0,Math.min(100,score));
}

function savingRate(){
const t=totals();

if(!t.income)return 0;

return Math.round(
Math.max(0,(t.income-t.expense)/t.income*100)
);
}

function netWorth(){

const walletMoney=db.wallets
.reduce((a,w)=>a+Number(w.balance),0);

const loanDebt=db.loans
.reduce((a,l)=>a+Math.max(0,Number(l.total)-Number(l.paid)),0);

return walletMoney-loanDebt;
}

/* =========================
   DASHBOARD
========================= */

function dashboardPage(){

const t=totals();

return `
<div class="page">

<div class="stats-grid">

<div class="stat-card">
<div class="stat-label">TOTAL INCOME</div>
<div class="stat-value income">${money(t.income)}</div>
<p>Recorded income</p>
</div>

<div class="stat-card">
<div class="stat-label">TOTAL EXPENSE</div>
<div class="stat-value expense">${money(t.expense)}</div>
<p>Recorded spending</p>
</div>

<div class="stat-card">
<div class="stat-label">BALANCE</div>
<div class="stat-value neutral">${money(t.balance)}</div>
<p>Current recorded balance</p>
</div>

<div class="stat-card">
<div class="stat-label">HEALTH SCORE</div>
<div class="stat-value">${healthScore()}/100</div>
<p>${savingRate()}% saving rate</p>
</div>

</div>

<div class="dashboard-grid">

<div class="panel">

<div class="panel-header">
<div>
<h3>Cash Flow Intelligence</h3>
<p>Income vs expenses.</p>
</div>

<span class="badge">LIVE</span>
</div>

<div class="chart-box">
<canvas id="cashChart"></canvas>
</div>

</div>

<div>

<div class="panel">

<div class="panel-header">
<div>
<h3>Financial Snapshot</h3>
<p>Important numbers.</p>
</div>
</div>

<div class="insight">
<strong>Net Worth</strong><br>
${money(netWorth())}
</div>

<div class="insight">
<strong>Savings Rate</strong><br>
${savingRate()}%
</div>

<div class="insight">
<strong>Active Loans</strong><br>
${db.loans.length}
</div>

<div class="insight">
<strong>Goals</strong><br>
${db.goals.length}
</div>

</div>

<div class="panel">

<h3>Smart Alerts</h3>

${smartAlerts()}

</div>

</div>

</div>

<div class="panel">

<div class="panel-header">
<div>
<h3>Quick Actions</h3>
<p>Fast money management.</p>
</div>
</div>

<div class="quick-actions">
<button onclick="openTransactionModal()">＋ Transaction</button>
<button onclick="openWalletModal()">▣ Wallet</button>
<button onclick="openGoalModal()">◎ Goal</button>
<button onclick="openBudgetModal()">◫ Budget</button>
<button onclick="openLoanModal()">▰ Loan</button>
<button onclick="openRecurringModal()">↻ Recurring</button>
</div>

</div>

<div class="panel">

<div class="panel-header">
<div>
<h3>Recent Activity</h3>
<p>Latest transactions.</p>
</div>
<button class="secondary-btn" onclick="goTo('transactions')">View all</button>
</div>

${transactionTable([...db.transactions].reverse().slice(0,8))}

</div>

</div>`;
}

function smartAlerts(){

let arr=[];

db.budgets.forEach(b=>{

const spent=db.transactions
.filter(t=>t.type==="expense"&&t.category===b.category)
.reduce((a,t)=>a+Number(t.amount),0);

if(b.amount>0&&spent>=b.amount*.8){

arr.push(`
<div class="alert">
⚠ <strong>${esc(b.category)}</strong> budget is
${Math.round(spent/b.amount*100)}% used.
</div>`);
}
});

db.loans.forEach(l=>{

const remaining=Math.max(0,l.total-l.paid);

if(remaining>0){

arr.push(`
<div class="alert">
🏦 ${esc(l.name)} has ${money(remaining)} remaining.
</div>`);
}
});

if(!arr.length){

arr.push(`
<div class="insight">
✓ No major alerts detected.
</div>`);
}

return arr.slice(0,5).join("");
}

/* =========================
   TRANSACTIONS
========================= */

function transactionTable(list){

if(!list.length)
return `<div class="empty">
<strong>No transactions</strong>
Add your first transaction.
</div>`;

return `
<div class="table-wrap">
<table class="data-table">

<thead>
<tr>
<th>NAME</th>
<th>CATEGORY</th>
<th>TYPE</th>
<th>DATE</th>
<th>AMOUNT</th>
<th></th>
</tr>
</thead>

<tbody>

${list.map(t=>`

<tr>

<td><strong>${esc(t.name)}</strong></td>

<td>${esc(t.category)}</td>

<td>${esc(t.type)}</td>

<td>${esc(t.date)}</td>

<td class="${t.type==="income"?"income":"expense"}">
${t.type==="income"?"+":"-"}${money(t.amount)}
</td>

<td>
<button class="danger-btn"
onclick="deleteTransaction('${t.id}')">
Delete
</button>
</td>

</tr>

`).join("")}

</tbody>
</table>
</div>`;
}

function transactionsPage(){

return `
<div class="page">

<div class="panel">

<div class="panel-header">

<div>
<h3>Transactions</h3>
<p>Complete financial activity.</p>
</div>

<button class="primary-btn"
onclick="openTransactionModal()">
+ Add
</button>

</div>

<div class="toolbar">

<input
placeholder="Search transactions..."
oninput="filterTransactions(this.value)">

<select onchange="filterType(this.value)">
<option value="all">All types</option>
<option value="income">Income</option>
<option value="expense">Expense</option>
</select>

<select onchange="filterCategory(this.value)">
<option value="all">All categories</option>
<option>Food</option>
<option>Transport</option>
<option>Shopping</option>
<option>Bills</option>
<option>Education</option>
<option>Health</option>
<option>Entertainment</option>
<option>Salary</option>
<option>Other</option>
</select>

</div>

<div id="transaction-list">
${transactionTable([...db.transactions].reverse())}
</div>

</div>

</div>`;
}

let transactionSearch="";
let transactionType="all";
let transactionCategory="all";

function refreshTransactionList(){

let list=[...db.transactions].reverse();

list=list.filter(t=>
(!transactionSearch||
t.name.toLowerCase().includes(transactionSearch.toLowerCase())||
t.category.toLowerCase().includes(transactionSearch.toLowerCase()))
&&
(transactionType==="all"||t.type===transactionType)
&&
(transactionCategory==="all"||t.category===transactionCategory)
);

const box=document.getElementById("transaction-list");

if(box)
box.innerHTML=transactionTable(list);
}

function filterTransactions(v){
transactionSearch=v;
refreshTransactionList();
}

function filterType(v){
transactionType=v;
refreshTransactionList();
}

function filterCategory(v){
transactionCategory=v;
refreshTransactionList();
}

function openTransactionModal(){

showModal(`

<button class="modal-close" onclick="hideModal()">×</button>

<h2>Add Transaction</h2>

<div class="form-group">
<label>Name</label>
<input id="txName" placeholder="Groceries">
</div>

<div class="form-grid">

<div class="form-group">
<label>Amount</label>
<input id="txAmount" type="number" min="0">
</div>

<div class="form-group">
<label>Type</label>
<select id="txType">
<option value="expense">Expense</option>
<option value="income">Income</option>
</select>
</div>

<div class="form-group">
<label>Category</label>
<select id="txCategory">
<option>Food</option>
<option>Transport</option>
<option>Shopping</option>
<option>Bills</option>
<option>Education</option>
<option>Health</option>
<option>Entertainment</option>
<option>Salary</option>
<option>Other</option>
</select>
</div>

<div class="form-group">
<label>Date</label>
<input id="txDate" type="date"
value="${new Date().toISOString().slice(0,10)}">
</div>

</div>

<div class="form-actions">
<button class="secondary-btn" onclick="hideModal()">Cancel</button>
<button class="primary-btn" onclick="addTransaction()">Save</button>
</div>
`);
}

function addTransaction(){

const name=document.getElementById("txName").value.trim();
const amount=Number(document.getElementById("txAmount").value);

if(!name||amount<=0){
toast("Enter a valid transaction");
return;
}

db.transactions.push({
id:Date.now().toString(),
name,
amount,
type:document.getElementById("txType").value,
category:document.getElementById("txCategory").value,
date:document.getElementById("txDate").value
});

save();
hideModal();
toast("Transaction added");
goTo("transactions");
}

function deleteTransaction(id){

db.transactions=db.transactions.filter(t=>t.id!==id);

save();

toast("Transaction deleted");

goTo("transactions");
}

/* =========================
   WALLETS
========================= */

function walletsPage(){

return `
<div class="page">

<div class="panel">

<div class="panel-header">
<div>
<h3>Wallets & Accounts</h3>
<p>Track your money locations.</p>
</div>

<button class="primary-btn" onclick="openWalletModal()">+ Wallet</button>
</div>

<div class="cards-grid">

${db.wallets.length?

db.wallets.map(w=>`

<div class="wallet-card">

<div class="big-number">${money(w.balance)}</div>

<h3>${esc(w.name)}</h3>

<button class="danger-btn"
onclick="deleteWallet('${w.id}')">
Delete
</button>

</div>

`).join(""):

`<div class="empty">
<strong>No wallets</strong>
Create a wallet.
</div>`}

</div>

</div>
</div>`;
}

function openWalletModal(){

showModal(`

<button class="modal-close" onclick="hideModal()">×</button>

<h2>Add Wallet</h2>

<div class="form-group">
<label>Wallet name</label>
<input id="walletName" placeholder="Cash / Bank / UPI">
</div>

<div class="form-group">
<label>Balance</label>
<input id="walletBalance" type="number">
</div>

<div class="form-actions">
<button class="secondary-btn" onclick="hideModal()">Cancel</button>
<button class="primary-btn" onclick="addWallet()">Save</button>
</div>
`);
}

function addWallet(){

const name=document.getElementById("walletName").value.trim();
const balance=Number(document.getElementById("walletBalance").value||0);

if(!name){
toast("Enter wallet name");
return;
}

db.wallets.push({
id:Date.now().toString(),
name,
balance
});

save();
hideModal();
toast("Wallet added");
goTo("wallets");
}

function deleteWallet(id){

db.wallets=db.wallets.filter(w=>w.id!==id);

save();

goTo("wallets");
}

/* =========================
   BUDGETS
========================= */

function budgetsPage(){

return `
<div class="page">

<div class="panel">

<div class="panel-header">

<div>
<h3>Smart Budgets</h3>
<p>Monitor category spending.</p>
</div>

<button class="primary-btn" onclick="openBudgetModal()">+ Budget</button>

</div>

<div class="cards-grid">

${db.budgets.length?

db.budgets.map(b=>{

const spent=db.transactions
.filter(t=>t.type==="expense"&&t.category===b.category)
.reduce((a,t)=>a+Number(t.amount),0);

const pct=Math.min(100,b.amount?spent/b.amount*100:0);

return `
<div class="budget-card">

<h3>${esc(b.category)}</h3>

<div class="card-amount">
${money(spent)}
</div>

<div class="progress">
<div class="progress-bar"
style="width:${pct}%"></div>
</div>

<div class="progress-label">
<span>${Math.round(pct)}% used</span>
<span>${money(Math.max(0,b.amount-spent))} left</span>
</div>

</div>`;

}).join(""):

`<div class="empty">
<strong>No budgets</strong>
Create your first budget.
</div>`}

</div>

</div>
</div>`;
}

function openBudgetModal(){

showModal(`

<button class="modal-close" onclick="hideModal()">×</button>

<h2>Create Budget</h2>

<div class="form-group">
<label>Category</label>

<select id="budgetCategory">
<option>Food</option>
<option>Transport</option>
<option>Shopping</option>
<option>Bills</option>
<option>Education</option>
<option>Health</option>
<option>Entertainment</option>
<option>Other</option>
</select>
</div>

<div class="form-group">
<label>Budget amount</label>
<input id="budgetAmount" type="number">
</div>

<div class="form-actions">
<button class="secondary-btn" onclick="hideModal()">Cancel</button>
<button class="primary-btn" onclick="addBudget()">Save</button>
</div>
`);
}

function addBudget(){

const category=document.getElementById("budgetCategory").value;
const amount=Number(document.getElementById("budgetAmount").value);

if(amount<=0){
toast("Enter budget amount");
return;
}

db.budgets.push({
id:Date.now().toString(),
category,
amount
});

save();
hideModal();
toast("Budget created");
goTo("budgets");
}

/* =========================
   GOALS
========================= */

function goalsPage(){

return `
<div class="page">

<div class="panel">

<div class="panel-header">

<div>
<h3>Savings Goals</h3>
<p>Plan and forecast your targets.</p>
</div>

<button class="primary-btn" onclick="openGoalModal()">+ Goal</button>

</div>

<div class="cards-grid">

${db.goals.length?

db.goals.map(g=>{

const pct=Math.min(100,g.target?g.saved/g.target*100:0);
const monthly=Math.max(0,totals().income-totals().expense);
const remaining=Math.max(0,g.target-g.saved);
const months=monthly?Math.ceil(remaining/monthly):0;

return `
<div class="goal-card">

<h3>${esc(g.name)}</h3>

<div class="card-amount">
${money(g.saved)}
</div>

<div class="progress">
<div class="progress-bar"
style="width:${pct}%"></div>
</div>

<div class="progress-label">
<span>${Math.round(pct)}%</span>
<span>${money(g.target)}</span>
</div>

<div class="insight">

Remaining: ${money(remaining)}<br>

Estimated time:
<strong>
${months?months+" months":"Increase savings"}
</strong>

</div>

<button class="secondary-btn"
onclick="addGoalMoney('${g.id}')">
＋ Add savings
</button>

</div>`;

}).join(""):

`<div class="empty">
<strong>No savings goals</strong>
Create a target.
</div>`}

</div>
</div>
</div>`;
}

function openGoalModal(){

showModal(`

<button class="modal-close" onclick="hideModal()">×</button>

<h2>Create Savings Goal</h2>

<div class="form-group">
<label>Goal name</label>
<input id="goalName" placeholder="Emergency fund">
</div>

<div class="form-group">
<label>Target amount</label>
<input id="goalTarget" type="number">
</div>

<div class="form-group">
<label>Already saved</label>
<input id="goalSaved" type="number" value="0">
</div>

<div class="form-actions">
<button class="secondary-btn" onclick="hideModal()">Cancel</button>
<button class="primary-btn" onclick="addGoal()">Create</button>
</div>
`);
}

function addGoal(){

const name=document.getElementById("goalName").value.trim();
const target=Number(document.getElementById("goalTarget").value);
const saved=Number(document.getElementById("goalSaved").value||0);

if(!name||target<=0){
toast("Enter valid goal information");
return;
}

db.goals.push({
id:Date.now().toString(),
name,
target,
saved
});

save();
hideModal();
toast("Goal created");
goTo("goals");
}

function addGoalMoney(id){

const goal=db.goals.find(g=>g.id===id);

if(!goal)return;

const value=Number(prompt("Enter amount saved"));

if(!value||value<=0)return;

goal.saved+=value;

save();

goTo("goals");

toast("Savings updated");
}

/* =========================
   LOANS
========================= */

function loansPage(){

return `
<div class="page">

<div class="panel">

<div class="panel-header">

<div>
<h3>Loan Command Center</h3>
<p>Track EMI and repayment.</p>
</div>

<button class="primary-btn" onclick="openLoanModal()">+ Loan</button>

</div>

<div class="cards-grid">

${db.loans.length?

db.loans.map(l=>{

const remaining=Math.max(0,l.total-l.paid);
const pct=l.total?Math.min(100,l.paid/l.total*100):0;
const months=l.emi?Math.ceil(remaining/l.emi):0;

return `
<div class="loan-card">

<div class="loan-header">

<div class="loan-title">
<div class="loan-icon">▰</div>
<div>
<h3>${esc(l.name)}</h3>
<p>EMI ${money(l.emi)}</p>
</div>
</div>

<div class="loan-progress-number">
${Math.round(pct)}%
</div>

</div>

<div class="loan-stats">

<div class="loan-stat">
<small>Principal</small>
<strong>${money(l.total)}</strong>
</div>

<div class="loan-stat">
<small>Paid</small>
<strong>${money(l.paid)}</strong>
</div>

<div class="loan-stat">
<small>Remaining</small>
<strong>${money(remaining)}</strong>
</div>

</div>

<div class="progress">
<div class="progress-bar"
style="width:${pct}%"></div>
</div>

<div class="progress-label">
<span>${Math.round(pct)}% complete</span>
<span>${months} EMI left</span>
</div>

<div class="loan-actions">

<button class="primary-btn"
onclick="payEMI('${l.id}')">
Pay EMI
</button>

<button class="danger-btn"
onclick="deleteLoan('${l.id}')">
Delete
</button>

</div>

</div>`;

}).join(""):

`<div class="empty">
<strong>No loans</strong>
Add a loan to start tracking.
</div>`}

</div>

</div>
</div>`;
}

function openLoanModal(){

showModal(`

<button class="modal-close" onclick="hideModal()">×</button>

<h2>Add Loan</h2>

<div class="form-group">
<label>Loan name</label>
<input id="loanName" placeholder="Education loan">
</div>

<div class="form-grid">

<div class="form-group">
<label>Total principal</label>
<input id="loanTotal" type="number">
</div>

<div class="form-group">
<label>Monthly EMI</label>
<input id="loanEMI" type="number">
</div>

</div>

<div class="form-actions">
<button class="secondary-btn" onclick="hideModal()">Cancel</button>
<button class="primary-btn" onclick="addLoan()">Create</button>
</div>
`);
}

function addLoan(){

const name=document.getElementById("loanName").value.trim();
const total=Number(document.getElementById("loanTotal").value);
const emi=Number(document.getElementById("loanEMI").value);

if(!name||total<=0||emi<=0){
toast("Enter valid loan details");
return;
}

db.loans.push({
id:Date.now().toString(),
name,
total,
emi,
paid:0,
emisPaid:0
});

save();
hideModal();
toast("Loan created");
goTo("loans");
}

function payEMI(id){

const loan=db.loans.find(l=>l.id===id);

if(!loan)return;

const payment=Math.min(
Number(loan.emi),
Math.max(0,Number(loan.total)-Number(loan.paid))
);

if(payment<=0){
toast("Loan already completed");
return;
}

loan.paid+=payment;
loan.emisPaid=(loan.emisPaid||0)+1;

save();

goTo("loans");

toast(
loan.paid>=loan.total?
"🎉 Loan completed":
"EMI payment recorded"
);
}

function deleteLoan(id){

db.loans=db.loans.filter(l=>l.id!==id);

save();

goTo("loans");
}

/* =========================
   RECURRING
========================= */

function recurringPage(){

let monthly=0;

db.recurring.forEach(r=>{

if(r.frequency==="Weekly")
monthly+=Number(r.amount)*4.33;
else if(r.frequency==="Yearly")
monthly+=Number(r.amount)/12;
else
monthly+=Number(r.amount);

});

return `
<div class="page">

<div class="panel">

<div class="panel-header">

<div>
<h3>Recurring & Subscriptions</h3>
<p>Monitor regular payments.</p>
</div>

<button class="primary-btn"
onclick="openRecurringModal()">
+ Payment
</button>

</div>

<div class="stats-grid">

<div class="stat-card">
<div class="stat-label">MONTHLY</div>
<div class="stat-value expense">${money(monthly)}</div>
</div>

<div class="stat-card">
<div class="stat-label">YEARLY</div>
<div class="stat-value">${money(monthly*12)}</div>
</div>

</div>

${db.recurring.length?

db.recurring.map(r=>`

<div class="insight">
<strong>${esc(r.name)}</strong><br>
${money(r.amount)} • ${esc(r.frequency)}
</div>

`).join(""):

`<div class="empty">
<strong>No recurring payments</strong>
</div>`}

</div>
</div>`;
}

function openRecurringModal(){

showModal(`

<button class="modal-close" onclick="hideModal()">×</button>

<h2>Recurring Payment</h2>

<div class="form-group">
<label>Name</label>
<input id="recName" placeholder="Internet / Subscription">
</div>

<div class="form-group">
<label>Amount</label>
<input id="recAmount" type="number">
</div>

<div class="form-group">
<label>Frequency</label>
<select id="recFrequency">
<option>Monthly</option>
<option>Weekly</option>
<option>Yearly</option>
</select>
</div>

<div class="form-actions">
<button class="secondary-btn" onclick="hideModal()">Cancel</button>
<button class="primary-btn" onclick="addRecurring()">Save</button>
</div>
`);
}

function addRecurring(){

const name=document.getElementById("recName").value.trim();
const amount=Number(document.getElementById("recAmount").value);
const frequency=document.getElementById("recFrequency").value;

if(!name||amount<=0){
toast("Enter valid payment");
return;
}

db.recurring.push({
id:Date.now().toString(),
name,
amount,
frequency
});

save();
hideModal();
toast("Recurring payment added");
goTo("recurring");
}

/* =========================
   RECEIPTS
========================= */

function receiptsPage(){

return `
<div class="page">

<div class="panel">

<div class="panel-header">
<div>
<h3>Receipt Scanner</h3>
<p>Local image preview.</p>
</div>
</div>

<div class="insight">
<strong>Privacy:</strong>
The selected image is processed in this browser preview and isn't
uploaded by this page.
</div>

<input type="file"
accept="image/*"
onchange="previewReceipt(event)">

<div id="receiptResult"></div>

</div>

</div>`;
}

function previewReceipt(event){

const file=event.target.files[0];

if(!file)return;

const reader=new FileReader();

reader.onload=()=>{

document.getElementById("receiptResult").innerHTML=`

<img class="receipt-preview"
src="${reader.result}"
alt="Receipt preview">

<div class="insight">
Receipt image loaded successfully.
</div>

`;
};

reader.readAsDataURL(file);
}

/* =========================
   ANALYTICS
========================= */

function analyticsPage(){

return `
<div class="page">

<div class="panel">

<div class="panel-header">
<div>
<h3>Advanced Analytics</h3>
<p>Category and cash-flow analysis.</p>
</div>
</div>

<div class="chart-box">
<canvas id="analyticsChart"></canvas>
</div>

</div>

<div class="panel">

<h3>Financial Intelligence</h3>

${financialInsights()}

</div>

</div>`;
}

function financialInsights(){

const t=totals();

let arr=[];

if(t.income>t.expense)
arr.push(`✓ Your recorded income exceeds your recorded expenses.`);

if(t.expense>t.income)
arr.push(`⚠ Recorded expenses currently exceed recorded income.`);

arr.push(`Savings rate: ${savingRate()}%.`);

arr.push(`Estimated net worth: ${money(netWorth())}.`);

if(db.recurring.length)
arr.push(`${db.recurring.length} recurring payment(s) are being tracked.`);

if(db.loans.length)
arr.push(`${db.loans.length} loan(s) are being tracked.`);

return arr.map(x=>`
<div class="insight">${x}</div>
`).join("");
}

function drawAnalyticsChart(){

const canvas=document.getElementById("analyticsChart");

if(!canvas)return;

let categories={};

db.transactions
.filter(t=>t.type==="expense")
.forEach(t=>{
categories[t.category]=(categories[t.category]||0)+Number(t.amount);
});

new Chart(canvas,{
type:"bar",
data:{
labels:Object.keys(categories),
datasets:[{
label:"Expenses",
data:Object.values(categories)
}]
},
options:{
responsive:true,
maintainAspectRatio:false
}
});
}

/* =========================
   REPORTS
========================= */

function reportsPage(){

const t=totals();

return `
<div class="page">

<div class="panel">

<h3>FINOCA Financial Report</h3>

<p>Generated from locally stored data.</p>

<div class="stats-grid">

<div class="stat-card">
<div class="stat-label">INCOME</div>
<div class="stat-value income">${money(t.income)}</div>
</div>

<div class="stat-card">
<div class="stat-label">EXPENSE</div>
<div class="stat-value expense">${money(t.expense)}</div>
</div>

<div class="stat-card">
<div class="stat-label">BALANCE</div>
<div class="stat-value neutral">${money(t.balance)}</div>
</div>

<div class="stat-card">
<div class="stat-label">NET WORTH</div>
<div class="stat-value">${money(netWorth())}</div>
</div>

</div>

<h3>Health Score: ${healthScore()}/100</h3>

${financialInsights()}

<button class="primary-btn"
onclick="window.print()">
Print / Save Report
</button>

</div>

</div>`;
}

/* =========================
   PRO
========================= */

function proPage(){

return `
<div class="page">

<div class="pro-hero">

<div class="pro-symbol">✦</div>

<h1>FINOCA Finance Pro</h1>

<p>
Advanced financial intelligence tools.
</p>

<div class="pro-price">
₹99 <small>/ month</small>
</div>

<p><strong>₹1,169 / year</strong></p>

<button class="primary-btn"
onclick="choosePlan('monthly')">
₹99 Monthly
</button>

<button class="secondary-btn"
onclick="choosePlan('yearly')">
₹1,169 Yearly
</button>

<div class="insight" style="margin-top:18px">
<strong>Google Play product IDs</strong><br>
Monthly: <code>finoca_pro_monthly</code><br>
Yearly: <code>finoca_pro_yearly</code>
</div>

<p>
The web version does not fake payment confirmation.
Real purchases should be verified through Google Play Billing
in the Android app.
</p>

</div>

<div class="pro-grid">

${proFeature("🧠","Money Health Engine",
"Advanced score and financial diagnostics.","health")}

${proFeature("🔮","What-If Simulator",
"Model future savings under different scenarios.","sim")}

${proFeature("🎯","Goal Forecast",
"Calculate estimated time to reach your goals.","forecast")}

${proFeature("💳","Subscription Intelligence",
"Calculate recurring monthly and yearly costs.","subscriptions")}

${proFeature("🏦","Loan Intelligence",
"Analyse EMI burden and payoff timeline.","loan")}

${proFeature("📈","Net Worth Engine",
"Combine wallet assets and remaining debt.","networth")}

${proFeature("🛡","Emergency Fund",
"Track emergency savings against your target.","emergency")}

${proFeature("🔔","Smart Alerts",
"Identify budgets, debt and recurring-payment alerts.","alerts")}

${proFeature("📅","Financial Calendar",
"View recurring obligations and loan EMIs.","calendar")}

</div>

</div>`;
}

function proFeature(icon,title,description,type){

return `
<div class="pro-card"
onclick="openProTool('${type}')"
style="cursor:pointer">

<div class="pro-icon">${icon}</div>

<h3>${title}</h3>

<p>${description}</p>

<button class="secondary-btn">
Open
</button>

</div>`;
}

function choosePlan(plan){

const id=plan==="monthly"
?"finoca_pro_monthly"
:"finoca_pro_yearly";

showModal(`

<button class="modal-close" onclick="hideModal()">×</button>

<h2>Finance Pro</h2>

<div class="stat-card">

<div class="stat-label">
SELECTED PLAN
</div>

<div class="stat-value">
${plan==="monthly"?"₹99 / month":"₹1,169 / year"}
</div>

</div>

<div class="insight">
Google Play product ID:<br>
<strong>${id}</strong>
</div>

<p>
This is the web preview. No payment has been recorded.
In your Android release, this action should launch Google Play
Billing and Pro should unlock only after the purchase is verified.
</p>

<button class="secondary-btn"
onclick="hideModal()">
Close
</button>

`);
}

function openProTool(type){

let html="";

if(type==="health"){

html=`

<h2>Money Health Engine</h2>

<div class="score">
<strong>${healthScore()}</strong>
</div>

${financialInsights()}

`;
}

if(type==="sim"){

html=`

<h2>What-If Simulator</h2>

<div class="form-group">
<label>Current monthly savings</label>
<input id="simCurrent"
type="number"
value="${Math.max(0,totals().income-totals().expense)}">
</div>

<div class="form-group">
<label>Extra monthly saving</label>
<input id="simExtra"
type="number"
value="2000">
</div>

<div class="form-group">
<label>Number of months</label>
<input id="simMonths"
type="number"
value="12">
</div>

<button class="primary-btn"
onclick="runSimulator()">
Calculate Future
</button>

<div id="simResult"></div>

`;
}

if(type==="forecast"){

html=`

<h2>Goal Forecast</h2>

${db.goals.length?

db.goals.map(g=>{

const monthly=Math.max(
0,
totals().income-totals().expense
);

const remaining=Math.max(0,g.target-g.saved);

const months=monthly?
Math.ceil(remaining/monthly):0;

return `
<div class="insight">

<strong>${esc(g.name)}</strong><br>

Target: ${money(g.target)}<br>

Saved: ${money(g.saved)}<br>

Remaining: ${money(remaining)}<br>

Estimated time:
<strong>
${months?months+" months":"Increase monthly savings"}
</strong>

</div>`;

}).join(""):

`<div class="empty">Create a savings goal first.</div>`}

`;

}

if(type==="subscriptions"){

let monthly=0;

db.recurring.forEach(r=>{

if(r.frequency==="Weekly")
monthly+=Number(r.amount)*4.33;

else if(r.frequency==="Yearly")
monthly+=Number(r.amount)/12;

else
monthly+=Number(r.amount);

});

html=`

<h2>Subscription Intelligence</h2>

<div class="stat-card">
<div class="stat-label">MONTHLY COMMITMENT</div>
<div class="big-number">${money(monthly)}</div>
</div>

<div class="stat-card">
<div class="stat-label">YEARLY COMMITMENT</div>
<div class="big-number">${money(monthly*12)}</div>
</div>

`;

}

if(type==="loan"){

const income=totals().income;

html=`

<h2>Advanced Loan Intelligence</h2>

${db.loans.length?

db.loans.map(l=>{

const remaining=Math.max(0,l.total-l.paid);

const burden=income?
l.emi/income*100:0;

const months=l.emi?
Math.ceil(remaining/l.emi):0;

return `
<div class="insight">

<strong>${esc(l.name)}</strong><br>

Remaining:
${money(remaining)}<br>

EMI:
${money(l.emi)}<br>

EMI burden:
${burden.toFixed(1)}% of recorded income<br>

Estimated remaining payments:
${months}

</div>`;

}).join(""):

`<div class="empty">Add a loan first.</div>`}

`;

}

if(type==="networth"){

const assets=db.wallets
.reduce((a,w)=>a+Number(w.balance),0);

const debt=db.loans
.reduce((a,l)=>a+Math.max(0,l.total-l.paid),0);

html=`

<h2>Net Worth Engine</h2>

<div class="stat-card">

<div class="stat-label">ASSETS</div>
<div class="big-number">${money(assets)}</div>

</div>

<div class="stat-card">

<div class="stat-label">LIABILITIES</div>
<div class="big-number">${money(debt)}</div>

</div>

<div class="stat-card">

<div class="stat-label">ESTIMATED NET WORTH</div>
<div class="big-number">${money(assets-debt)}</div>

</div>

`;

}

if(type==="emergency"){

html=`

<h2>Emergency Fund</h2>

<div class="form-group">
<label>Target</label>
<input id="emTarget"
type="number"
value="${db.settings.emergencyTarget||0}">
</div>

<div class="form-group">
<label>Current savings</label>
<input id="emSaved"
type="number"
value="${db.settings.emergencySaved||0}">
</div>

<button class="primary-btn"
onclick="calculateEmergency()">
Save & Calculate
</button>

<div id="emergencyResult"></div>

`;

}

if(type==="alerts"){

html=`

<h2>Smart Money Alerts</h2>

${smartAlerts()}

`;

}

if(type==="calendar"){

html=`

<h2>Financial Calendar</h2>

${db.recurring.map(r=>
`<div class="insight">
📅 ${esc(r.name)} —
${money(r.amount)} —
${esc(r.frequency)}
</div>`
).join("")}

${db.loans.map(l=>
`<div class="insight">
🏦 ${esc(l.name)} —
EMI ${money(l.emi)}
</div>`
).join("")}

${!db.recurring.length&&!db.loans.length?
`<div class="empty">
No scheduled items yet.
</div>`:""}

`;

}

showModal(`
<button class="modal-close" onclick="hideModal()">×</button>
${html}
`);
}

function runSimulator(){

const current=Number(document.getElementById("simCurrent").value||0);
const extra=Number(document.getElementById("simExtra").value||0);
const months=Number(document.getElementById("simMonths").value||0);

const result=(current+extra)*months;

document.getElementById("simResult").innerHTML=`

<div class="sim-result">
${money(result)}
</div>

<p>
Estimated savings after ${months} months.
</p>

`;
}

function calculateEmergency(){

const target=Number(document.getElementById("emTarget").value||0);
const saved=Number(document.getElementById("emSaved").value||0);

db.settings.emergencyTarget=target;
db.settings.emergencySaved=saved;

save();

const pct=target?
Math.min(100,saved/target*100):0;

document.getElementById("emergencyResult").innerHTML=`

<div class="sim-result">
${Math.round(pct)}%
</div>

<div class="progress">

<div class="progress-bar"
style="width:${pct}%">
</div>

</div>

<p>
${money(Math.max(0,target-saved))} remaining.
</p>

`;
}

/* =========================
   BACKUP
========================= */

function backupPage(){

return `
<div class="page">

<div class="panel">

<h3>Backup & Restore</h3>

<p>Export or restore your FINOCA data.</p>

<button class="primary-btn"
onclick="exportData()">
Export Backup
</button>

<label class="secondary-btn">
Import Backup
<input type="file"
accept=".json"
onchange="importData(event)"
hidden>
</label>

</div>

</div>`;
}

function exportData(){

const blob=new Blob(
[JSON.stringify(db,null,2)],
{type:"application/json"}
);

const url=URL.createObjectURL(blob);

const a=document.createElement("a");

a.href=url;
a.download="FINOCA-backup.json";
a.click();

URL.revokeObjectURL(url);

toast("Backup exported");
}

function importData(event){

const file=event.target.files[0];

if(!file)return;

const reader=new FileReader();

reader.onload=()=>{

try{

const imported=JSON.parse(reader.result);

if(!imported.transactions||
!imported.wallets)
throw new Error();

db=imported;

save();

toast("Backup restored");

goTo("dashboard");

}catch{

toast("Invalid backup file");

}

};

reader.readAsText(file);
}

/* =========================
   SETTINGS
========================= */

function settingsPage(){

return `
<div class="page">

<div class="panel">

<h3>Settings</h3>

<div class="settings-row">

<div>
<h4>Currency</h4>
<p>Display currency.</p>
</div>

<select onchange="changeCurrency(this.value)">
<option value="₹">₹ INR</option>
<option value="$">$ USD</option>
<option value="€">€ EUR</option>
<option value="£">£ GBP</option>
</select>

</div>

<div class="settings-row">

<div>
<h4>Theme</h4>
<p>Switch appearance.</p>
</div>

<button class="secondary-btn"
onclick="toggleTheme()">
Change
</button>

</div>

<div class="settings-row">

<div>
<h4>Reset FINOCA</h4>
<p>Delete local data.</p>
</div>

<button class="danger-btn"
onclick="clearData()">
Reset
</button>

</div>

</div>

</div>`;
}

function changeCurrency(v){

db.settings.currency=v;

save();

goTo("settings");
}

function clearData(){

if(!confirm("Delete all FINOCA data?"))
return;

localStorage.removeItem(DB_KEY);

location.reload();
}

/* =========================
   MODALS
========================= */

function showModal(html){

document.getElementById("modal-box").innerHTML=html;

document.getElementById("modal-backdrop")
.classList.add("open");
}

function hideModal(){

document.getElementById("modal-backdrop")
.classList.remove("open");
}

function closeModal(event){

if(event.target.id==="modal-backdrop")
hideModal();
}

/* =========================
   PAGE RENDER
========================= */

function render(page){

const pages={
dashboard:dashboardPage,
transactions:transactionsPage,
wallets:walletsPage,
budgets:budgetsPage,
goals:goalsPage,
loans:loansPage,
recurring:recurringPage,
receipts:receiptsPage,
analytics:analyticsPage,
reports:reportsPage,
pro:proPage,
backup:backupPage,
settings:settingsPage
};

const fn=pages[page]||dashboardPage;

document.getElementById("app-content").innerHTML=fn();

if(page==="dashboard")
drawCashChart();

if(page==="analytics")
drawAnalyticsChart();
}

function drawCashChart(){

const canvas=document.getElementById("cashChart");

if(!canvas)return;

const t=totals();

new Chart(canvas,{
type:"doughnut",
data:{
labels:["Income","Expenses"],
datasets:[{
data:[t.income,t.expense]
}]
},
options:{
responsive:true,
maintainAspectRatio:false
}
});
}

/* =========================
   START
========================= */

document.documentElement.dataset.theme=
db.settings.theme||"dark";

save();

render("dashboard");
