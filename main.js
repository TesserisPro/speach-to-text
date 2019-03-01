const electron = require('electron');
require('dotenv').load({ silent: true });
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const globalShortcut = electron.globalShortcut;

const path = require('path');

let mainWindow;

const htmlPath = path.join(__dirname, 'index.html');

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({ 
    width: 400, 
    height: 600,
    frame: true,
    resizable: false,
    minimizable: false,
    maximizable: false
  });
  globalShortcut.register('Control+D', () => {
    console.log('Comand+D is pressed');
    mainWindow.webContents.openDevTools();
  })
  mainWindow.setMenu(null);
  // and load the index.html of the app.

  mainWindow.loadURL(`file://${htmlPath}`);

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
