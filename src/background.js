// This is main process of Electron, started as first thing when your
// app starts. It runs through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from "path";
import url from "url";
import { app, Menu, ipcMain } from "electron";
import { devMenuTemplate } from "./menu/dev_menu_template";
import { editMenuTemplate } from "./menu/edit_menu_template";
import createWindow from "./helpers/window";

//var ElectronProxyAgent = require('electron-proxy-agent');

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from "env";

const dns = require("dns2")
const fetch = require("node-fetch")

const { Packet } = dns;

const server = dns.createServer(async (request, send, rinfo) => {
    const response = Packet.createResponseFromRequest(request);
    const [ question ] = request.questions;
    const { name } = question;
    if (name.endsWith(".kst")) {
        const nameWithoutExt = name.replace(/\.kst$/, "")
        const kstName = await (await fetch(`https://krist.ceriat.net/names/${encodeURIComponent(nameWithoutExt)}`)).json()
        console.log(kstName)
        if (kstName.name.a) {
            response.answers.push({
                name,
                type: Packet.TYPE.A,
                class: Packet.CLASS.IN,
                ttl: 300,
                address: kstName.name.a
            });
        }
        send(response)
    } else {
        // work out how to send NOAUTH here
        send(response)
    }
});

server.on('request', (request, response, rinfo) => {
    console.log(request.header.id, request.questions[0]);
});

server.listen(5333);

let mainWindow;

const setApplicationMenu = () => {
  const menus = [editMenuTemplate];
  if (env.name !== "production") {
    menus.push(devMenuTemplate);
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== "production") {
  const userDataPath = app.getPath("userData");
  app.setPath("userData", `${userDataPath} (${env.name})`);
}

app.on("ready", () => {
  //setApplicationMenu();

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    icon: __dirname + '/assets/icons/icon.ico',
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });
  mainWindow.setMenuBarVisibility(false)
  mainWindow.setIcon(path.join(__dirname, '/assets/icons/krist_hq_square.png'));

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "app.html"),
      protocol: "file:",
      slashes: true
    })
  );
  let webContents;
  ipcMain.on('webcontents-to-main', (event, arg) => {
    webContents = arg;
    webContents.addEventListener("will-navigate", function(evt) {
      evt.preventDefault();
    })
  })

  /*mainWindow.webContents.session.setProxy(new ElectronProxyAgent({
    resolveProxy : function(url, callback) {
      console.log(url);
      callback("PROXY GOOGLE.COM:80; DIRECT"); // return a valid pac syntax
    }
  }));*/

  if (env.name === "development") {
    mainWindow.openDevTools();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.on('cancel-fake-domain-nav', (event, arg) => {
  arg.preventDefault()
})
