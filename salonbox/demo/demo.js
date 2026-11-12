(() => {
  'use strict';

  const storeNames = ['青山店', '横浜店', '梅田店'];
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const storeSales = {
    '青山店': [305, 318, 320, 326, 334, 342, 350, 351, 365, 372, 380, 398, 342, 358, 371, 365, 389, 404, 417, 408, 432, 448, 461, 479],
    '横浜店': [251, 258, 261, 269, 273, 281, 284, 290, 294, 298, 302, 309, 286, 294, 305, 311, 308, 326, 338, 347, 352, 369, 377, 391],
    '梅田店': [229, 235, 241, 244, 250, 252, 257, 260, 266, 270, 276, 280, 258, 266, 271, 284, 293, 301, 298, 315, 322, 329, 341, 353]
  };
  const colors = { '青山店': '#23734d', '横浜店': '#2879a8', '梅田店': '#a9561b' };
  const menuNames = ['カット・カラー', 'トリートメント', 'ヘッドスパ', 'その他'];
  const menuColors = ['#267449', '#2b79a8', '#b96525', '#7760a8'];
  const requiredMappings = { date: '売上日', store: '店舗名', menu: 'メニュー名', sales: '売上金額' };
  const recommendedMappings = { ...requiredMappings, customer: '顧客ID' };
  const weekdayNames = ['月', '火', '水', '木', '金', '土', '日'];
  const weekdayProfiles = {
    all: [36, 34, 41, 51, 72, 100, 88],
    '青山店': [31, 35, 43, 56, 80, 100, 85],
    '横浜店': [39, 37, 42, 49, 67, 94, 100],
    '梅田店': [36, 33, 46, 58, 77, 100, 92]
  };
  const hourProfiles = {
    all: [0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 12, 28, 44, 57, 52, 61, 76, 100, 91, 70, 43, 19, 5, 0],
    '青山店': [0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 15, 31, 48, 62, 56, 67, 82, 100, 89, 66, 38, 16, 4, 0],
    '横浜店': [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 10, 24, 40, 54, 50, 59, 74, 94, 100, 78, 50, 22, 6, 0],
    '梅田店': [0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 13, 29, 46, 59, 53, 63, 79, 100, 93, 73, 45, 18, 5, 0]
  };
  const menuMixData = {
    all: { 3: [39, 31, 17, 13], 6: [41, 29, 18, 12], 12: [42, 28, 18, 12] },
    '青山店': { 3: [43, 27, 18, 12], 6: [45, 26, 18, 11], 12: [44, 27, 17, 12] },
    '横浜店': { 3: [35, 35, 20, 10], 6: [36, 34, 20, 10], 12: [38, 32, 19, 11] },
    '梅田店': { 3: [46, 26, 19, 9], 6: [47, 25, 19, 9], 12: [45, 27, 19, 9] }
  };
  const selectors = [...document.querySelectorAll('[data-map]')];
  const uploadPanel = document.getElementById('step-upload');
  const mappingPanel = document.getElementById('step-mapping');
  const dashboardPanel = document.getElementById('step-dashboard');
  const loading = document.getElementById('demo-loading');
  const uploadStatus = document.getElementById('upload-status');
  const dropzone = document.getElementById('dropzone');
  const autoMapButton = document.getElementById('auto-map');
  const mappingAssist = document.getElementById('mapping-assist');
  const assistAutoMapButton = document.getElementById('assist-auto-map');
  const dismissAssistButton = document.getElementById('dismiss-assist');
  const showDashboardButton = document.getElementById('show-dashboard');
  const numberFormat = new Intl.NumberFormat('ja-JP');
  let isTransitioning = false;
  let autoMapTimers = [];
  let isAutoMapping = false;
  let assistDismissed = false;
  const metricAnimations = new WeakMap();
  const metricCurrentValues = new WeakMap();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setStep(step) {
    uploadPanel.hidden = step !== 1;
    mappingPanel.hidden = step !== 2;
    dashboardPanel.hidden = step !== 3;
    document.querySelectorAll('[data-step-indicator]').forEach((item) => {
      const itemStep = Number(item.dataset.stepIndicator);
      item.classList.toggle('is-current', itemStep === step);
      item.classList.toggle('is-done', itemStep < step);
      item.querySelector('span').textContent = itemStep < step ? '✓' : itemStep;
    });
    if (step === 2) {
      mappingPanel.classList.remove('is-entering');
      void mappingPanel.offsetWidth;
      mappingPanel.classList.add('is-entering');
      window.setTimeout(() => mappingPanel.classList.remove('is-entering'), 1500);
    }
    if (step === 3) {
      dashboardPanel.classList.remove('is-entering');
      void dashboardPanel.offsetWidth;
      dashboardPanel.classList.add('is-entering');
      window.setTimeout(() => dashboardPanel.classList.remove('is-entering'), 1500);
      updateDashboard();
    }
    document.querySelector('.demo-app').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function playLoading(nextStep, message) {
    if (isTransitioning) return;
    isTransitioning = true;
    loading.querySelector('strong').textContent = message;
    loading.hidden = false;
    window.setTimeout(() => {
      loading.hidden = true;
      setStep(nextStep);
      isTransitioning = false;
    }, 720);
  }

  function startSampleLoad() {
    if (!uploadPanel.hidden) {
      uploadStatus.textContent = '架空のサンプルデータを準備しています…';
      playLoading(2, 'サンプルCSVを読み込んでいます');
    }
  }

  document.getElementById('sample-file').addEventListener('click', startSampleLoad);
  dropzone.addEventListener('click', startSampleLoad);
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startSampleLoad();
    }
  });
  document.getElementById('sample-file').addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('application/x-salonbox-demo', 'sample');
    event.dataTransfer.effectAllowed = 'copy';
  });
  ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-over');
  }));
  ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-over');
  }));
  dropzone.addEventListener('drop', (event) => {
    if (event.dataTransfer.getData('application/x-salonbox-demo') === 'sample') {
      startSampleLoad();
    } else {
      uploadStatus.textContent = 'このデモでは架空のサンプルデータだけを読み込めます。';
    }
  });

  function updateMapping() {
    const selectedValues = selectors.map((select) => select.value).filter(Boolean);
    const valueCounts = selectedValues.reduce((counts, value) => counts.set(value, (counts.get(value) || 0) + 1), new Map());
    let mappedCount = 0;
    let requiredValidCount = 0;
    let hasMismatch = false;
    let hasDuplicate = false;
    selectors.forEach((select) => {
      const mapped = Boolean(select.value);
      if (mapped) mappedCount += 1;
      const row = select.closest('.mapping-row');
      const state = row.querySelector('.map-state');
      const key = select.dataset.map;
      const expected = recommendedMappings[key];
      const duplicate = mapped && valueCounts.get(select.value) > 1;
      const mismatch = mapped && select.value !== expected;
      const invalid = duplicate || mismatch;
      if (duplicate) hasDuplicate = true;
      if (mismatch) hasMismatch = true;
      if (requiredMappings[key] && select.value === requiredMappings[key]) requiredValidCount += 1;
      if (mapped && select.dataset.wasMapped !== 'true') {
        row.classList.remove('just-mapped');
        void row.offsetWidth;
        row.classList.add('just-mapped');
        window.setTimeout(() => row.classList.remove('just-mapped'), 520);
      }
      select.dataset.wasMapped = String(mapped);
      select.setAttribute('aria-invalid', String(invalid));
      state.textContent = !mapped ? (key === 'customer' ? '任意' : '未設定') : duplicate ? '重複' : mismatch ? '項目を確認' : '✓ 設定済み';
      state.classList.toggle('is-mapped', mapped && !invalid);
      state.classList.toggle('is-invalid', invalid);
      row.classList.toggle('is-mapped', mapped && !invalid);
      row.classList.toggle('has-error', invalid);
    });
    const customerSelect = selectors.find((select) => select.dataset.map === 'customer');
    const customerValid = !customerSelect.value || customerSelect.value === recommendedMappings.customer;
    const canAnalyze = requiredValidCount === Object.keys(requiredMappings).length && !hasDuplicate && customerValid;
    document.getElementById('mapping-count').textContent = `${requiredValidCount}/4デモ必須項目を設定済み`;
    const validation = document.getElementById('mapping-validation');
    validation.classList.toggle('has-errors', hasDuplicate || hasMismatch);
    validation.textContent = hasDuplicate
      ? '同じCSV項目を複数の設定先に使っています。別々の項目を選んでください。'
      : hasMismatch
        ? 'このサンプルCSVでは、設定先と同じ項目名を選んでください。自動マッピングでも修正できます。'
        : canAnalyze
          ? `デモ用の設定を確認しました。${customerSelect.value ? '顧客IDも含めて' : '顧客IDを使わずに'}分析できます。`
          : 'このデモでは日付・店舗・メニュー・売上金額が必要です。顧客IDは任意です。';
    showDashboardButton.disabled = !canAnalyze;
    autoMapButton.classList.toggle('is-complete', canAnalyze);
    if (canAnalyze) {
      mappingAssist.hidden = true;
    } else if (mappedCount === 1 && !isAutoMapping && !assistDismissed && mappingAssist.hidden) {
      mappingAssist.hidden = false;
      mappingAssist.classList.remove('is-visible');
      void mappingAssist.offsetWidth;
      mappingAssist.classList.add('is-visible');
    }
  }

  selectors.forEach((select) => select.addEventListener('change', updateMapping));
  document.querySelectorAll('.source-chip').forEach((chip) => {
    chip.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('application/x-salonbox-column', chip.dataset.source);
      event.dataTransfer.effectAllowed = 'move';
    });
  });
  document.querySelectorAll('.mapping-row').forEach((row) => {
    row.addEventListener('dragover', (event) => {
      if (event.dataTransfer.types.includes('application/x-salonbox-column')) {
        event.preventDefault();
        row.classList.add('is-drop-target');
      }
    });
    row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'));
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      row.classList.remove('is-drop-target');
      const source = event.dataTransfer.getData('application/x-salonbox-column');
      const select = row.querySelector('[data-map]');
      if (source && [...select.options].some((option) => option.value === source)) {
        select.value = source;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  autoMapButton.addEventListener('click', () => {
    const mappings = { date: '売上日', store: '店舗名', menu: 'メニュー名', sales: '売上金額', customer: '顧客ID' };
    autoMapTimers.forEach((timer) => window.clearTimeout(timer));
    autoMapTimers = [];
    autoMapButton.disabled = true;
    isAutoMapping = true;
    mappingAssist.hidden = true;
    autoMapButton.classList.add('is-running');
    autoMapButton.classList.remove('is-celebrating');
    autoMapButton.textContent = '自動で項目を割り当て中…';
    selectors.forEach((select, index) => {
      const timer = window.setTimeout(() => {
        select.value = mappings[select.dataset.map];
        select.dispatchEvent(new Event('change', { bubbles: true }));
        if (index === selectors.length - 1) {
          isAutoMapping = false;
          autoMapButton.disabled = false;
          autoMapButton.classList.remove('is-running');
          autoMapButton.textContent = '✓ 5項目が揃いました';
          autoMapButton.classList.add('is-celebrating');
          window.setTimeout(() => autoMapButton.classList.remove('is-celebrating'), 850);
        }
      }, reduceMotion ? 0 : index * 145);
      autoMapTimers.push(timer);
    });
  });
  assistAutoMapButton.addEventListener('click', () => autoMapButton.click());
  dismissAssistButton.addEventListener('click', () => {
    assistDismissed = true;
    mappingAssist.hidden = true;
  });
  showDashboardButton.addEventListener('click', () => {
    playLoading(3, 'サンプルデータを分析しています');
  });
  document.getElementById('back-to-upload').addEventListener('click', () => setStep(1));
  document.getElementById('restart-demo').addEventListener('click', () => {
    autoMapTimers.forEach((timer) => window.clearTimeout(timer));
    autoMapTimers = [];
    isAutoMapping = false;
    assistDismissed = false;
    mappingAssist.hidden = true;
    autoMapButton.disabled = false;
    autoMapButton.classList.remove('is-running');
    autoMapButton.classList.remove('is-celebrating');
    selectors.forEach((select) => { select.value = ''; });
    autoMapButton.textContent = '✦ 自動でマッピング';
    uploadStatus.textContent = '';
    updateMapping();
    setStep(1);
  });

  function formatSales(value) {
    return `¥${numberFormat.format(Math.round(value))}万`;
  }

  function visibleStores(selected) {
    return selected === 'all' ? storeNames : [selected];
  }

  function renderLineChart(period, selected) {
    const svg = document.getElementById('sales-chart');
    const compactChart = window.innerWidth <= 650;
    svg.setAttribute('viewBox', compactChart ? '0 0 380 260' : '0 0 720 260');
    const stores = visibleStores(selected);
    const series = stores.map((store) => ({ store, values: storeSales[store].slice(-period) }));
    const maxValue = Math.ceil(Math.max(...series.flatMap((item) => item.values)) / 100) * 100;
    const chart = compactChart ? { left: 42, top: 14, width: 315, height: 185 } : { left: 43, top: 9, width: 650, height: 198 };
    const grid = [0, .25, .5, .75, 1].map((ratio) => {
      const y = chart.top + chart.height * ratio;
      const label = Math.round(maxValue * (1 - ratio));
      return `<line class="chart-gridline" x1="${chart.left}" y1="${y}" x2="${chart.left + chart.width}" y2="${y}"/><text class="chart-axis-text" x="34" y="${y + 3}" text-anchor="end">${label}</text>`;
    }).join('');
    const xLabels = monthNames.slice(-period).map((month, index) => {
      if (compactChart && period === 12 && index % 2 !== 0 && index !== period - 1) return '';
      const x = chart.left + chart.width * (index / Math.max(period - 1, 1));
      return `<text class="chart-axis-text" x="${x}" y="${chart.top + chart.height + 20}" text-anchor="middle">${month}</text>`;
    }).join('');
    const lines = series.map(({ store, values }) => {
      const points = values.map((value, index) => {
        const x = chart.left + chart.width * (index / Math.max(period - 1, 1));
        const y = chart.top + chart.height * (1 - value / maxValue);
        return `${x},${y}`;
      });
      const dots = values.map((value, index) => {
        const x = chart.left + chart.width * (index / Math.max(period - 1, 1));
        const y = chart.top + chart.height * (1 - value / maxValue);
        return `<circle class="chart-point" cx="${x}" cy="${y}" r="3.5" fill="${colors[store]}"/>`;
      }).join('');
      return `<polyline class="chart-line is-drawing" pathLength="100" points="${points.join(' ')}" stroke="${colors[store]}"/>${dots}`;
    }).join('');
    svg.innerHTML = `${grid}${xLabels}${lines}`;
    svg.setAttribute('aria-label', `${selected === 'all' ? '全店舗' : selected}の直近${period}ヶ月の売上推移グラフ`);
    document.getElementById('chart-legend').innerHTML = stores.map((store) => `<span class="legend-item"><i class="legend-dot" style="background:${colors[store]}"></i>${store}</span>`).join('');
    document.getElementById('chart-period-caption').textContent = `直近${period}ヶ月・単位：万円`;
  }

  function renderStoreBars(period, selected) {
    const totals = storeNames.map((store) => ({ store, total: storeSales[store].slice(-period).reduce((sum, value) => sum + value, 0) }));
    const max = Math.max(...totals.map((item) => item.total));
    document.getElementById('store-bars').innerHTML = totals.map(({ store, total }) => `
      <div class="store-bar${selected === 'all' ? '' : selected === store ? ' is-selected' : ' is-dimmed'}">
        <div class="store-bar-head"><span>${store}</span><strong>${formatSales(total)}</strong></div>
        <div class="store-bar-track"><div class="store-bar-fill" style="--bar-color:${colors[store]}" data-target-width="${Math.round(total / max * 100)}%"></div></div>
      </div>`).join('');
    document.getElementById('store-chart-caption').textContent = selected === 'all'
      ? '選択期間の合計・全店比較'
      : `選択期間の全店比較・${selected}を強調`;
    const fills = [...document.querySelectorAll('.store-bar-fill')];
    fills.forEach((fill, index) => {
      fill.style.width = '0%';
      fill.style.transitionDelay = `${index * 100}ms`;
    });
    requestAnimationFrame(() => fills.forEach((fill) => {
      fill.style.width = fill.dataset.targetWidth;
    }));
  }

  function renderMenuMix(selected, period) {
    const mixes = menuMixData[selected][period];
    document.getElementById('menu-chart-caption').textContent = `直近${period}ヶ月の売上構成・${selected === 'all' ? '全店舗' : selected}`;
    const circumference = 2 * Math.PI * 42;
    let offset = 0;
    const segments = mixes.map((value, index) => {
      const length = circumference * value / 100;
      const segment = `<circle class="donut-segment" cx="60" cy="60" r="42" stroke="${menuColors[index]}" stroke-dasharray="0 ${circumference}" stroke-dashoffset="-${offset}" style="transition-delay:${index * 110}ms"/>`;
      offset += length;
      return segment;
    }).join('');
    const segmentGroup = document.getElementById('menu-donut-segments');
    segmentGroup.innerHTML = segments;
    const circles = [...segmentGroup.querySelectorAll('.donut-segment')];
    requestAnimationFrame(() => circles.forEach((circle, index) => {
      circle.style.strokeDasharray = `${circumference * mixes[index] / 100} ${circumference}`;
    }));
    document.getElementById('menu-legend').innerHTML = menuNames.map((name, index) => `<li><i style="background:${menuColors[index]}"></i>${name}<b>${mixes[index]}%</b></li>`).join('');
  }

  function renderVisitHeatmap(period, selected) {
    const dayProfile = weekdayProfiles[selected];
    const hourProfile = hourProfiles[selected];
    const tbody = document.getElementById('visit-heatmap');
    tbody.innerHTML = weekdayNames.map((day, dayIndex) => {
      const cells = hourProfile.slice(9, 21).map((hourValue, index) => {
        const hour = index + 9;
        const value = Math.round(dayProfile[dayIndex] * hourValue / 100 * period / 3);
        const level = value < 5 ? 0 : value < 18 ? 1 : value < 35 ? 2 : value < 55 ? 3 : value < 75 ? 4 : 5;
        return `<td class="heat-level-${level}" title="${day}曜日 ${hour}時・サンプル来店数 ${value}人" aria-label="${day}曜日 ${hour}時、サンプル来店数 ${value}人"></td>`;
      }).join('');
      return `<tr><th scope="row">${day}</th>${cells}</tr>`;
    }).join('');
    document.getElementById('heatmap-caption').textContent = `直近${period}ヶ月・${selected === 'all' ? '全店舗' : selected}のサンプル来店数です。営業時間を想定した9〜20時を表示しています。`;
  }

  function animateMetric(element, target, format) {
    const previousFrame = metricAnimations.get(element);
    if (previousFrame) cancelAnimationFrame(previousFrame);
    if (reduceMotion) {
      element.textContent = format(target);
      metricCurrentValues.set(element, target);
      return;
    }
    const startValue = metricCurrentValues.get(element) || 0;
    const started = performance.now();
    const duration = 650;
    const frame = (now) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = startValue + (target - startValue) * eased;
      metricCurrentValues.set(element, value);
      element.textContent = format(Math.round(value));
      if (progress < 1) metricAnimations.set(element, requestAnimationFrame(frame));
      else {
        metricCurrentValues.set(element, target);
        metricAnimations.delete(element);
      }
    };
    metricAnimations.set(element, requestAnimationFrame(frame));
  }

  function updateDashboard() {
    const period = Number(document.getElementById('period-filter').value);
    const selected = document.getElementById('store-filter').value;
    const stores = visibleStores(selected);
    const totals = stores.map((store) => ({ store, total: storeSales[store].slice(-period).reduce((sum, value) => sum + value, 0) }));
    const sum = totals.reduce((total, item) => total + item.total, 0);
    const previous = stores.reduce((total, store) => total + storeSales[store].slice(-period * 2, -period).reduce((subtotal, value) => subtotal + value, 0), 0);
    const visitors = Math.round(sum * 10000 / 10800);
    const growth = previous ? (sum / previous - 1) * 100 : 0;
    animateMetric(document.getElementById('metric-sales'), sum, formatSales);
    animateMetric(document.getElementById('metric-visitors'), visitors, (value) => `${numberFormat.format(value)}人`);
    animateMetric(document.getElementById('metric-gross-profit'), Math.round(sum * .917), formatSales);
    animateMetric(document.getElementById('metric-operating-profit'), Math.round(sum * .731), formatSales);
    const growthElement = document.getElementById('metric-growth');
    growthElement.textContent = `前の同期間比 ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
    document.getElementById('insight-title').textContent = selected === 'all' ? '青山店が売上をけん引しています。' : `${selected}の売上推移を確認できます。`;
    document.getElementById('insight-copy').textContent = selected === 'all'
      ? '直近の売上は前の同期間と比べて伸びています。青山店は売上規模が最も大きく、全体をけん引しています。メニュー構成とあわせて、好調の要因を確認してみましょう。'
      : `${selected}の期間売上は${formatSales(sum)}です。月ごとの変化とメニュー構成を見比べると、次に確認したいポイントが見つかります。`;
    renderLineChart(period, selected);
    renderStoreBars(period, selected);
    renderMenuMix(selected, period);
    renderVisitHeatmap(period, selected);
  }

  document.getElementById('period-filter').addEventListener('change', updateDashboard);
  document.getElementById('store-filter').addEventListener('change', updateDashboard);
  let isCompactViewport = window.innerWidth <= 650;
  window.addEventListener('resize', () => {
    const nextCompactViewport = window.innerWidth <= 650;
    if (nextCompactViewport !== isCompactViewport && !dashboardPanel.hidden) {
      isCompactViewport = nextCompactViewport;
      updateDashboard();
    }
  }, { passive: true });
  updateMapping();
})();
