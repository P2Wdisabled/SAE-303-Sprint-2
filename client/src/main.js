// src/main.js

import { HeaderView } from "./ui/header/index.js";
import { Candidats } from "./data/data-candidats.js";
import { Lycees } from "./data/data-lycees.js";
import './index.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Importer le CSS de Leaflet

// Importer les CSS et JS de MarkerCluster
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

// Initialiser l'objet principal
let C = {};

// Fonction pour obtenir le dernier UAI d'une candidature
function getLatestUai(candidature) {
    // Itérer à partir du plus récent (code 0) jusqu'au plus ancien
    for (let i = 0; i < candidature.Scolarite.length; i++) {
        const scolarite = candidature.Scolarite[i];
        if (scolarite.UAIEtablissementorigine) {
            return scolarite.UAIEtablissementorigine.toUpperCase(); // Normaliser en majuscules
        }
    }
    return null;
}

// Fonction pour ajouter les marqueurs avec clustering
let ajouterMarqueursLycees = async function(map, lycees, candidatures, filtres = {}) {
    const markers = L.markerClusterGroup();

    lycees.forEach(lycee => {
        const lat = parseFloat(lycee.latitude);
        const lng = parseFloat(lycee.longitude);
        const uai = lycee.numero_uai.toUpperCase(); // Normaliser en majuscules
        const nombreCandidatures = candidatures[uai] || 0; // Par défaut 0 si aucune candidature

        // Appliquer les filtres
        if (
            (nombreCandidatures === 0 && !filtres.filtre0) ||
            (nombreCandidatures >=1 && nombreCandidatures <=2 && !filtres.filtre1_2) ||
            (nombreCandidatures >=3 && nombreCandidatures <=5 && !filtres.filtre3_5) ||
            (nombreCandidatures >=6 && !filtres.filtre6)
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

            // Ajouter la popup
            circleMarker.bindPopup(`
                <b>${lycee.appellation_officielle}</b><br>
                ${lycee.adresse_uai || 'Adresse non disponible'}<br>
                <strong>Candidatures:</strong> ${nombreCandidatures}
            `);

            // Ajouter le marqueur au groupe de clusters
            markers.addLayer(circleMarker);
        }
    });

    // Ajouter le groupe de clusters à la carte
    map.addLayer(markers);
}

// Fonction d'initialisation
C.init = async function(){
    V.init();
    let lyceesData = Lycees.getAll();
    let candidaturesData = Candidats.getAll();
    console.log("Candidatures:", candidaturesData);
    console.log("Lycées:", lyceesData);
    
    // Compter les candidatures par lycée
    const candidaturesParLycee = {};
    candidaturesData.forEach(candidature => {
        const uai = getLatestUai(candidature);
        if (uai) {
            if (candidaturesParLycee[uai]) {
                candidaturesParLycee[uai]++;
            } else {
                candidaturesParLycee[uai] = 1;
            }
        }
    });
    console.log("Candidatures par lycée:", candidaturesParLycee);

    // Initialiser la carte
    const map = L.map('map').setView([45.8336, 1.2611], 13); // Centré sur Limoges

    // Ajouter le tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Ajouter un marqueur de test (optionnel)
    const markerTest = L.marker([45.8336, 1.2611]).addTo(map);
    markerTest.bindPopup("<b>Limoges</b><br>Bienvenue à Limoges !").openPopup();

    // Ajouter les marqueurs des lycées avec les candidatures
    ajouterMarqueursLycees(map, lyceesData, candidaturesParLycee);

    // Ajouter la légende
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

    legend.addTo(map);

    // Ajouter un contrôle de filtrage
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

    filtrerCandidatures.addTo(map);

    // Ajouter des écouteurs d'événements pour les filtres
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id.startsWith('candidatures')) {
            const filtre0 = document.getElementById('candidatures0').checked;
            const filtre1_2 = document.getElementById('candidatures1-2').checked;
            const filtre3_5 = document.getElementById('candidatures3-5').checked;
            const filtre6 = document.getElementById('candidatures6+').checked;

            // Supprimer tous les clusters de marqueurs existants
            map.eachLayer(layer => {
                if (layer instanceof L.MarkerClusterGroup) {
                    map.removeLayer(layer);
                }
            });

            // Re-ajouter les marqueurs en fonction des filtres
            ajouterMarqueursLycees(map, lyceesData, candidaturesParLycee, { filtre0, filtre1_2, filtre3_5, filtre6 });
        }
    });
}

// Objet pour gérer l'interface utilisateur
let V = {
    header: document.querySelector("#header")
};

// Initialiser l'interface utilisateur
V.init = function(){
    V.renderHeader();
}

// Rendre le header
V.renderHeader= function(){
    V.header.innerHTML = HeaderView.render();
}

// Lancer l'initialisation
C.init();
