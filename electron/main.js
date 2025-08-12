import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import waitOn from 'wait-on';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let flaskProcess;

async function getPythonPath() {
  try {
    execSync('python --version', { stdio: 'ignore' });
    return 'python';
  } catch {
    try {
      execSync('python3 --version', { stdio: 'ignore' });
      return 'python3';
    } catch {
      try {
        execSync('py --version', { stdio: 'ignore' });
        return 'py';
      } catch {
        throw new Error('Python not found. Please install Python from python.org');
      }
    }
  }
}

async function startFlaskServer() {
  try {
    const pythonPath = await getPythonPath();
    const isPackaged = app.isPackaged;
    const backendPath = isPackaged
      ? path.join(process.resourcesPath)
      : path.join(__dirname, '..');

    console.log(`Using Python: ${pythonPath}`);
    console.log(`Backend path: ${backendPath}`);

    const appPyPath = path.join(backendPath, 'app.py');
    if (!fs.existsSync(appPyPath)) {
      throw new Error(`app.py not found at ${appPyPath}`);
    }

    const env = {
      ...process.env,
      FLASK_ENV: isPackaged ? 'production' : 'development',
      FLASK_APP: 'app.py',
      WDM_LOG_LEVEL: '0',  // Silence WebDriver Manager
      PYTHONUNBUFFERED: '1' // Get cleaner output
    };

    return new Promise((resolve, reject) => {
      const flaskProcess = spawn(pythonPath, ['app.py', '--no-debugger', '--no-reload'], {
        cwd: backendPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: env,
        windowsHide: true
      });

      // Filter out WebDriver Manager logs
      flaskProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Running on')) {
          console.log(`Flask server ready: ${output.match(/Running on (.*)/)[1]}`);
          resolve(flaskProcess);
        }
        // Only show non-WDM messages
        else if (!output.includes('WDM') && !output.includes('chromedriver')) {
          console.log(`Flask: ${output}`);
        }
      });

      flaskProcess.stderr.on('data', (data) => {
        const error = data.toString();
        // Filter out WDM info messages
        if (!error.includes('WDM') && !error.includes('chromedriver')) {
          console.error(`Flask Error: ${error}`);
        }
      });

      flaskProcess.on('error', (err) => {
        console.error('Flask spawn error:', err);
        reject(new Error(`Failed to start Flask: ${err.message}`));
      });

      flaskProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Flask exited with code ${code}`));
        }
      });
    });
  } catch (err) {
    console.error('Flask startup failed:', err);
    throw err;
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true
  });

  try {
    if (app.isPackaged) {
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
      const devServerUrl = 'http://localhost:5173';
      try {
        // FIXED: Better wait-on implementation with error handling
        await waitOn({
          resources: [devServerUrl],
          timeout: 30000, // Increased timeout
          interval: 1000,
          window: 1000,
          verbose: true,
          validateStatus: (status) => status >= 200 && status < 400
        });
        await mainWindow.loadURL(devServerUrl);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      } catch (waitErr) {
        throw new Error(`Vite dev server not available at ${devServerUrl}\nDid you run "npm run dev"?\n${waitErr.message}`);
      }
    }

    mainWindow.on('close', (e) => {
      if (!isQuitting) {
        e.preventDefault();
        mainWindow.hide();
      }
    });

    mainWindow.on('minimize', (e) => {
      e.preventDefault();
      mainWindow.hide();
    });

  } catch (err) {
    dialog.showErrorBox('Error', `Window load failed: ${err.message}`);
  }
}

let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
  if (flaskProcess) {
    flaskProcess.kill();
  }
});

app.whenReady().then(async () => {
  try {
    flaskProcess = await startFlaskServer();
    await createWindow();
    
    if (process.platform === 'win32') {
      app.setAppUserModelId('PCBuildQuotation');
    }
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        mainWindow.show();
      }
    });
    
  } catch (err) {
    dialog.showErrorBox(
      'Application Error',
      `${err.message}\n\n` +
      'Troubleshooting:\n' +
      '1. Ensure Python is installed and in PATH\n' +
      '2. For development, run "npm run dev" first\n' +
      '3. Verify app.py exists in project root\n' +
      '4. Check console for more details'
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});