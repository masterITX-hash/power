/**
 * DF-EWDSS - Entry point utama untuk Niagahoster (cPanel / CloudLinux Passenger / VPS / Local)
 * File ini dipanggil otomatis oleh cPanel "Setup Node.js App" atau perintah "node app.js".
 */
import "./server/src/index.js";
export { app, server, io } from "./server/src/index.js";
