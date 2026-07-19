const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { BrowserWindow } = require("electron");

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

const TOKEN_DIR = path.join(__dirname, "data");
const TOKEN_PATH = path.join(TOKEN_DIR, "calendar-token.json");
const CREDENTIALS_PATH = path.join(TOKEN_DIR, "credentials.json");

function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return null;
  }
  const content = fs.readFileSync(CREDENTIALS_PATH, "utf8");
  return JSON.parse(content);
}

function loadToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    return null;
  }
  const content = fs.readFileSync(TOKEN_PATH, "utf8");
  return JSON.parse(content);
}

function saveToken(token) {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { recursive: true });
  }
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), "utf8");
}

function getOAuth2Client(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

function authenticate() {
  return new Promise((resolve, reject) => {
    const credentials = loadCredentials();
    if (!credentials) {
      return reject(new Error("No credentials.json found. Please add it to electron/data/credentials.json"));
    }

    const oauth2Client = getOAuth2Client(credentials);
    const existingToken = loadToken();

    if (existingToken) {
      oauth2Client.setCredentials(existingToken);

      if (existingToken.expiry_date && existingToken.expiry_date > Date.now()) {
        return resolve(oauth2Client);
      }

      if (existingToken.refresh_token) {
        return oauth2Client.refreshAccessToken((err, refreshedToken) => {
          if (err) return reject(err);
          saveToken(refreshedToken);
          oauth2Client.setCredentials(refreshedToken);
          resolve(oauth2Client);
        });
      }
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });

    const authWindow = new BrowserWindow({
      width: 600,
      height: 700,
      webPreferences: { nodeIntegration: false },
      autoHideMenuBar: true,
    });

    authWindow.loadURL(authUrl);

    authWindow.webContents.on("will-redirect", (event, url) => {
      if (url.startsWith("http://localhost")) {
        event.preventDefault();
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get("code");

        if (code) {
          oauth2Client.getToken(code, (err, token) => {
            if (err) {
              authWindow.close();
              return reject(err);
            }
            saveToken(token);
            oauth2Client.setCredentials(token);
            authWindow.close();
            resolve(oauth2Client);
          });
        } else {
          authWindow.close();
          reject(new Error("No authorization code received"));
        }
      }
    });

    authWindow.on("closed", () => {
      reject(new Error("Auth window closed"));
    });
  });
}

function getCalendarClient() {
  const credentials = loadCredentials();
  if (!credentials) return null;

  const oauth2Client = getOAuth2Client(credentials);
  const token = loadToken();
  if (!token) return null;

  oauth2Client.setCredentials(token);
  return google.calendar({ version: "v3", auth: oauth2Client });
}

function isConnected() {
  return loadCredentials() !== null && loadToken() !== null;
}

function disconnect() {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
  }
}

async function getUpcomingEvents(maxResults = 10) {
  const calendar = getCalendarClient();
  if (!calendar) return [];

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    return (response.data.items || []).map((event) => ({
      id: event.id,
      title: event.summary || "Untitled",
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      date: event.start.dateTime || event.start.date,
    }));
  } catch (err) {
    console.error("Failed to fetch calendar events:", err.message);
    return [];
  }
}

module.exports = {
  authenticate,
  isConnected,
  disconnect,
  getUpcomingEvents,
};
