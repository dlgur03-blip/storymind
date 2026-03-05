const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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

  // 내장 서버에서 로드 (API 요청이 작동하려면 이렇게 해야 함)
  mainWindow.loadURL('http://localhost:4000');
  // 디버그용 개발자 도구 (나중에 제거)
  mainWindow.webContents.openDevTools();

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

// 폴더 선택 다이얼로그
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '원고 폴더 선택'
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// 파일 저장 다이얼로그
ipcMain.handle('save-file', async (event, { defaultName, content, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters || [{ name: 'Text Files', extensions: ['txt'] }]
  });
  if (result.canceled) return false;
  fs.writeFileSync(result.filePath, content, 'utf8');
  return result.filePath;
});

// DB 백업
ipcMain.handle('backup-db', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'storymind-backup.db',
    filters: [{ name: 'Database', extensions: ['db'] }]
  });
  if (result.canceled) return false;
  fs.copyFileSync(dbPath, result.filePath);
  return result.filePath;
});

// DB 복원
ipcMain.handle('restore-db', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'Database', extensions: ['db'] }],
    properties: ['openFile']
  });
  if (result.canceled) return false;
  fs.copyFileSync(result.filePaths[0], dbPath);
  return true; // 앱 재시작 필요
});

// 폴더에서 텍스트 파일 읽기
ipcMain.handle('read-text-files', async (event, folderPath) => {
  try {
    const files = fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.txt'))
      .sort((a, b) => {
        // 숫자 기반 정렬 (1.txt, 2.txt, 10.txt 등)
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB || a.localeCompare(b);
      });

    return files.map(f => ({
      name: f,
      content: fs.readFileSync(path.join(folderPath, f), 'utf8')
    }));
  } catch (e) {
    console.error('Error reading folder:', e);
    return [];
  }
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
