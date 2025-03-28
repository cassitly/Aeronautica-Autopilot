const Tesseract = require('tesseract.js');
const screenshot = require('screenshot-desktop');
const keySender = require('node-key-sender');
const { format } = require('date-and-time');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const fsPromises = require('fs/promises')
const path = require('path')
const sharp = require('sharp');
const crypto = require('crypto');
const axios = require('axios');

function notify(...msg) {
    console.log(`${msg}`); // Print to console
    const date = format(new Date(), 'DD-MM-YYYY'); // Get current date and time
    const time = format(new Date(), 'HH:mm:ss');
    fs.appendFileSync(path.resolve(__dirname, './output/logs/log-' + date + '.log'), `(${time}): ${msg}\n`);
    fs.appendFileSync(path.resolve(__dirname, './output/data/logs.txt'), `(${time}): ${msg}\n`);
}

class Server {
    constructor() {        
        // Generate a pair of RSA keys for this app (private key never leaves the app)
        this.keys = crypto.generateKeyPairSync("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" }
        });

        this.appId = "cassitly.io/api:Aeronautica-Autopilot";
        this.appName = "api:request/app[Aeronautica-Autpilot]";
        this.contentType = 'application/json';

        this.apiURL = ""
        
        // Store the app's public key (to send to the API)
        this.publicKey = this.keys.publicKey;
        this.privateKey = this.keys.privateKey;

        this.api = { publicKey: "", apiKey: "" }; // Stores the API's key
    }

    // Encrypt the message with the server's public key
    encrypt(public_key, message) {
        // Format the received public key
        const formattedPublicKey = `-----BEGIN PUBLIC KEY-----\n${public_key}\n-----END PUBLIC KEY-----`;

        // Encrypt the message using the API's public key
        const encryptedMessage = this.crypto.publicEncrypt(
            {
                key: formattedPublicKey,
                padding: this.crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            Buffer.from(message)
        );

        return encryptedMessage.toString("base64");
    }

    // Decrypt the response using the app's private key
    decrypt(encrypted_message) {
        const formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${this.privateKey}\n-----END PRIVATE KEY-----`;

        // Decrypt the response from the API using the private key
        const buffer = Buffer.from(encrypted_message, "base64");
        const decryptedMessage = this.crypto.privateDecrypt(
            {
                key: formattedPrivateKey,
                padding: this.crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            buffer
        );

        return decryptedMessage.toString("utf-8");
    }

    // Get the app's public key
    getPublicKey() {
        return this.publicKey;
    }

    // Get the app's private key
    getPrivateKey() {
        return this.privateKey;
    }

    async auth() {
        try {
            const response = await axios.post(this.apiURL + 'api/public-key', {
                headers: {
                    'Content-Type': this.contentType,
                    'application-id': this.appId, 
                    'application-name': this.appName,
                    'request-id': "request:data/send[public-key]",
                    'request-content': this.publicKey  // Additional headers if needed
                }
            });

            this.api.publicKey = response.data.publicKey; // Store the API's public key
        } catch (error) {
            notify("[!] API errorred with message : Error communicating with the API\n", error);
        }

        try {
            // Encrypt the request data
            const requestAPIKey = this.encrypt(this.api.publicKey, "API_KEY");

            // Send encrypted data to the API
            const response = await axios.post(this.apiURL + 'request', {
                encrypted: requestAPIKey
            }, {
                headers: {
                    'Content-Type': this.contentType,
                    'application-id': this.appId, 
                    'application-name': this.appName,
                }
            });

            // Decrypt the API response using your private key
            this.api.apiKey = this.decrypt(response.data.encrypted);
        } catch (error) {
            notify("[!] API errored with message : Error communicating with the API\n", error);
        }

        
    }

    async sendData() {
        try {
            // Encrypt the request data
            const encryptedMessage = this.encrypt(this.api.publicKey, "SHARE_DATA");

            // Send encrypted data to the API
            const response = await axios.post(this.apiURL + 'request', {
                encrypted: encryptedMessage,
                data: {
                    OCR: fs.readFileSync('./output/data/current.txt', 'utf-8'),
                    logs: fs.readFileSync('./output/data/logs.txt', 'utf-8')
                }
            }, {
                headers: {
                    'Content-Type': this.contentType,
                    'application-id': this.appId, 
                    'application-name': this.appName,
                    'x-api-key': this.api.apiKey,
                }
            });

            // Decrypt the API response using your private key
            const data = this.decrypt(response.data.encrypted);
            if (data.return.code !== "SUCCESS") {
                notify("[!] API errored with message : " + data.error);
            }
        } catch (error) {
            notify("[!] API errored with message : Error communicating with the API\n", error);
        }
    }
}

async function capture(imgPath, imgArrary) {
    try {
        const fullPath = "./output/screen_full.png";

        notify("[!] Debug : Taking Screenshot");
        // await screenshot({ filename: imgPath });

        // Resize first and save to imgPath
        // await sharp(fullPath)
        //     .resize({ width: 1920, height: 1010 })
        //     .toFile(imgPath);

        // Ensure the resized image is fully processed
        const metadata = await sharp(imgPath).metadata();
        notify("[!] Debug : Resized image metadata:", metadata);

        // Ensure extraction area is within image boundaries
        const width = metadata.width;
        const height = metadata.height;

        const extractAreas = [
            { left: 995, top: 117, width: 59, height: 29 },   // heading
            { left: 203, top: 797, width: 86, height: 39 },   // destination
            { left: 26, top: 565, width: 160, height: 50 },   // airspeed
            { left: 23, top: 621, width: 161, height: 49 },   // altitude
            { left: 20, top: 678, width: 166, height: 39 },   // vertical speed
            { left: 21, top: 726, width: 173, height: 54 },   // fuel
            { left: 184, top: 549, width: 81, height: 205 }   // throttle
        ];

        notify("[!] Debug : Splitting Screenshot");

        for (let i = 0; i < extractAreas.length; i++) {
            let { left, top, width: w, height: h } = extractAreas[i];

            if (left + w > width || top + h > height) {
                notify(`[!] Error : Extract area ${i} is out of bounds!`);
                continue;
            }

            await sharp(imgPath)
                .extract({ left, top, width: w, height: h })
                .toFile(imgArrary[i]);
        }

        notify("[✔] Screenshot Processing Completed");

    } catch (err) {
        notify("[!] Error : " + err);
    }
}



async function recongize(imgPath) {
    try {
        notify("[!] Debug : Recongizing Image [", imgPath, "]");
        const { data: { text } } = await Tesseract.recognize(imgPath, 'eng'); // Perform OCR
        // notify("OCR Output:", text);
        /// fs.appendFileSync(path.resolve(__dirname, './notepad.txt'), text); // Write to file for debugging
        return text; // Returns the text data to be written
    } catch (err) {
        notify("[!] Error at Recongize : " + err);
    }
}

async function writeOCR(imgArrary, currentOCR) {
    try {
        notify("[!] Debug : Writing OCR");
        if (fs.readFileSync(currentOCR, 'utf8').length !== 0) {
            fs.writeFileSync(currentOCR, ""); // Clears the current OCR data
        } // If the current OCR has data, clear it.

        for (const img of imgArrary) // For each image in the arrary

        { let data = await recongize(img); // Wait for OCR recognition on each image          
            fs.appendFileSync(currentOCR, data); // Append data to file
        } // Writes data to file
    } catch (err) {
        notify("[!] Error at Write : " + err);
    }
}

async function readOCR(currentOCR) {
    notify("[!] Debug : Reading OCR");
        const text = fs.readFileSync(currentOCR, 'utf-8'); // Reads the current OCR data
    
        // Extract flight data from text
        const airspeed = text.match(/AIRSPEED\n(.+)/);
        // [0] outputs: AIRSPEED\n468
        // [1] outputs: 468

        const altitude = text.match(/ALTITUDE\n(.+)/);
        // [0] outputs: ALTITUDE\n11400
        // [1] outputs: 11400

        const destination = text.match(/(.+)°/);
        // [0] outputs: DEST 245°
        // [1] outputs: 245°

        const heading = text.match(/HDG(.+)/);
        // [0] outputs: HDG245
        // [1] outputs: 245

        const fuel = text.match(/FUEL\n(.+)\%/);
        // [0] outputs: FUEL\n43.4%
        // [1] outputs: 43.4

        const verticalspeed = text.match(/VERTICAL SPEED\n(.+) ft\/m/);
        // [0] outputs: VERTICAL SPEED\n56.8 ft/m
        // [1] outputs: 56.8

        const distance = text.match(/(.+) nm/);
        // [0] outputs: Distance: 176.81 nm
        // [1] outputs: 176.81

        // In development
        // const throttle = match(/AIRSPEED (.+)\%/);
        // [0] outputs: 100%
        // [1] outputs: 100

        return {
            data: {
                destination: destination[1],
                airspeed: airspeed[1],
                altitude: altitude[1],
                heading: heading[1],
                fuel: fuel[1],
                verticalspeed: verticalspeed[1],
                distance: distance[1]
            }
        }
}

async function run(currentOCR) {
    try {
        notify("[!] Debug : Starting processor");
        // Capture screenshot
        const imgPath = path.resolve(__dirname, './output/screenshot.png'); // Creates a variable path to the screenshot
        const imgArrary = [ // Arrary of image paths, that were spilt.
            './output/heading_section.png', './output/destination_section.png',
            './output/airspeed_section.png',
            './output/altitude_section.png', './output/vertical_speed_section.png',
            './output/fuel_section.png', './output/throttle_section.png'
        ]
        await capture(imgPath, imgArrary); // Captures the image and extracts data from it.

        await writeOCR(imgArrary, currentOCR); // Recongize the extracted data and write to file        
    } catch (error) {
        notify("[!] Error at processing : " + error.code + "\n" + error.message);
    }
}

async function checkPlatform() {
    const platform = os.platform();

    if (platform === 'win32') {
        exec('taskkill /F /IM RobloxPlayerBeta.exe', (err, stdout, stderr) => {
            if (err) {
            console.error('Error:', err);
            return;
            }
            console.log('Roblox task ended:', stdout);
        });
    } else if (platform === 'darwin' || platform === 'linux') {
        exec('killall Roblox', (err, stdout, stderr) => {
            if (err) {
            console.error('Error:', err);
            return;
            }
            console.log('Roblox task ended:', stdout);
        });
    } else {
        console.log('Unsupported platform');
    }
}

async function autopilot(heading, destination, altitude, verticalspeed, airspeed, distance, fuel) {
    let changes = ["ALL"] // Creates an variable for autopilot changes

    if (!Array.isArray(changes)) { // Checks if changes is an arrary
        notify("[!] Error: 'changes' is not an array.");
        return; // returns if not
    }

    const { // Imports the settings from config/settings.js
        maxAirspeed,
        minAirspeed,
        
        maxAltitude,
        minAltitude,
        
        useAirspeed,
        useFlightPlan,

        maxDistance,
        minDistance,

        maxVerticalSpeed,
        minVerticalSpeed,
    } = require('./config/settings').settings;

    async function adjustHeading(heading, destination, changes) {
        notify("[!] Autopilot : Adjusting heading");
        if (heading !== destination) { // If the heading is not the same as the destination
            notify("[!] Autopilot : Incorrect Heading, adjusting");
    
            if (heading < destination) { // If the heading is less than the destination
                notify("[!] Autopilot : Turn right");
                await keySender.sendKey("d"); // adjust to the right

                changes.push("Heading") // Tells the computer, a change of the heading is being made
    
                await run(); // Reprocesses the data
                return;
            }
            
            else if (heading > destination) { // If the heading is greater than the destination
                notify("[!] Autopilot : Turn left");
                await keySender.sendKey("a"); // adjust to the left

                changes.push("Heading") // Tells the computer, a change of the heading is being made
    
                await run(); // Reprocesses the data
                return;
            }

            else {
                changes.pop("Heading") // Removes the heading tag

                notify("[!] Autopilot : Correct Heading");
                return; // Returns to the main function
            }
        }
        
        else {
            notify("[!] Autopilot : Correct Heading");
            return; // Returns to the main function
        }
    }

    async function adjustAirspeed(airspeed, maxAirspeed, minAirspeed, changes) {
        notify("[!] Autopilot : Adjusting throttle");
        if (airspeed > maxAirspeed) { // If the airspeed is greater than the max airspeed
            notify("[!] Autopilot : Throttle down");
            await keySender.sendKey("s"); // throttle down

            changes.push("Throttle") // Tells the computer that a current change of the throttle is being made
    
            await run(); // Reprocesses the data
            return;
        }
        
        else if (airspeed < minAirspeed) { // If the airspeed is less than the min airspeed
            notify("[!] Autopilot : Throttle up");
            await keySender.sendKey("w"); // throttle up

            changes.push("Throttle") // Tells the computer that a current change of the throttle is being made
    
            await run(); // Reprocesses the data
            return;
        }

        else {
            changes.pop("Throttle") // Removes the throttle tag

            notify("[!] Autopilot : Correct Throttle");
            return;
        }
    }

    async function adjustAltitude(altitude, maxAltitude, minAltitude, changes) {
        notify("[!] Autopilot : Adjusting altitude");
        if (altitude > maxAltitude) { // If the altitude is greater than the max altitude
            notify("[!] Autopilot : Descend");
            await keySender.sendKey("u"); // descend

            changes.push("Altitude") // Tells the computer, a current change of altitude is being made
    
            await run(); // Reprocesses the data
            return;
        }
        
        else if (altitude < minAltitude) { // If the altitude is less than the min altitude
            notify("[!] Autopilot : Climb");
            await keySender.sendKey("j"); // climb

            changes.push("Altitude") // Tells the computer, a current change of altitude is being made
    
            await run(); // Reprocesses the data
            return;
        }

        else {
            changes.pop("Altitude") // Removes the altitude tag

            notify("[!] Autopilot : Correct Altitude");
            return;
        }
    }

    async function adjustAngle(verticalspeed, maxVerticalSpeed, minVerticalSpeed, changes) {
        notify("[!] Autopilot : Adjusting angle");
        if (verticalspeed > maxVerticalSpeed) {
            notify("[!] Autopilot : Level out aircraft");
            await keySender.sendKey('='); // Increase angle

            changes.push("Angle"); // Tells the computer, that a current change of the angle is being made

            await run(); // Reprocesses the data
            return;
        }

        else if (verticalspeed < minVerticalSpeed) {
            notify("[!] Autopilot : Level out aircraft");
            await keySender.sendKey('='); // Decrease angle
            
            changes.push("Angle"); // Tells the computer, that a current change is being made

            await run(); // Reprocesses the data
            return;
        }

        else {
            changes.pop("Angle") // Removes the angle tag

            notify("[!] Autopilot : Correct Angle");
            return;
        }
    }

    async function alertPilotOfLanding(distance, maxDistance, minDistance) {
        notify("[!] Autopilot : Alerting pilot of landing");
        if (distance === minDistance) {
            if (distance > minDistance) { // If the distance is less than the minimum distance
                notify("[!] Autopilot : Alerting pilot of landing");
            }

            else {
                notify("[!] Autopilot : " + distance + "nm away from destination");
            }

            if (distance > maxDistance) {
                notify("[!] Autopilot : Alerting pilot of landing");
            }

            else {
                notify("[!] Autopilot : " + distance + "nm away from destination");
            }
        } else {
            await run(); // Reprocesses the data
            return; // Returns to the main function
        }
    }

    async function alertPilotOfSystemInfo(fuel) {
        notify("[!] Autopilot : Checking aircraft systems");
        if (fuel < 20) {
            notify("[!] Autopilot : Alerting pilot of fuel low");
        }

        else if (fuel < 10) {
            notify("[!] Autopilot : Alerting pilot of critically low fuel");
        }

        else if (fuel < 5) {
            notify("[!] Autopilot : Stopping aircraft, fuel low. Shutting down session.");
            checkPlatform(); // Checks what platform is the app running on, and adjust accordingly
            notify("[!] System Info : This will revert back to the previous saved location.")
        }

        else {
            notify("[!] Autopilot : Aircraft systems are functioning normally");
            notify("[!] System Info : Current fuel percentage is " + fuel)
        }
    }

    async function settings(run) {
        if (run === "Throttle") {
            if (useAirspeed === true) { // Uses airspeed as an indicator to adjust the throttle.
                await adjustAirspeed(airspeed, maxAirspeed, minAirspeed, changes);
            }
            // If the user disables it, outputs an error.
            else notify("[!] Autopilot failed to run : Airspeed is the only option ATM")
        }

        else if (run === "Heading") {
            if (useFlightPlan === true) { // Adjusts heading based on flight plan in-game
                await adjustHeading(heading, destination, changes);
            }
            // If the user disables this, outputs an error.
            else notify("[!] Autopilot failed to run : Following the in-game flight plan is the only option ATM")
        }

        else {
            notify("[!] Autopilot failed to run : Unknown setting [at settings() within main()]")
            return;
        }
    }

    async function controlAircraft(changes) {
        changes.forEach(async (values) => {
            new Promise(resolve => setTimeout(resolve, 1000));
            switch (values) {
                case "Heading":
                    await settings(values)
                    break;

                case "Throttle":
                    await settings(values)
                    break;

                case "Altitude":
                    await adjustAltitude(altitude, maxAltitude, minAltitude, changes)
                    break;

                case "Angle":
                    await adjustAngle(verticalspeed, maxVerticalSpeed, minVerticalSpeed, changes)
                    break;

                case "ALL": 
                    await settings("Heading") // Adjusts systems based on user settings.
                    await settings("Throttle") // Adjusts systems based on user settings.
                    
                    // ESSENTIAL system functions.
                    await adjustAltitude(altitude, maxAltitude, minAltitude, changes);
                    await adjustAngle(verticalspeed, maxVerticalSpeed, minVerticalSpeed, changes);
                    changes.pop(); // Removes the ALL tag
                    break;

                default:
                    notify("[!] main.error: critical error, in the application. Exiting.", values)
                    return; // Exits the application, to ensure, no looping of errors
            }
        })
    }

    async function main() {

        notify("[!] Main : Starting autopilot...");

        await controlAircraft(changes); // Controls the aircraft.
        await alertPilotOfLanding(distance, maxDistance, minDistance); // Alerts pilot when close to the destination
        await alertPilotOfSystemInfo(fuel); // Alerts pilot when critical systems are not functioning correctly.
    }

    await main(); // Runs the main function
}

async function main() {
    async function initialize() {
        const folders = [ // Creates an arrary of required folders.
            path.resolve(__dirname, './output/'),
            path.resolve(__dirname, './output/data/'),
            path.resolve(__dirname, './output/logs/'),
            path.resolve(__dirname, './config/')
        ]

        const files = [
            path.resolve(__dirname, './config/settings.js')
        ]

        const contents = {
            settings: ""
        }

        notify("[!] Initialize : Creating folders");
        for (const folder of folders) {
            try { // Writes folder, if it doesn't exist.
                notify("[!] Initialize : Writing folder, " + folder)
                await fsPromises.mkdir(folder, { recursive: true });
            } catch (err) { // If error isn't saying that a folder already exists, throw that error.
                if (err.code !== 'EEXIST') {
                    throw err; // This throws the error.
                }
            }
        }

        notify("[!] Initialize : Creating files");
        for (const file of files) {
            try { // Writes file, if it doesn't exist.
                notify("[!] Initialize : Writing file, " + file)
                await fsPromises.writeFile(file, '');
            } catch (err) { // If error isn't saying that a file already exists, throw that error.
                if (err.code !== 'EEXIST') {
                    throw err; // This throws the error.
                }
            }
        }
    }

    async function createInstance() {
        await initialize(); // Initializes the app, for the first time, and creates the folders required.

        const currentOCR = path.resolve(__dirname, './output/data/current.txt'); // Current OCR data

        await run(currentOCR); // Processes the image capture, image cropping, image recongition, and flight information.
        const { airspeed, altitude, destination, heading, fuel, verticalspeed, distance } = (await readOCR(currentOCR)).data; // Reads the current OCR data
        
        autopilot(heading, destination, altitude, verticalspeed, airspeed, distance, fuel); // Starts the autopilot function.
    }

    const { imageLatency } = require('./config/settings').settings; // Reads the image latency setting

    setInterval(createInstance, imageLatency);
}
// Runs the main application function.
setTimeout(main, 5000)
