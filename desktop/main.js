const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 설정 파일 경로
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');
const dbPath = path.join(userDataPath, 'storymind.db');

// 설정 로드/저장
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return { geminiApiKey: '' };
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// 글로벌 설정
global.config = loadConfig();
global.dbPath = dbPath;

let mainWindow;
let server;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  });

  // 개발 모드면 localhost, 아니면 빌드된 파일
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 내장 서버 시작
function startServer() {
  // DB 경로 설정
  process.env.DB_PATH = dbPath;
  process.env.GEMINI_API_KEY = global.config.geminiApiKey || '';
  process.env.NODE_ENV = 'production';
  process.env.PORT = '4000';

  try {
    server = require('./server/index.js');
    console.log('Internal server started on port 4000');
  } catch (e) {
    console.error('Failed to start server:', e);
  }
}

// IPC 핸들러
ipcMain.handle('get-config', () => {
  return global.config;
});

ipcMain.handle('save-config', (event, config) => {
  global.config = { ...global.config, ...config };
  saveConfig(global.config);
  // API 키 업데이트
  process.env.GEMINI_API_KEY = global.config.geminiApiKey || '';
  return true;
});

ipcMain.handle('get-data-path', () => {
  return userDataPath;
});

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // 서버 정리
  if (server && server.close) {
    server.close();
  }
});
