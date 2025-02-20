const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (!token) {
    alert("Token de acceso no encontrado. Inicia sesión primero.");
} else {
    fetch(`/top-songs?token=${token}`)
        .then(response => response.json())
        .then(data => {
            const queueList = document.getElementById("queue");
            queueList.innerHTML = "";

            data.queue.forEach(song => {
                const listItem = document.createElement("li");
                listItem.textContent = `${song.name} - ${song.artist}`;
                listItem.dataset.uri = song.uri;
                queueList.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error("Error al obtener las canciones:", error);
            alert("Hubo un error. Intenta nuevamente.");
        });

    window.onSpotifyWebPlaybackSDKReady = () => {
        const player = new Spotify.Player({
            name: "Mi Reproductor Web",
            getOAuthToken: cb => { cb(token); },
            volume: 0.5
        });

        player.addListener("ready", ({ device_id }) => {
            console.log("Reproductor listo con ID:", device_id);
            setDevice(device_id);
        });

        player.addListener("not_ready", ({ device_id }) => {
            console.log("Reproductor desconectado:", device_id);
        });

        player.connect().then(success => {
            if (success) {
                console.log("Conectado a Spotify Player");
            } else {
                console.error("Error al conectar el reproductor");
            }
        });

        // Botones de control
        const playPauseButton = document.getElementById("play-pause");
        const playNextButton = document.getElementById("play-next");

        playPauseButton.addEventListener("click", () => {
            player.togglePlay().then(() => {
                console.log("Canción pausada/reanudada");
            });
        });

        playNextButton.addEventListener("click", playNextSong);
    };
}

function setDevice(deviceId) {
    fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ device_ids: [deviceId], play: true })
    }).then(response => {
        if (response.status === 204) {
            console.log("Dispositivo activado correctamente.");
        } else {
            return response.json();
        }
    }).then(data => {
        if (data && data.error) {
            console.error("Error al configurar el dispositivo:", data.error);
        }
    }).catch(error => console.error("Error al configurar el dispositivo:", error));
}

function playSong(uri) {
    fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ uris: [uri] })
    })
    .then(response => {
        if (response.status === 204) {
            console.log("Reproducción iniciada correctamente");
        } else {
            return response.json();
        }
    })
    .then(data => {
        if (data && data.error) {
            console.error("Error al reproducir la canción:", data.error);
        }
    })
    .catch(error => console.error("Error en la solicitud de reproducción:", error));
}

function playNextSong() {
    fetch("/play-next")
        .then(response => response.json())
        .then(data => {
            if (data.song) {
                document.getElementById("now-playing").innerHTML = `Reproduciendo: ${data.song.name} - ${data.song.artist} <span class="playing-indicator">🎵</span>`;
                playSong(data.song.uri);
                document.getElementById("queue").removeChild(document.getElementById("queue").firstChild);
            } else {
                document.getElementById("now-playing").innerHTML = "No hay más canciones en la cola.";
                document.getElementById("play-next").disabled = true;
            }
        })
        .catch(error => console.error("Error al reproducir la canción:", error));
}