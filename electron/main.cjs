// Electron Main Process for Apple Stocks Desktop App
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;
let serverInstance = null;

// Start embedded Express server if running as a packaged app
function startEmbeddedServer() {
  if (app.isPackaged) {
    try {
      process.env.NODE_ENV = 'production';
      const serverPath = path.join(__dirname, '../dist/server.cjs');
      serverInstance = require(serverPath);
    } catch (err) {
      console.error('Failed to initialize embedded server:', err);
    }
  }
}

// Helper to poll until the local server is accepting connections
function waitForServer(url, timeoutMs = 5000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(url, (res) => {
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(check, 150);
        }
      });
    };
    check();
  });
}

async function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#000000',
    title: 'Bolsa de Apple Desktop',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 14, y: 14 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Determine URL to load
  let targetUrl = process.env.ELECTRON_START_URL;
  if (!targetUrl) {
    if (app.isPackaged) {
      // In packaged production, try loading via embedded HTTP server first
      const isReady = await waitForServer('http://localhost:3000', 3000);
      if (isReady) {
        targetUrl = 'http://localhost:3000';
      } else {
        // Fallback to local index.html with file protocol
        targetUrl = `file://${path.join(__dirname, '../dist/index.html')}`;
      }
    } else {
      targetUrl = 'http://localhost:3000';
    }
  }

  mainWindow.loadURL(targetUrl);

  // If local server fails to load, gracefully fall back to local file
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.warn(`Failed to load ${validatedURL} (${errorCode}: ${errorDescription})`);
    if (validatedURL.startsWith('http://localhost:3000')) {
      const fallbackFile = path.join(__dirname, '../dist/index.html');
      mainWindow.loadFile(fallbackFile).catch((e) => {
        console.error('Fallback loadFile failed:', e);
      });
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// macOS Application Menu
function setupAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: 'Bolsa',
      submenu: [
        { role: 'about', label: 'Acerca de Bolsa' },
        { type: 'separator' },
        { role: 'services', label: 'Servicios' },
        { type: 'separator' },
        { role: 'hide', label: 'Ocultar Bolsa' },
        { role: 'hideOthers', label: 'Ocultar otros' },
        { role: 'unhide', label: 'Mostrar todo' },
        { type: 'separator' },
        { role: 'quit', label: 'Salir de Bolsa' }
      ]
    }] : []),
    {
      label: 'Archivo',
      submenu: [
        { label: 'Nuevo Ticker...', accelerator: 'CmdOrCtrl+N', click: () => { mainWindow?.webContents.send('open-add-ticker'); } },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Cerrar ventana' } : { role: 'quit', label: 'Salir' }
      ]
    },
    {
      label: 'Edición',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar cotizaciones' },
        { role: 'forceReload', label: 'Forzar recarga' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamaño real' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: 'Traer todo al frente' }
        ] : [])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  setupAppMenu();
  startEmbeddedServer();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
