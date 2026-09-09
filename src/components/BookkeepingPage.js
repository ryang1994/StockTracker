import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SERVER_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000';

const EXPENSE_CATEGORIES = [
  'Postage & Packaging',
  'Equipment (labeller, 3D printer, etc.)',
  'Storage',
  'Software & Subscriptions',
  'Marketing',
  'Stock Purchase (manual)',
  'Other'
];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Formats as £1,234.56 with the minus sign before the £ for negatives
function formatMoney(value) {
  const num = parseFloat(value) || 0;
  const formatted = Math.abs(num).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${num < 0 ? '-' : ''}£${formatted}`;
}

// Today in YYYY-MM-DD, which is the format a date input expects
function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
}

function BookkeepingPage() {
  const [taxYears, setTaxYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [summary, setSummary] = useState(null);
  const [mileageEntries, setMileageEntries] = useState([]);
  const [expenseEntries, setExpenseEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [showMileageForm, setShowMileageForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showYearSettingsForm, setShowYearSettingsForm] = useState(false);
  const [showSetAsideForm, setShowSetAsideForm] = useState(false);

  const [mileageForm, setMileageForm] = useState({ trip_date: todayISO(), purpose: '', miles: '', notes: '' });
  const [mileageReceipt, setMileageReceipt] = useState(null);

  const [expenseForm, setExpenseForm] = useState({ expense_date: todayISO(), category: '', description: '', amount: '', notes: '' });
  const [expenseReceipt, setExpenseReceipt] = useState(null);

  const [yearSettingsForm, setYearSettingsForm] = useState({ employment_income: '' });
  const [setAsideInput, setSetAsideInput] = useState('');

  const fetchTaxYears = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/bookkeeping/tax-years`);
      if (!response.ok) throw new Error('Failed to load tax years');
      const data = await response.json();
      setTaxYears(data);
      if (data.length > 0 && selectedYear === null) {
        setSelectedYear(data[0].startYear);
      }
    } catch (err) {
      console.error('Failed to fetch tax years:', err);
      setLoadError('Could not load tax years from the server.');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = useCallback(async (year) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [summaryRes, mileageRes, expensesRes] = await Promise.all([
        fetch(`${API_URL}/bookkeeping/summary?taxYear=${year}`),
        fetch(`${API_URL}/mileage?taxYear=${year}`),
        fetch(`${API_URL}/expenses?taxYear=${year}`)
      ]);

      if (!summaryRes.ok || !mileageRes.ok || !expensesRes.ok) {
        throw new Error('One or more bookkeeping requests failed');
      }

      const summaryData = await summaryRes.json();
      if (!summaryData || !summaryData.taxYear) {
        throw new Error('Summary response was missing expected data');
      }

      setSummary(summaryData);
      setSetAsideInput(summaryData.amountSetAside || 0);
      setMileageEntries(await mileageRes.json());
      setExpenseEntries(await expensesRes.json());
    } catch (err) {
      console.error('Failed to fetch bookkeeping data:', err);
      setLoadError('Could not load bookkeeping data from the server. Check the backend is running the latest code.');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxYears();
  }, [fetchTaxYears]);

  useEffect(() => {
    if (selectedYear !== null) {
      fetchAll(selectedYear);
    }
  }, [selectedYear, fetchAll]);

  const openYearSettingsForm = () => {
    setYearSettingsForm({ employment_income: summary ? summary.employmentIncome : '' });
    setShowYearSettingsForm(true);
  };

  const handleSaveYearSettings = async () => {
    try {
      await fetch(`${API_URL}/bookkeeping/tax-year-settings/${selectedYear}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employment_income: yearSettingsForm.employment_income,
          amount_set_aside: summary ? summary.amountSetAside : 0
        })
      });
      setShowYearSettingsForm(false);
      fetchAll(selectedYear);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    }
  };

  const handleSaveSetAside = async () => {
    try {
      await fetch(`${API_URL}/bookkeeping/tax-year-settings/${selectedYear}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employment_income: summary ? summary.employmentIncome : 0,
          amount_set_aside: setAsideInput
        })
      });
      setShowSetAsideForm(false);
      fetchAll(selectedYear);
    } catch (err) {
      console.error(err);
      alert('Failed to save amount set aside.');
    }
  };

  const handleAddMileage = async () => {
    if (!mileageForm.trip_date || !mileageForm.miles) {
      alert('Please fill in at least the date and miles.');
      return;
    }
    try {
      const formData = new FormData();
      Object.entries(mileageForm).forEach(([key, value]) => formData.append(key, value));
      if (mileageReceipt) formData.append('receipt', mileageReceipt);

      const response = await fetch(`${API_URL}/mileage`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to add mileage');

      setMileageForm({ trip_date: todayISO(), purpose: '', miles: '', notes: '' });
      setMileageReceipt(null);
      setShowMileageForm(false);
      fetchAll(selectedYear);
    } catch (err) {
      console.error(err);
      alert('Failed to log mileage.');
    }
  };

  const handleDeleteMileage = async (id) => {
    const confirmed = window.confirm('Delete this mileage entry? This cannot be undone.');
    if (!confirmed) return;
    try {
      await fetch(`${API_URL}/mileage/${id}`, { method: 'DELETE' });
      fetchAll(selectedYear);
    } catch (err) {
      console.error(err);
      alert('Failed to delete mileage entry.');
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.expense_date || !expenseForm.amount) {
      alert('Please fill in at least the date and amount.');
      return;
    }
    try {
      const formData = new FormData();
      Object.entries(expenseForm).forEach(([key, value]) => formData.append(key, value));
      if (expenseReceipt) formData.append('receipt', expenseReceipt);

      const response = await fetch(`${API_URL}/expenses`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to add expense');

      setExpenseForm({ expense_date: todayISO(), category: '', description: '', amount: '', notes: '' });
      setExpenseReceipt(null);
      setShowExpenseForm(false);
      fetchAll(selectedYear);
    } catch (err) {
      console.error(err);
      alert('Failed to add expense.');
    }
  };

  const handleDeleteExpense = async (id) => {
    const confirmed = window.confirm('Delete this expense? This cannot be undone.');
    if (!confirmed) return;
    try {
      await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
      fetchAll(selectedYear);
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense.');
    }
  };

  const handleExport = () => {
    window.open(`${API_URL}/bookkeeping/export?taxYear=${selectedYear}`, '_blank');
  };

  if (loading && !summary) {
    return <p className="no-items">Loading bookkeeping data...</p>;
  }

  if (loadError && !summary) {
    return (
      <div className="coming-soon">
        <div className="coming-soon-icon">⚠️</div>
        <h2>Bookkeeping</h2>
        <p className="coming-soon-subtitle">{loadError}</p>
      </div>
    );
  }

  const setAsideDifference = summary && summary.tax
    ? summary.amountSetAside - summary.tax.totalEstimatedTax
    : null;

  return (
    <section className="inventory-section">
      <div className="bookkeeping-header">
        <h2>Bookkeeping</h2>
        {taxYears.length > 0 && (
          <select
            className="tax-year-select"
            value={selectedYear || ''}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          >
            {taxYears.map(y => (
              <option key={y.startYear} value={y.startYear}>{y.label}</option>
            ))}
          </select>
        )}
      </div>

      {summary && (
        <>
          <div className="deadline-banner">
            📅 For the {summary.taxYear.label} tax year: register for Self Assessment by <strong>{formatDate(summary.deadlines.registration)}</strong>, file and pay by <strong>{formatDate(summary.deadlines.filingAndPayment)}</strong>.
          </div>

          {/* Tax savings tracker - the whole point of this tab */}
          {summary.tax && (
            <div className="tax-savings-card">
              <div className="tax-savings-header">
                <span>💰 Tax Savings Tracker</span>
                <button className="btn-cancel bookkeeping-small-btn" onClick={() => setShowSetAsideForm(!showSetAsideForm)}>
                  {showSetAsideForm ? 'Close' : 'Update'}
                </button>
              </div>

              <div className="tax-savings-row">
                <span>Estimated tax owed so far</span>
                <strong>{formatMoney(summary.tax.totalEstimatedTax)}</strong>
              </div>
              <div className="tax-savings-row">
                <span>You've set aside</span>
                <strong>{formatMoney(summary.amountSetAside)}</strong>
              </div>

              {showSetAsideForm ? (
                <div className="set-aside-form">
                  <input
                    type="number"
                    step="0.01"
                    value={setAsideInput}
                    onChange={(e) => setSetAsideInput(e.target.value)}
                    placeholder="Amount set aside so far (£)"
                  />
                  <button className="btn-add" onClick={handleSaveSetAside}>Save</button>
                </div>
              ) : (
                <div className={`tax-summary-banner ${setAsideDifference >= 0 ? 'tax-banner-good' : 'tax-banner-warning'}`}>
                  {setAsideDifference >= 0
                    ? `✅ You're covered, with ${formatMoney(setAsideDifference)} to spare`
                    : `⚠️ You're ${formatMoney(Math.abs(setAsideDifference))} short of the estimated bill`}
                </div>
              )}
            </div>
          )}

          <div className="tax-summary-table">
            <div className="tax-summary-row">
              <span className="label">Turnover</span>
              <span>{formatMoney(summary.turnover)}</span>
            </div>
            <div className="tax-summary-row">
              <span className="label">Stock purchase cost</span>
              <span>{formatMoney(summary.stockCost)}</span>
            </div>
            <div className="tax-summary-row">
              <span className="label">Mileage deductions</span>
              <span>{formatMoney(summary.mileageCost)}</span>
            </div>
            <div className="tax-summary-row">
              <span className="label">Marketplace fees</span>
              <span>{formatMoney(summary.marketplaceFees)}</span>
            </div>
            <div className="tax-summary-row">
              <span className="label">Other expenses</span>
              <span>{formatMoney(summary.otherExpenses)}</span>
            </div>
            <div className="tax-summary-row tax-summary-total">
              <span className="label">Business profit</span>
              <span className={summary.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                {formatMoney(summary.profit)}
              </span>
            </div>

            <div className="tax-summary-divider"></div>

            <div className="tax-summary-row">
              <span className="label">Employment income</span>
              <span>{formatMoney(summary.employmentIncome)}</span>
            </div>

            {summary.coveredByTradingAllowance ? (
              <div className="tax-summary-banner tax-banner-good">
                🟢 Turnover is under the £{summary.tradingAllowance} trading allowance — no tax owed and you likely don't need to register for Self Assessment for this income alone.
              </div>
            ) : summary.tax ? (
              <>
                <div className="tax-summary-row">
                  <span className="label">Estimated combined income</span>
                  <span>{formatMoney(summary.tax.combinedIncome)}</span>
                </div>
                <div className={`tax-summary-banner ${summary.tax.headroomToHigherRate >= 0 ? 'tax-banner-good' : 'tax-banner-warning'}`}>
                  {summary.tax.headroomToHigherRate >= 0
                    ? `🟢 Below higher-rate threshold by ${formatMoney(summary.tax.headroomToHigherRate)}`
                    : `🟠 Over the higher-rate threshold by ${formatMoney(Math.abs(summary.tax.headroomToHigherRate))} — some profit is taxed at 40%`}
                </div>
                <div className="tax-summary-row">
                  <span className="label">Estimated Income Tax from business</span>
                  <span>~{formatMoney(summary.tax.incomeTax)}</span>
                </div>
                <div className="tax-summary-row">
                  <span className="label">Estimated Class 4 National Insurance</span>
                  <span>~{formatMoney(summary.tax.classFourNI)}</span>
                </div>
                <div className="tax-summary-row tax-summary-total">
                  <span className="label">Total estimated tax owed</span>
                  <span>~{formatMoney(summary.tax.totalEstimatedTax)}</span>
                </div>
              </>
            ) : (
              <div className="tax-summary-banner tax-banner-good">
                🟢 No profit this tax year — no tax owed.
              </div>
            )}

            <div className="tax-summary-row">
              <span className="label">Receipts recorded</span>
              <span>{summary.receiptsRecorded}</span>
            </div>

            <p className="tax-disclaimer">
              This is a rough planning estimate only, not a substitute for Self Assessment or professional advice. Figures use 2026/27 rates — please verify anything important with HMRC or an accountant.
            </p>

            <div className="bookkeeping-action-row">
              <button className="btn-cancel" onClick={openYearSettingsForm}>
                ⚙️ Update Employment Income
              </button>
              <button className="btn-cancel" onClick={handleExport}>
                ⬇️ Export This Tax Year (CSV)
              </button>
            </div>
          </div>
        </>
      )}

      {showYearSettingsForm && (
        <div className="review-panel">
          <h3>Employment Income for {summary.taxYear.label}</h3>
          <div className="review-grid">
            <div className="form-group">
              <label>Annual Employment Income (£)</label>
              <input
                type="number"
                value={yearSettingsForm.employment_income}
                onChange={(e) => setYearSettingsForm({ ...yearSettingsForm, employment_income: e.target.value })}
              />
            </div>
          </div>
          <div className="review-buttons">
            <button className="btn-add" onClick={handleSaveYearSettings}>Save</button>
            <button className="btn-cancel" onClick={() => setShowYearSettingsForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Mileage section */}
      <div className="bookkeeping-subsection">
        <div className="bookkeeping-subsection-header">
          <h3>🚗 Mileage</h3>
          <button className="btn-add" onClick={() => setShowMileageForm(!showMileageForm)}>
            {showMileageForm ? 'Close' : '+ Log a Trip'}
          </button>
        </div>

        <p className="review-hint">
          Uses the HMRC mileage rate, which already covers fuel, insurance, and wear — don't also log separate fuel receipts for the same vehicle below.
        </p>

        {showMileageForm && (
          <div className="review-panel">
            <div className="review-grid">
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={mileageForm.trip_date} onChange={(e) => setMileageForm({ ...mileageForm, trip_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <input type="text" placeholder="e.g. Collecting stock from car boot sale" value={mileageForm.purpose} onChange={(e) => setMileageForm({ ...mileageForm, purpose: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Miles</label>
                <input type="number" step="0.1" value={mileageForm.miles} onChange={(e) => setMileageForm({ ...mileageForm, miles: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Notes (evidence)</label>
                <input type="text" value={mileageForm.notes} onChange={(e) => setMileageForm({ ...mileageForm, notes: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Receipt Photo (optional)</label>
                <input type="file" accept="image/*" onChange={(e) => setMileageReceipt(e.target.files[0])} />
              </div>
            </div>
            <div className="review-buttons">
              <button className="btn-add" onClick={handleAddMileage}>Save Trip</button>
              <button className="btn-cancel" onClick={() => setShowMileageForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {mileageEntries.length === 0 ? (
          <p className="no-items">No mileage logged for this tax year yet.</p>
        ) : (
          <div className="bookkeeping-cards">
            {mileageEntries.map(entry => (
              <div key={entry.id} className="bookkeeping-card">
                <div className="bookkeeping-card-main">
                  <strong>{new Date(entry.trip_date).toLocaleDateString('en-GB')}</strong> — {entry.purpose || 'No purpose noted'}
                  <div className="bookkeeping-card-meta">
                    {entry.miles} miles @ {entry.rate_pence}p = {formatMoney(entry.calculated_cost)}
                  </div>
                  {entry.notes && <div className="bookkeeping-card-notes">📝 {entry.notes}</div>}
                  {entry.receipt_key && (
                    <a href={`${SERVER_URL}/${entry.receipt_key}`} target="_blank" rel="noopener noreferrer" className="listing-link">
                      View receipt ↗
                    </a>
                  )}
                </div>
                <button className="btn-delete bookkeeping-delete-btn" onClick={() => handleDeleteMileage(entry.id)}>🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expenses section */}
      <div className="bookkeeping-subsection">
        <div className="bookkeeping-subsection-header">
          <h3>🧾 General Expenses</h3>
          <button className="btn-add" onClick={() => setShowExpenseForm(!showExpenseForm)}>
            {showExpenseForm ? 'Close' : '+ Add Expense'}
          </button>
        </div>

        {showExpenseForm && (
          <div className="review-panel">
            <div className="review-grid">
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" placeholder="e.g. Label maker for parcels" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Amount (£)</label>
                <input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Notes (evidence)</label>
                <input type="text" placeholder="e.g. Bought for parcel labelling, used solely for business" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Receipt Photo (optional)</label>
                <input type="file" accept="image/*" onChange={(e) => setExpenseReceipt(e.target.files[0])} />
              </div>
            </div>
            <div className="review-buttons">
              <button className="btn-add" onClick={handleAddExpense}>Save Expense</button>
              <button className="btn-cancel" onClick={() => setShowExpenseForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {expenseEntries.length === 0 ? (
          <p className="no-items">No expenses logged for this tax year yet.</p>
        ) : (
          <div className="bookkeeping-cards">
            {expenseEntries.map(entry => (
              <div key={entry.id} className="bookkeeping-card">
                <div className="bookkeeping-card-main">
                  <strong>{new Date(entry.expense_date).toLocaleDateString('en-GB')}</strong> — {entry.description || entry.category || 'Expense'}
                  <div className="bookkeeping-card-meta">
                    {entry.category && <span>{entry.category} • </span>}{formatMoney(entry.amount)}
                  </div>
                  {entry.notes && <div className="bookkeeping-card-notes">📝 {entry.notes}</div>}
                  {entry.receipt_key && (
                    <a href={`${SERVER_URL}/${entry.receipt_key}`} target="_blank" rel="noopener noreferrer" className="listing-link">
                      View receipt ↗
                    </a>
                  )}
                </div>
                <button className="btn-delete bookkeeping-delete-btn" onClick={() => handleDeleteExpense(entry.id)}>🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default BookkeepingPage;
