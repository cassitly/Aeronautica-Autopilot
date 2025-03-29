# 👉 Aeronautica Autopilot Setup 👈
This is an application that enables autopilot, within the game Aeronautica. The application, will control the aircraft's pitch, speed, throttle, altitude, and destination. On low fuel, the application will automatically notify you. And if fuel is critically low, the application will automatically stop the session. **Version 1 Pre-release**, is currently in development as of 27/03/2025.

---

## 🪟🍎 Installation
**This code is supported by both Windows and Linux!**
For the pre-release version, follow the instructions below:

### 1. **Nodejs Environment**

- **Nodejs Version:** 
  Make sure you have installed Nodejs 21.7.3 or higher. You can download it from [nodejs.org](https://nodejs.org/en/download).

### 2. **Installing Dependencies**
**Normally, the program will install any required libraries for you upon first launch.** However, if it doesn't, please follow the instructions below.

In your terminal or command prompt, run:

```bash
npm install
```
or
```bash
npm install fs date-and-time tesseract.js sharp node-key-sender path screenshot-desktop
```

### 3. **Project Structure**
Your project might look like this:
```
/Aeronautica Autopilot
├── Aeronautica.js       # Contains the application code
├── config/settings.js   # Configuration file, created by the application
├── output/...           # Contains all the application outputs & logs
├── assets/LICENSE.md    # Repo's license
├── assets/README.md     # (Optional) Documentation
└── package.json         # Application's dependency list
```

- **Aeronautica.js:**  
  This file will contain the complete Javascript code provided. It includes:
  - Autopilot systems.
  - Functions to capture screenshots, perform OCR, extract the distance, and send alerts (with an attached screenshot when needed).
  - The main loop that ties everything together, running at a fixed interval (or dynamically based on elapsed time).

- **output/...:**  
  The application will create this folder, containing it's log files, it's current OCR data, and it's images taken.

- **config/settings.js:**  
  This is used for the application's settings, it contains all of the settings that comes preset.


### 4. **Running the Application**
**Run the Code:**  
   In your terminal or command prompt, navigate to your project directory and run:
   ```bash
   node Aeronautica.js
   ```
  or
   ```
   npm start
   ```

   You can also open it in a code editor (such as VS Code) and run it there.


### 5. **Configuration**
Configure all of the values to your (aircraft's) liking! 😁

  ---

## ☝️ Please Note

- For enhanced (OCR) results, consider doing the following:
    - Use camera 5, for enchanced results.
    - Turn ROBLOX's Graphics Quality to the LOWEST option, as this makes graphics more consistent with the GUI.
    - Set Aeronautica's in-game 'User Interface Scale' to MAX (1.5).
    - It is recommended to set roblox to fullscreen, to prevent unexplained errors.

- Set up your webhook in a channel/server with only you, as notifications should be set to all messages, which will ping all with access to the channel!

- Close the chat/player list so others can't mess up your mission!

- If the application constantly experiences unexplained errors, consider restarting your machine.

- The script is set up to use the default key binds and metrics: A, D, Z, Knots, and Nautical Miles.

- If you enjoy our code, please ⭐ and 👁️ the repo!

---

## 🗣️ Latest Version: 1.0 Pre-release

- Autopilot Pitch Controls

- Waypoint Navigation

- Altitude settings

- Airspeed & Throttle Controls

- Automatic Levelling

- [v1.0 Pre-release Download](https://github.com/Cassitly/AeronauticaAutopilot/Aeronautica.js)

---

## 📈 Upcoming Features

- Aircraft crash recovery, before crashing. (v2)

- AI path-finding around low terrain. (v7)

- Automatic GUI navigation. (v7)

- Full AI path-finding without waypoints. (v7)

- Full Autopilot, by AI Models. (v7)

---

### Questions or concerns? [DM me on Discord @cassitly](./assets/NO_LINK_ATTACHED.md)

---

<!-- # THIS CODE HAS BEEN CLEARED WITH AERONAUTICA STAFF. THIS IS 100% SAFE TO USE.
![Aeronautica Autopilot](./NO_LINK_ATTACHED.md) -->