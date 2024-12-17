// src/ui/map/index.js

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

//import './map.css'; // Si vous avez des styles spécifiques pour la carte

let Map = {};

Map.map = null;
Map.markers = null;

Map.init = async function(containerId, lycees, candidatures, filtres = {}) {
    Map.map = L.map(containerId).setView([45.8336, 1.2611], 13); // Centrer sur Limoges

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(Map.map);

    // Initialiser le groupe de clusters avec `zoomToBoundsOnClick` désactivé
    Map.markers = L.markerClusterGroup({
        zoomToBoundsOnClick: false, // Désactiver le zoom automatique sur le clic du cluster
    });

    // Ajouter l'écouteur d'événements pour les clusters
    Map.markers.on('clusterclick', Map.onClusterClick.bind(this));

    // Ajouter le groupe de clusters à la carte
    Map.map.addLayer(Map.markers);

    // Ajouter les marqueurs des lycées avec les candidatures
    Map.ajouterMarqueursLycees(lycees, candidatures, filtres);

    // Ajouter la légende
    Map.ajouterLegende();

    // Ajouter le contrôle de filtrage
    Map.ajouterControleFiltrage();

    // Ajouter des écouteurs d'événements pour les filtres
    Map.ajouterEcouteursFiltres(lycees, candidatures);

    Map.updateMarqueursLycees(lycees, candidatures);
};

Map.ajouterMarqueursLycees = async function(lycees, candidatures, filtres = {}) {
    // Effacer les anciens marqueurs
    if (Map.markers) {
        Map.markers.clearLayers();
    }

    lycees.forEach(lycee => {
        let lat = parseFloat(lycee.latitude);
        let lng = parseFloat(lycee.longitude);
        let uai = lycee.numero_uai.toUpperCase();
        let candidatureData = candidatures[uai] || { total: 0, generale: 0, STI2D: 0, autre: 0 };

        // Appliquer les filtres basés sur le nombre total de candidatures
        if (
            (candidatureData.total === 0 && !filtres.filtre0) ||
            (candidatureData.total >= 1 && candidatureData.total <= 2 && !filtres.filtre1_2) ||
            (candidatureData.total >= 3 && candidatureData.total <= 5 && !filtres.filtre3_5) ||
            (candidatureData.total >= 6 && !filtres.filtre6)
        ) {
            return; // Ne pas ajouter ce marqueur
        }

        if (!isNaN(lat) && !isNaN(lng)) {
            // Définir une couleur basée sur le nombre total de candidatures
            let couleur;
            if (candidatureData.total === 0) {
                couleur = 'gray';
            } else if (candidatureData.total <= 2) {
                couleur = 'blue';
            } else if (candidatureData.total <= 5) {
                couleur = 'orange';
            } else {
                couleur = 'red';
            }

            // Créer un cercle personnalisé
            let circleMarker = L.circleMarker([lat, lng], {
                radius: 6 + candidatureData.total, // Taille du marqueur
                fillColor: couleur,
                color: couleur,
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });

            // Stocker les données de candidatures dans le marqueur
            circleMarker.candidatures = candidatureData;

            // Ajouter la popup avec les détails des filières
            circleMarker.bindPopup(`
                <b>${lycee.appellation_officielle}</b><br>
                ${lycee.adresse_uai || 'Adresse non disponible'}<br>
                <strong>Candidatures Totales:</strong> ${candidatureData.total}<br>
                <strong>Détails par Filière:</strong><br>
                &nbsp;&nbsp;Générale: ${candidatureData.generale}<br>
                &nbsp;&nbsp;STI2D: ${candidatureData.STI2D}<br>
                &nbsp;&nbsp;Autre: ${candidatureData.autre}
            `);

            // Ajouter le marqueur au groupe de clusters
            Map.markers.addLayer(circleMarker);
        }
    });
};

// Nouvelle méthode pour gérer les clics sur les clusters
Map.onClusterClick = function(cluster) {
    // Récupérer tous les marqueurs enfants du cluster
    let markers = cluster.layer.getAllChildMarkers();

    // Calculer la somme des candidatures
    let sommeCandidatures = { total: 0, generale: 0, STI2D: 0, autre: 0 };
    markers.forEach(marker => {
        if (marker.candidatures) {
            sommeCandidatures.total += marker.candidatures.total;
            sommeCandidatures.generale += marker.candidatures.generale;
            sommeCandidatures.STI2D += marker.candidatures.STI2D;
            sommeCandidatures.autre += marker.candidatures.autre;
        }
    });

    // Créer le contenu de la popup
    let popupContent = `
        <b>Cluster</b><br>
        <strong>Total des candidatures:</strong> ${sommeCandidatures.total}<br>
        <strong>Détails par Filière:</strong><br>
        &nbsp;&nbsp;Générale: ${sommeCandidatures.generale}<br>
        &nbsp;&nbsp;STI2D: ${sommeCandidatures.STI2D}<br>
        &nbsp;&nbsp;Autre: ${sommeCandidatures.autre}
    `;

    // Créer une popup à la position du cluster
    let popup = L.popup({
        closeButton: true,
        autoClose: true,
    })
        .setLatLng(cluster.layer.getLatLng())
        .setContent(popupContent)
        .openOn(Map.map);
};

Map.ajouterLegende = async function() {
    let legend = L.control({ position: 'bottomright' });

    legend.onAdd = function (map) {
        let div = L.DomUtil.create('div', 'info legend');
        let grades = [0, 1, 3, 6];
        let labels = ['Aucune', '1-2', '3-5', '6+'];
        let colors = ['gray', 'blue', 'orange', 'red'];

        div.innerHTML += '<h4>Candidatures</h4>'

        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                `<i style="background:${colors[i]}; width: 18px; height: 18px; display: inline-block; border-radius: 50%; margin-right: 8px;"></i> ` +
                `${labels[i]}<br>`;
        }

        return div;
    };

    legend.addTo(Map.map);
};

Map.ajouterControleFiltrage = async function() {
    let filtrerCandidatures = L.control({ position: 'topright' });

    filtrerCandidatures.onAdd = function (map) {
        let div = L.DomUtil.create('div', 'info filter');
        div.innerHTML = `
            <h4>Filtrer les candidatures</h4>
            <label><input type="checkbox" id="candidatures0"> 0</label><br>
            <label><input type="checkbox" id="candidatures1-2" checked> 1-2</label><br>
            <label><input type="checkbox" id="candidatures3-5" checked> 3-5</label><br>
            <label><input type="checkbox" id="candidatures6+" checked> 6+</label><br>
        `;
        return div;
    };

    filtrerCandidatures.addTo(Map.map);
};

Map.updateMarqueursLycees = async function(lycees, candidatures) {
    let filtre0 = document.getElementById('candidatures0').checked;
    let filtre1_2 = document.getElementById('candidatures1-2').checked;
    let filtre3_5 = document.getElementById('candidatures3-5').checked;
    let filtre6 = document.getElementById('candidatures6+').checked;

    // Re-ajouter les marqueurs en fonction des filtres
    Map.ajouterMarqueursLycees(lycees, candidatures, { filtre0, filtre1_2, filtre3_5, filtre6 });
}

Map.ajouterEcouteursFiltres = async function(lycees, candidatures) {
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id.startsWith('candidatures')) {
            Map.updateMarqueursLycees(lycees, candidatures);
        }
    });
};

export { Map };
