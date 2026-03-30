let colors = [];

const extractBtn = document.getElementById('extractBtn');
const pickBtn = document.getElementById('pickBtn');
const paletteDiv = document.getElementById('palette');
const copyCssBtn = document.getElementById('copyCss');
const exportJsonBtn = document.getElementById('exportJson');

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function addColor(hex) {
  if (colors.some(c => c.hex.toUpperCase() === hex.toUpperCase())) {
    return; 
  }
  const rgb = hexToRgb(hex);
  colors.push({ 
    hex: hex.toUpperCase(), 
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` 
  });
  renderPalette();
}

function renderPalette() {
  paletteDiv.innerHTML = '<h3>Collected Colors (' + colors.length + ')</h3>';
  
  colors.forEach((color, index) => {
    const div = document.createElement('div');
    div.style.display = 'inline-block';
    div.style.textAlign = 'center';
    div.style.margin = '8px';
    div.innerHTML = `
      <div class="swatch" style="background: ${color.hex};" title="Click to copy hex"></div>
      <div class="info">${color.hex}<br>${color.rgb}</div>
    `;
    
    div.querySelector('.swatch').addEventListener('click', () => {
      navigator.clipboard.writeText(color.hex);
      alert(`Copied: ${color.hex}`);
    });
    
    paletteDiv.appendChild(div);
  });
}

extractBtn.addEventListener('click', async () => {
  paletteDiv.innerHTML = '<p>Taking screenshot and analyzing colors...</p>';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { 
      format: 'png' 
    });

    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      const colorMap = new Map();
      const step = 8; 

      for (let i = 0; i < pixels.length; i += 4 * step) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        const key = `${Math.floor(r/10)},${Math.floor(g/10)},${Math.floor(b/10)}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
      }

      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

      sortedColors.forEach(([key]) => {
        const [r, g, b] = key.split(',').map(Number).map(x => x * 10);
        const hex = rgbToHex(r, g, b);
        addColor(hex);
      });

      if (sortedColors.length === 0) {
        alert("No colors could be extracted. Try on a different page.");
      }
    };

    img.src = dataUrl;

  } catch (err) {
    console.error(err);
    alert("Failed to capture the page. Some sites block screenshots (e.g. bank pages).");
  }
});


pickBtn.addEventListener('click', async () => {
  if (!('EyeDropper' in window)) {
    alert("Your browser doesn't support the EyeDropper tool. Use latest Chrome/Edge.");
    return;
  }

  try {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();
    const hex = result.sRGBHex.toUpperCase();
    addColor(hex);
  } catch (err) {
    if (err.name !== 'AbortError') {
      alert("Failed to pick color.");
    }
  }
});

copyCssBtn.addEventListener('click', () => {
  if (colors.length === 0) {
    alert("No colors in palette yet!");
    return;
  }
  let css = ':root {\n';
  colors.forEach((c, i) => {
    css += `  --color-${i+1}: ${c.hex};\n`;
  });
  css += '}';
  navigator.clipboard.writeText(css);
  alert('✅ CSS variables copied!');
});

exportJsonBtn.addEventListener('click', () => {
  if (colors.length === 0) {
    alert("Nothing to export!");
    return;
  }
  const jsonStr = JSON.stringify(colors, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'color-palette.json';
  a.click();
  URL.revokeObjectURL(url);
});