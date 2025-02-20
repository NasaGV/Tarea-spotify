import dotenv from "dotenv";
dotenv.config();
import express from "express";
import axios from "axios";
import open from "open";
import path from "path";
import { fileURLToPath } from "url";
import Queue from "./queue.js";

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/callback";

const songQueue = new Queue();

app.get("/login", (req, res) => {
    const scope = "user-top-read streaming user-read-playback-state user-modify-playback-state user-read-currently-playing";
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${scope}`;
    
    res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send("Código de autorización no proporcionado");

    try {
        const response = await axios.post("https://accounts.spotify.com/api/token", 
        new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        }), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        const accessToken = response.data.access_token;
        res.redirect(`/?token=${accessToken}`);

    } catch (error) {
        console.error("Error al obtener el token de acceso:", error.response?.data || error.message);
        res.status(400).send("Error al obtener el token de acceso");
    }
});

app.get("/top-songs", async (req, res) => {
    const accessToken = req.query.token;
    if (!accessToken) return res.status(400).json({ error: "Token no proporcionado" });

    try {
        const response = await axios.get("https://api.spotify.com/v1/me/top/tracks", {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { limit: 10, time_range: "short_term" }
        });

        const songs = response.data.items.map(song => ({
            name: song.name,
            artist: song.artists[0].name,
            uri: song.uri
        }));

        songs.forEach(song => songQueue.enqueue(song));

        res.json({ queue: songQueue.showQueue() });

    } catch (error) {
        console.error("Error al obtener canciones:", error);
        res.status(400).json({ error: "Error al obtener canciones" });
    }
});

app.get("/play-next", (req, res) => {
    const nextSong = songQueue.dequeue();
    res.json({ song: nextSong || null });
});

app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
    open(`http://localhost:${port}/login`);
});
