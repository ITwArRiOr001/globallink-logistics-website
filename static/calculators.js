/* = GLOBAL UTILITIES ===*/

const formatUSD = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const debounce = (fn, delay = 500) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/* ==========================
   SHIPPING COST ESTIMATOR
========================== */

function calculateShipping() {
  const weight = parseFloat(document.getElementById('weight').value);
  const type = document.getElementById('product-type').value;
  const origin = document.getElementById('origin').value.trim().toLowerCase();
  const dest = document.getElementById('dest').value.trim().toLowerCase();
  const resultBox = document.getElementById('shipping-result');
  const chartCanvas = document.getElementById('cost-chart');

  if (isNaN(weight) || weight <= 0 || !origin || !dest) {
    resultBox.innerHTML = `<div class="error">Please select all fields.</div>`;
    chartCanvas.style.display = 'none';
    return;
  }

  const distances = {
    'mumbai-dubai': 2000, 'dubai-mumbai': 2000,
    'mumbai-jeddah': 3500, 'jeddah-mumbai': 3500,
    'delhi-shanghai': 4500, 'shanghai-delhi': 4500,
    'mumbai-shanghai': 5000, 'shanghai-mumbai': 5000,
    'delhi-dubai': 2500, 'dubai-delhi': 2500,
  };

  const routeKey = `${origin}-${dest}`;
  const distance = distances[routeKey] ?? 3000;

  const baseRate = type === 'cold' ? 2.5 : 1.5;
  const freight = weight * baseRate * (distance / 1000);
  const insurance = freight * 0.05;
  const customs = freight * 0.10;
  const total = freight + insurance + customs;
  const transitTime = `${Math.round(distance / 500)} days`;

  resultBox.innerHTML = `
    <div class="result-card">
      <h3>🚢 Shipping Summary</h3>
      <div class="metric highlight">
        <span>Total Cost</span>
        <strong>${formatUSD(total)}</strong>
      </div>
      <div class="metric">
        <span>Transit Time</span>
        <strong>${transitTime}</strong>
      </div>
      <div class="metric">
        <span>Route</span>
        <strong>${origin.toUpperCase()} → ${dest.toUpperCase()}</strong>
      </div>
      <hr/>
      <div class="breakdown">
        <div>Freight <span>${formatUSD(freight)}</span></div>
        <div>Insurance (5%) <span>${formatUSD(insurance)}</span></div>
        <div>Customs (10%) <span>${formatUSD(customs)}</span></div>
      </div>
      <p class="note">*Estimates only. Actual costs vary by carrier and season.</p>
    </div>
  `;

  chartCanvas.style.display = 'block';
  const ctx = chartCanvas.getContext('2d');
  if (window.shippingChart) window.shippingChart.destroy();

  window.shippingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Freight', 'Insurance', 'Customs'],
      datasets: [{ data: [freight, insurance, customs], backgroundColor: ['#007BFF', '#28A745', '#17A2B8'] }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

/* ==========================
   DUTY & TAX CALCULATOR
========================== */

function estimateDuty() {
  const value = parseFloat(document.getElementById('value').value);
  const hsCode = document.getElementById('hs-code').value.trim();
  const dutyResult = document.getElementById('duty-result');
  const dutyBreakdown = document.getElementById('duty-breakdown');

  if (isNaN(value) || value <= 0 || !hsCode) {
    dutyResult.innerHTML = `<div class="error">Please enter a valid HS code and shipment value.</div>`;
    dutyBreakdown.style.display = 'none';
    return;
  }

  const dutyRates = { '0803': 0.05, '0805': 0.08, '0902': 0.10 };
  const dutyRate = dutyRates[hsCode] ?? 0.15;
  const gstRate = 0.18;

  const freight = value * 0.10;
  const insurance = value * 0.01;
  const cif = value + freight + insurance;

  const customsDuty = cif * dutyRate;
  const gst = (cif + customsDuty) * gstRate;
  const totalTax = customsDuty + gst;
  const landedCost = cif + totalTax;

  dutyResult.innerHTML = `
    <div class="result-card">
      <h3>📦 Import Duty & Tax Summary</h3>
      <div class="metric highlight">
        <span>Total Landed Cost</span>
        <strong>${formatUSD(landedCost)}</strong>
      </div>
      <div class="metric">
        <span>Total Tax Payable</span>
        <strong>${formatUSD(totalTax)}</strong>
      </div>
      <hr/>
      <div class="metric">
        <span>Shipment Value</span>
        <strong>${formatUSD(value)}</strong>
      </div>
      <div class="metric">
        <span>Estimated CIF Value</span>
        <strong>${formatUSD(cif)}</strong>
      </div>
      <hr/>
      <div class="breakdown">
        <div>Customs Duty (${(dutyRate * 100).toFixed(0)}%) <span>${formatUSD(customsDuty)}</span></div>
        <div>GST (18%) <span>${formatUSD(gst)}</span></div>
      </div>
      <p class="note">*Actual duty may vary based on customs assessment and HS classification.</p>
    </div>
  `;

  dutyBreakdown.style.display = 'table';
  dutyBreakdown.innerHTML = `
    <tr><th>Component</th><th>Amount</th></tr>
    <tr><td>Customs Duty</td><td>${formatUSD(customsDuty)}</td></tr>
    <tr><td>GST</td><td>${formatUSD(gst)}</td></tr>
    <tr><td><strong>Total Tax</strong></td><td><strong>${formatUSD(totalTax)}</strong></td></tr>
    <tr><td><strong>Landed Cost</strong></td><td><strong>${formatUSD(landedCost)}</strong></td></tr>
  `;
}

/* ==========================
   CURRENCY CONVERTER
========================== */

async function convertCurrency() {
  const amountInput = document.getElementById('amount');
  const toCurrency = document.getElementById('to-currency').value;
  const resultBox = document.getElementById('conv-result');
  const loader = document.getElementById('currency-loader');
  const chartCanvas = document.getElementById('rate-chart');
  const amount = parseFloat(amountInput.value);

  if (isNaN(amount) || amount <= 0) {
    resultBox.innerHTML = `<div class="error">Please enter a valid INR amount.</div>`;
    return;
  }

  loader.style.display = 'block';
  resultBox.innerHTML = '';
  chartCanvas.style.display = 'none';

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
    const data = await res.json();
    const rate = data.rates[toCurrency];
    if (!rate) throw new Error('Rate unavailable');

    const converted = amount * rate;
    const hedgeLow = converted * 0.97;
    const hedgeHigh = converted * 1.03;

    loader.style.display = 'none';
    resultBox.innerHTML = `
      <div class="result-card">
        <h3>💱 Conversion Summary</h3>
        <div class="metric highlight">
          <span>Converted Amount</span>
          <strong>${converted.toFixed(2)} ${toCurrency}</strong>
        </div>
        <div class="metric">
          <span>Exchange Rate</span>
          <strong>1 INR = ${rate.toFixed(4)} ${toCurrency}</strong>
        </div>
        <hr/>
        <div class="breakdown">
          <div>Possible Low (-3%) <span>${hedgeLow.toFixed(2)} ${toCurrency}</span></div>
          <div>Possible High (+3%) <span>${hedgeHigh.toFixed(2)} ${toCurrency}</span></div>
        </div>
        <p class="note">*Hedging values are illustrative only. Use forward contracts for real risk management.</p>
      </div>
    `;

    chartCanvas.style.display = 'block';
    const ctx = chartCanvas.getContext('2d');
    if (window.fxChart) window.fxChart.destroy();

    window.fxChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Low', 'Current', 'High'],
        datasets: [{ label: `FX Exposure (${toCurrency})`, data: [hedgeLow, converted, hedgeHigh], borderWidth: 2, tension: 0.3 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });

  } catch (err) {
    loader.style.display = 'none';
    resultBox.innerHTML = `<div class="error">Unable to fetch live rates. Please try again later.</div>`;
  }
}

/* ==========================
   CONTAINER LOAD OPTIMIZER
========================== */

function optimizeLoad() {
  const dimsInputRaw = document.getElementById('dimensions').value.trim();
  const qty = parseInt(document.getElementById('quantity').value, 10);
  const containerType = document.getElementById('container-type').value;
  const resultBox = document.getElementById('load-result');
  const loader = document.getElementById('load-loader');
  const canvas = document.getElementById('load-visual');

  const dimsInput = dimsInputRaw.replace(/×/g, 'x');
  if (!dimsInput || isNaN(qty) || qty <= 0) {
    resultBox.innerHTML = `<div class="error">Please enter valid dimensions and quantity.</div>`;
    return;
  }

  const dims = dimsInput.split('x').map(Number);
  if (dims.length !== 3 || dims.some(d => isNaN(d) || d <= 0)) {
    resultBox.innerHTML = `<div class="error">Use format LxWxH (example: 40x30x25).</div>`;
    return;
  }

  const containerDims = containerType === '20ft' ? [589, 235, 239] : [1203, 235, 239];

  loader.style.display = 'block';
  resultBox.innerHTML = '';
  canvas.style.display = 'none';

  setTimeout(() => {
    const [boxL, boxW, boxH] = dims;
    const [contL, contW, contH] = containerDims;

    if (boxL > contL || boxW > contW || boxH > contH) {
      loader.style.display = 'none';
      resultBox.innerHTML = `<div class="error">Carton dimensions exceed container internal size. Please re-check packaging or container type.</div>`;
      return;
    }

    const fitL = Math.floor(contL / boxL);
    const fitW = Math.floor(contW / boxW);
    const fitH = Math.floor(contH / boxH);
    const maxFit = fitL * fitW * fitH;
    const loadedQty = Math.min(qty, maxFit);
    const utilization = ((loadedQty / maxFit) * 100).toFixed(1);
    const unused = (100 - utilization).toFixed(1);

    loader.style.display = 'none';
    resultBox.innerHTML = `
      <div class="result-card">
        <h3>📦 Load Optimization Summary</h3>
        <div class="metric highlight">
          <span>Items Loaded</span>
          <strong>${loadedQty} / ${maxFit}</strong>
        </div>
        <div class="metric">
          <span>Container Utilization</span>
          <strong>${utilization}%</strong>
        </div>
        <div class="metric">
          <span>Unused Capacity</span>
          <strong>${unused}%</strong>
        </div>
        <hr/>
        <div class="breakdown">
          <div>Fit Along Length <span>${fitL}</span></div>
          <div>Fit Along Width <span>${fitW}</span></div>
          <div>Fit Along Height <span>${fitH}</span></div>
        </div>
        <p class="note">*Floor stacking assumed. Rotation and pallet constraints not applied.</p>
      </div>
    `;

    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 150;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#17A2B8';

    const drawCount = Math.min(loadedQty, 20);
    for (let i = 0; i < drawCount; i++) {
      ctx.fillRect((i % 5) * 58, Math.floor(i / 5) * 28, 50, 20);
    }
  }, 400);
}

/* ==========================
   TRANSIT TIME & RISK ANALYSIS
========================== */

function estimateTransit() {
  const origin = document.getElementById('transit-origin').value;
  const dest = document.getElementById('transit-dest').value;
  const mode = document.getElementById('transit-mode').value;
  const weatherFactor = parseInt(document.getElementById('weather-factor').value, 10);
  const resultBox = document.getElementById('transit-result');
  const loader = document.getElementById('transit-loader');
  const chartCanvas = document.getElementById('risk-chart');

  if (!origin || !dest || origin === dest || isNaN(weatherFactor) || weatherFactor < 1 || weatherFactor > 10) {
    resultBox.innerHTML = `<div class="error">Please select valid origin, destination, and weather factor.</div>`;
    return;
  }

  const distances = {
    'mumbai-dubai': 2000, 'dubai-mumbai': 2000,
    'mumbai-jeddah': 3500, 'jeddah-mumbai': 3500,
    'delhi-shanghai': 4500, 'shanghai-delhi': 4500,
    'mumbai-shanghai': 5000, 'shanghai-mumbai': 5000,
    'delhi-dubai': 2500, 'dubai-delhi': 2500
  };

  const routeKey = `${origin}-${dest}`;
  const distance = distances[routeKey] || 3000;

  loader.style.display = 'block';
  resultBox.innerHTML = '';
  chartCanvas.style.display = 'none';

  setTimeout(() => {
    const speed = mode === 'sea' ? 500 : 800;
    const unit = mode === 'sea' ? 'days' : 'hours';
    const baseTime = distance / speed;

    const riskPercent = weatherFactor * 7;
    const bufferFactor = riskPercent / 100;
    const adjustedTime = baseTime * (1 + bufferFactor);

    let riskLevel = 'Low', confidence = 'High';
    if (riskPercent > 60) { riskLevel = 'High'; confidence = 'Low'; }
    else if (riskPercent > 35) { riskLevel = 'Moderate'; confidence = 'Medium'; }

    loader.style.display = 'none';
    resultBox.innerHTML = `
      <div class="result-card">
        <h3>⏱ Transit Time & Risk Analysis</h3>
        <div class="metric"><span>Route</span><strong>${origin.toUpperCase()} → ${dest.toUpperCase()}</strong></div>
        <div class="metric"><span>Base Transit Time</span><strong>${baseTime.toFixed(1)} ${unit}</strong></div>
        <div class="metric highlight"><span>Estimated Transit Time</span><strong>${adjustedTime.toFixed(1)} ${unit}</strong></div>
        <hr/>
        <div class="breakdown">
          <div>Delay Risk <span>${riskPercent}% (${riskLevel})</span></div>
          <div>Schedule Confidence <span>${confidence}</span></div>
          <div>Applied Buffer <span>${(bufferFactor * 100).toFixed(0)}%</span></div>
        </div>
        <p class="note">*Includes operational buffer for weather & route uncertainty.</p>
      </div>
    `;

    chartCanvas.style.display = 'block';
    const ctx = chartCanvas.getContext('2d');
    if (window.riskChart) window.riskChart.destroy();

    window.riskChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Base Transit', 'Risk Buffer'],
        datasets: [{ data: [baseTime, adjustedTime - baseTime], backgroundColor: ['#28A745', '#DC3545'] }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }, 500);
}
function calculateCarbon() {
  const distanceKm = parseFloat(document.getElementById('carbon-distance').value);
  const weightKg = parseFloat(document.getElementById('carbon-weight').value);
  const mode = document.getElementById('carbon-mode').value;
  const packaging = document.getElementById('packaging-type').value;
  const offsetPrice = parseFloat(document.getElementById('offset-price').value);
  
  const resultBox = document.getElementById('carbon-result');
  const loader = document.getElementById('carbon-loader');
  const chartCanvas = document.getElementById('carbon-chart');
  
  if (isNaN(distanceKm) || distanceKm <= 0 || isNaN(weightKg) || weightKg <= 0 || !mode || !packaging) {
    resultBox.innerHTML = `<div class="error">Please enter distance, weight, mode, and packaging.</div>`;
    chartCanvas.style.display = 'none';
    return;
  }
  
  const tonnes = weightKg / 1000;
  
  const modeFactors = { sea: 0.019, air: 1.054, road: 0.062 };
  const transportFactor = modeFactors[mode] ?? 0.062;
  
  const transportKg = tonnes * distanceKm * transportFactor;
  
  const packagingFactorMap = {
  none: 0,
  carton: 0.03, // 5% of weight in kg CO₂
  plastic: 0.05,
  wood: 0.1// 20%
};

const packagingKg = (packagingFactorMap[packaging] ?? 0) * weightKg;
  
  const totalKg = transportKg + packagingKg;
  
  let offsetCostText = '';
  if (!isNaN(offsetPrice) && offsetPrice > 0) {
    const totalTons = totalKg / 1000;
    const cost = totalTons * offsetPrice;
    offsetCostText = `<div class="metric"><span>Estimated Offset Cost</span><strong>${formatUSD(cost)}</strong></div>`;
  }
  
  loader.style.display = 'none';
  resultBox.innerHTML = `
    <div class="result-card">
      <h3>🌿 Environmental Impact Summary</h3>
      <div class="metric highlight">
        <span>Total Estimated CO₂</span>
        <strong>${totalKg.toFixed(2)} kg CO₂e</strong>
      </div>
      <div class="metric">
        <span>Transport CO₂</span>
        <strong>${transportKg.toFixed(2)} kg CO₂e</strong>
      </div>
      <div class="metric">
        <span>Packaging CO₂</span>
        <strong>${packagingKg.toFixed(2)} kg CO₂e</strong>
      </div>
      ${offsetCostText}
      <p class="note">*Indicative estimate using tonne-km method; use verified factors for compliance reporting.</p>
    </div>
  `;
  
  chartCanvas.style.display = 'block';
  const ctx = chartCanvas.getContext('2d');
  if (window.carbonChart) window.carbonChart.destroy();
  
  window.carbonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Transport', 'Packaging'],
      datasets: [{
        label: 'kg CO₂e',
        data: [transportKg, packagingKg],
        borderWidth: 1
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}
/* ==TAB FILTER (FIX)==*/

function setActiveTab(tabName) {
  document.querySelectorAll('.calc-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Show/hide cards
  const cards = document.querySelectorAll('.calc-grid .calc-card');
  cards.forEach(card => {
    const cat = (card.dataset.category || 'all').toLowerCase();
    const show =
      tabName === 'all' ||
      cat === 'all' ||
      cat === tabName;

    card.style.display = show ? '' : 'none';
  });
}

/* ==EVENT BINDINGS==*/

document.addEventListener('DOMContentLoaded', () => {
  // Debounced live updates
  const debouncedShipping = debounce(calculateShipping, 500);
  const debouncedDuty = debounce(estimateDuty, 500);
  const debouncedCurrency = debounce(convertCurrency, 500);
  const debouncedLoad = debounce(optimizeLoad, 500);
  const debouncedTransit = debounce(estimateTransit, 500);
  const debouncedCarbon = debounce(calculateCarbon, 500);

  document.getElementById('shipping-form')?.addEventListener('input', debouncedShipping);
  document.getElementById('duty-form')?.addEventListener('input', debouncedDuty);
  document.getElementById('currency-form')?.addEventListener('input', debouncedCurrency);
  document.getElementById('load-form')?.addEventListener('input', debouncedLoad);
  document.getElementById('transit-form')?.addEventListener('input', debouncedTransit);
  document.getElementById('carbon-form')?.addEventListener('input', debouncedCarbon);

  // Enable/disable buttons based on HTML validity
  const validateForm = (formId, btnId) => {
    const form = document.getElementById(formId);
    const btn = document.getElementById(btnId);
    if (!form || !btn) return;

    const check = () => { btn.disabled = !form.checkValidity(); };
    form.addEventListener('input', check);
    form.addEventListener('change', check);
    check();
  };

  validateForm('shipping-form', 'ship-calc-btn');
  validateForm('duty-form', 'duty-calc-btn');
  validateForm('currency-form', 'currency-calc-btn');
  validateForm('load-form', 'load-calc-btn');
  validateForm('transit-form', 'transit-calc-btn');
  validateForm('carbon-form', 'carbon-calc-btn');
  // Make calculator buttons actually run on click
  document.getElementById('ship-calc-btn')?.addEventListener('click', calculateShipping);
  document.getElementById('duty-calc-btn')?.addEventListener('click', estimateDuty);
  document.getElementById('currency-calc-btn')?.addEventListener('click', convertCurrency);
  document.getElementById('load-calc-btn')?.addEventListener('click', optimizeLoad);
  document.getElementById('transit-calc-btn')?.addEventListener('click', estimateTransit);
  validateForm('carbon-form', 'carbon-calc-btn');
document.getElementById('carbon-calc-btn')?.addEventListener('click', calculateCarbon);

  // Assumptions bar toggle
  document.querySelectorAll('.assumptions-bar').forEach(bar => {
    bar.addEventListener('click', function (e) {
      e.stopPropagation();
      this.classList.toggle('active');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.assumptions-bar.active').forEach(bar => bar.classList.remove('active'));
  });

  // Tabs: filter calculators
  document.querySelectorAll('.calc-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  // Default view
  setActiveTab('all');

  // OPTIONAL: If you want clicking "All Calculators" tab to also run all calculations:
  // document.getElementById('all-calculators-btn')?.addEventListener('dblclick', async () => {
  //   calculateShipping();
  //   estimateDuty();
  //   await convertCurrency();
  //   optimizeLoad();
  //   estimateTransit();
  // });
});