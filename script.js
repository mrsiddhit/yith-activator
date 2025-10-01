(function() {
  'use strict';

  /**
   * Calculator state machine
   */
  const state = {
    displayValue: '0',          // What user sees
    storedValue: null,          // Value before an operator
    pendingOperator: null,      // 'add' | 'subtract' | 'multiply' | 'divide' | null
    lastInputType: null,        // 'digit' | 'decimal' | 'operator' | 'equals' | 'fn'
    overwriteOnNextDigit: false // After equals or operator, next digit should overwrite
  };

  const displayEl = document.getElementById('display');
  const historyEl = document.getElementById('history');
  const keysEl = document.querySelector('.keys');

  function formatNumber(valueStr) {
    const value = Number(valueStr);
    if (!Number.isFinite(value)) return 'Error';

    const abs = Math.abs(value);
    // Use scientific notation for very large/small numbers
    if ((abs !== 0 && (abs >= 1e10 || abs < 1e-6))) {
      return value.toExponential(6).replace(/\.0+e/, 'e');
    }

    // Default: trim to a reasonable precision, remove trailing zeros
    let out = value.toLocaleString(undefined, {
      maximumFractionDigits: 10
    });
    return out;
  }

  function updateDisplay() {
    displayEl.textContent = formatNumber(state.displayValue);
  }

  function clearAll() {
    state.displayValue = '0';
    state.storedValue = null;
    state.pendingOperator = null;
    state.lastInputType = 'fn';
    state.overwriteOnNextDigit = false;
    historyEl.textContent = '';
    setActiveOperator(null);
    updateDisplay();
  }

  function inputDigit(d) {
    if (state.overwriteOnNextDigit) {
      state.displayValue = String(d);
      state.overwriteOnNextDigit = false;
    } else {
      if (state.displayValue === '0') {
        state.displayValue = String(d);
      } else {
        state.displayValue += String(d);
      }
    }
    state.lastInputType = 'digit';
    updateDisplay();
  }

  function inputDecimal() {
    if (state.overwriteOnNextDigit) {
      state.displayValue = '0.';
      state.overwriteOnNextDigit = false;
    } else if (!state.displayValue.includes('.')) {
      state.displayValue += '.';
    }
    state.lastInputType = 'decimal';
    updateDisplay();
  }

  function toggleSign() {
    if (state.displayValue === '0') return;
    if (state.displayValue.startsWith('-')) {
      state.displayValue = state.displayValue.slice(1);
    } else {
      state.displayValue = '-' + state.displayValue;
    }
    state.lastInputType = 'fn';
    updateDisplay();
  }

  function percent() {
    const value = Number(state.displayValue);
    if (!Number.isFinite(value)) return;
    state.displayValue = String(value / 100);
    state.lastInputType = 'fn';
    updateDisplay();
  }

  function setActiveOperator(op) {
    document.querySelectorAll('.key-op').forEach(btn => btn.classList.remove('active'));
    if (!op) return;
    const btn = document.querySelector(`.key-op[data-action="${op}"]`);
    if (btn) btn.classList.add('active');
  }

  function prepareOperation(operator) {
    const current = Number(state.displayValue);
    if (state.storedValue === null) {
      state.storedValue = current;
    } else if (state.lastInputType !== 'operator') {
      // Chain calculations on consecutive operators (like iOS behavior)
      const result = compute(state.storedValue, current, state.pendingOperator);
      state.storedValue = result;
      state.displayValue = String(result);
      updateDisplay();
    }
    state.pendingOperator = operator;
    state.overwriteOnNextDigit = true;
    state.lastInputType = 'operator';
    setActiveOperator(operator);
    historyEl.textContent = `${formatNumber(state.storedValue)} ${symbolFor(operator)}`;
  }

  function equals() {
    if (state.pendingOperator === null || state.storedValue === null) return;
    const current = Number(state.displayValue);
    const result = compute(state.storedValue, current, state.pendingOperator);
    state.displayValue = String(result);
    state.storedValue = null;
    historyEl.textContent = '';
    state.pendingOperator = null;
    state.overwriteOnNextDigit = true;
    state.lastInputType = 'equals';
    setActiveOperator(null);
    updateDisplay();
  }

  function compute(a, b, op) {
    let result;
    switch (op) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': result = b === 0 ? NaN : a / b; break;
      default: result = b; break;
    }
    // Round to avoid floating point artifacts
    return Number.parseFloat(result.toPrecision(12));
  }

  function symbolFor(op) {
    switch (op) {
      case 'add': return '+';
      case 'subtract': return '−';
      case 'multiply': return '×';
      case 'divide': return '÷';
      default: return '';
    }
  }

  // Event delegation for clicks
  keysEl.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains('key')) return;

    const digit = target.getAttribute('data-digit');
    const action = target.getAttribute('data-action');

    if (digit !== null) {
      inputDigit(digit);
      return;
    }

    switch (action) {
      case 'decimal': inputDecimal(); break;
      case 'clear': clearAll(); break;
      case 'sign': toggleSign(); break;
      case 'percent': percent(); break;
      case 'add':
      case 'subtract':
      case 'multiply':
      case 'divide':
        prepareOperation(action);
        break;
      case 'equals': equals(); break;
      default: break;
    }
  });

  // Keyboard support
  window.addEventListener('keydown', (e) => {
    const { key } = e;
    if (/^[0-9]$/.test(key)) {
      inputDigit(key);
      return;
    }
    switch (key) {
      case '.': inputDecimal(); break;
      case 'Escape': clearAll(); break;
      case '%': percent(); break;
      case '+': prepareOperation('add'); break;
      case '-': prepareOperation('subtract'); break;
      case '*': prepareOperation('multiply'); break;
      case '/': prepareOperation('divide'); break;
      case 'Enter':
      case '=': equals(); break;
      default:
        if (key.toLowerCase() === 'n') toggleSign();
        break;
    }
  });

  // Initialize
  clearAll();
})();

