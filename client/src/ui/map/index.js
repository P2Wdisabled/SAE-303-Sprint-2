// src/ui/map/index.js

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

//import './map.css'; // Si vous avez des styles spécifiques pour la carte

const Map = {};

Map.map = null;
Map.markers = null;

Map.init = async function(containerId, lycees, candidatures, filtres = {}) {
    // Initialiser la carte
    this.map = L.map(containerId).setView([45.8336, 1.2611], 13); // Centré sur Limoges

    // Ajouter le tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    // Ajouter un marqueur de test (optionnel)
    const markerTest = L.marker([45.8336, 1.2611]).addTo(this.map);
    markerTest.bindPopup("<b>Limoges</b><br>Bienvenue à Limoges !").openPopup();

    // Initialiser le groupe de clusters avec `zoomToBoundsOnClick` désactivé
    this.markers = L.markerClusterGroup({
        zoomToBoundsOnClick: false, // Désactiver le zoom automatique sur le clic du cluster
        // Vous pouvez ajouter d'autres options ici si nécessaire
    });

    // Ajouter l'écouteur d'événements pour les clusters
    this.markers.on('clusterclick', this.onClusterClick.bind(this));

    // Ajouter le groupe de clusters à la carte
    this.map.addLayer(this.markers);

    // Ajouter les marqueurs des lycées avec les candidatures
    this.ajouterMarqueursLycees(lycees, candidatures, filtres);

    // Ajouter la légende
    this.ajouterLegende();

    // Ajouter le contrôle de filtrage
    this.ajouterControleFiltrage();

    // Ajouter des écouteurs d'événements pour les filtres
    this.ajouterEcouteursFiltres(lycees, candidatures);
};

Map.getLatestUai = async function(candidature) {
    for (let i = 0; i < candidature.Scolarite.length; i++) {
        const scolarite = candidature.Scolarite[i];
        if (scolarite.UAIEtablissementorigine) {
            return scolarite.UAIEtablissementorigine.toUpperCase();
        }
    }
    return null;
};

Map.ajouterMarqueursLycees = async function(lycees, candidatures, filtres = {}) {
    // Effacer les anciens marqueurs
    if (this.markers) {
        this.markers.clearLayers();
    }

    lycees.forEach(lycee => {
        const lat = parseFloat(lycee.latitude);
        const lng = parseFloat(lycee.longitude);
        const uai = lycee.numero_uai.toUpperCase();
        const nombreCandidatures = candidatures[uai] || 0;

        // Appliquer les filtres
        if (
            (nombreCandidatures === 0 && !filtres.filtre0) ||
            (nombreCandidatures >= 1 && nombreCandidatures <= 2 && !filtres.filtre1_2) ||
            (nombreCandidatures >= 3 && nombreCandidatures <= 5 && !filtres.filtre3_5) ||
            (nombreCandidatures >= 6 && !filtres.filtre6)
        ) {
            return; // Ne pas ajouter ce marqueur
        }

        if (!isNaN(lat) && !isNaN(lng)) {
            // Définir une couleur basée sur le nombre de candidatures
            let couleur;
            if (nombreCandidatures === 0) {
                couleur = 'gray';
            } else if (nombreCandidatures <= 2) {
                couleur = 'blue';
            } else if (nombreCandidatures <= 5) {
                couleur = 'orange';
            } else {
                couleur = 'red';
            }

            // Créer un cercle personnalisé
            const circleMarker = L.circleMarker([lat, lng], {
                radius: 6 + nombreCandidatures, // Taille du marqueur
                fillColor: couleur,
                color: couleur,
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });

            // Stocker le nombre de candidatures dans le marqueur
            circleMarker.candidatures = nombreCandidatures;

            // Ajouter la popup
            circleMarker.bindPopup(`
                <b>${lycee.appellation_officielle}</b><br>
                ${lycee.adresse_uai || 'Adresse non disponible'}<br>
                <strong>Candidatures:</strong> ${nombreCandidatures}
            `);

            // Ajouter le marqueur au groupe de clusters
            this.markers.addLayer(circleMarker);
        }
    });
};

// Nouvelle méthode pour gérer les clics sur les clusters
Map.onClusterClick = function(cluster) {
    // Récupérer tous les marqueurs enfants du cluster
    const markers = cluster.layer.getAllChildMarkers();

    // Calculer la somme des candidatures
    const sommeCandidatures = markers.reduce((acc, marker) => acc + (marker.candidatures || 0), 0);

    // Créer le contenu de la popup
    const popupContent = `
        <b>Cluster</b><br>
        <strong>Total des candidatures:</strong> ${sommeCandidatures}
    `;

    // Créer une popup à la position du cluster
    const popup = L.popup({
        closeButton: true,
        autoClose: true,
    })
        .setLatLng(cluster.layer.getLatLng())
        .setContent(popupContent)
        .openOn(this.map);
};

Map.ajouterLegende = async function() {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [0, 1, 3, 6];
        const labels = ['Aucune', '1-2', '3-5', '6+'];
        const colors = ['gray', 'blue', 'orange', 'red'];

        div.innerHTML += '<h4>Candidatures</h4>'

        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                `<i style="background:${colors[i]}; width: 18px; height: 18px; display: inline-block; border-radius: 50%; margin-right: 8px;"></i> ` +
                `${labels[i]}<br>`;
        }

        return div;
    };

    legend.addTo(this.map);
};

Map.ajouterControleFiltrage = async function() {
    const filtrerCandidatures = L.control({ position: 'topright' });

    filtrerCandidatures.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info filter');
        div.innerHTML = `
            <h4>Filtrer les candidatures</h4>
            <label><input type="checkbox" id="candidatures0" checked> 0</label><br>
            <label><input type="checkbox" id="candidatures1-2" checked> 1-2</label><br>
            <label><input type="checkbox" id="candidatures3-5" checked> 3-5</label><br>
            <label><input type="checkbox" id="candidatures6+" checked> 6+</label><br>
        `;
        return div;
    };

    filtrerCandidatures.addTo(this.map);
};

Map.ajouterEcouteursFiltres = async function(lycees, candidatures) {
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id.startsWith('candidatures')) {
            const filtre0 = document.getElementById('candidatures0').checked;
            const filtre1_2 = document.getElementById('candidatures1-2').checked;
            const filtre3_5 = document.getElementById('candidatures3-5').checked;
            const filtre6 = document.getElementById('candidatures6+').checked;

            // Re-ajouter les marqueurs en fonction des filtres
            this.ajouterMarqueursLycees(lycees, candidatures, { filtre0, filtre1_2, filtre3_5, filtre6 });
        }
    });
};

export { Map };
