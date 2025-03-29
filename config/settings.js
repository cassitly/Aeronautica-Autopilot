let maxAirspeed = 467; // Set Max Airspeed
let minAirspeed = 200; // Set Min Airspeed

let maxAltitude = 1000; // Maximum altitude
let minAltitude = 500; // Minimum altitude

let maxThrottle = 100; // Maximum speed percentage of the plane
let minThrottle = 0; // Stall speed percentage of the plane

let maxDistance = 11; // Max distance from destination
let minDistance = 10 // Minimium distance from destination until alerting

let maxVerticalSpeed = 100; // Max vertical speed range
let minVerticalSpeed = 0; // Minimium vertical speed range

let imageLatency = 5000; // Image latency, for rate limiting the OCR recognition, recommended 10 seconds (aka 10,000 in miliseconds)
let retryLatency = 5000; // Retry latency, for in case the image latency system fails, recommended 5 seconds (aka 5,000 in miliseconds)

let useThrottle = false; // Tells the application to use the throttle indicator for speed
let useAirspeed = true; // Tells the application to use the airspeed indicator for speed

let useBoth = false; // Tells the application to use both the throttle and the airspeed indicator
let useFlightPlan = true; // Tells the application to follow the flight plan

let shareAnonymous = false; // Tells the application to share anonymous data with the dev

exports['settings'] = {
    maxAirspeed,
    minAirspeed,
    maxAltitude,
    minAltitude,
    maxThrottle,
    minThrottle,
    maxDistance,
    minDistance,
    maxVerticalSpeed,
    minVerticalSpeed,
    imageLatency,
    useThrottle,
    useAirspeed,
    useBoth,
    useFlightPlan,
    shareAnonymous,
    retryLatency,
}