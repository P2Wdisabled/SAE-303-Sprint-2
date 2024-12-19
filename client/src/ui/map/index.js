// ./src/ui/map/index.js

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Coordonees } from "../../data/data-coordonees";
import { Charts } from "../charts/index";
import { Candidats } from "../../data/data-candidats.js";
import 'leaflet.markercluster';

let Map = {};

Map.map = null;
Map.markers = null;
Map.circle = null; // Propriété pour le cercle
Map._coordsData = Coordonees.getAll();
Map._lycees = null;
Map._candidaturesLycees = null;
Map._candidaturesPostBac = null;
Map._threshold = 3; 
Map._radius = 650; // Rayon en kilomètres
Map._center = {lat:45.8336, lng:1.2611};

Map._catFilters = {
    postBac: true,
    generale: true,
    sti2d: true,
    autre: true
};

Map.init = async function(containerId, lycees, candidaturesParLycee, candidaturesPostBac) {
    Map._lycees = lycees;
    Map._candidaturesLycees = candidaturesParLycee;
    Map._candidaturesPostBac = candidaturesPostBac;

    Map.map = L.map(containerId).setView([Map._center.lat, Map._center.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(Map.map);

    // Ajout du cercle représentant le rayon (converti en mètres)
    Map.circle = L.circle(Map._center, {
        radius: Map._radius * 1000, // Conversion de kilomètres en mètres
        color: 'blue',               // Couleur du contour du cercle
        fill: false,                 // Pas de remplissage
        dashArray: '4',              // Style des tirets du contour
        weight: 2                    // Épaisseur du contour
    }).addTo(Map.map);

    Map.markers = L.markerClusterGroup({
        zoomToBoundsOnClick: false,
    });

    Map.markers.on('clusterclick', Map.onClusterClick.bind(this));
    Map.map.addLayer(Map.markers);

    Map.ajouterLegende();
    Map.ajouterControleFiltrage();
    Map.ajouterEcouteursFiltres(Map._lycees, Map._candidaturesLycees, Map._candidaturesPostBac);
    Map.ajouterControleSeuil();
    Map.ajouterControleRayon();
    Map.ajouterControleCategories();

    Map.updateMarqueurs(Map._lycees, Map._candidaturesLycees, Map._candidaturesPostBac);
};

Map.onClusterClick = function(cluster) {
    let markers = cluster.layer.getAllChildMarkers();
    let sommeCandidatures = { total: 0, generale: 0, STI2D: 0, autre: 0, postbacCount: 0};
    markers.forEach(marker => {
        if (marker.candidatures) {
            let cdata = Candidats.filteredCandidatureData(marker.candidatures, Map);
            sommeCandidatures.total += cdata.total;
            sommeCandidatures.generale += cdata.generale;
            sommeCandidatures.STI2D += cdata.STI2D;
            sommeCandidatures.autre += cdata.autre;
            sommeCandidatures.postbacCount += cdata.postbacCount;
        }
    });
    let popupContent = `
        <b>Cluster</b><br>
        <strong>Total des candidatures:</strong> ${sommeCandidatures.total}<br>
        <strong>Détails par Filière:</strong><br>
        &nbsp;&nbsp;Générale: ${sommeCandidatures.generale}<br>
        &nbsp;&nbsp;STI2D: ${sommeCandidatures.STI2D}<br>
        &nbsp;&nbsp;Autre: ${sommeCandidatures.autre}<br>
        &nbsp;&nbsp;Post-Bac: ${sommeCandidatures.postbacCount}
    `;

    let popup = L.popup({
        closeButton: true,
        autoClose: true,
    })
    .setLatLng(cluster.layer.getLatLng())
    .setContent(popupContent)
    .openOn(Map.map);
};

Map.ajouterMarqueursLycees = async function(lycees, candidatures, filtres = {}) {
    lycees.forEach(lycee => {
        let lat = parseFloat(lycee.latitude);
        let lng = parseFloat(lycee.longitude);
        let uai = lycee.numero_uai.toUpperCase();
        let originalData = candidatures[uai] || { total: 0, generale: 0, STI2D: 0, autre: 0 };
        originalData.isPostBac = false; 

        let dist = Coordonees.distanceVolDoiseau(Map._center.lat, Map._center.lng, lat, lng); // Distance en kilomètres
        if (dist > Map._radius) {
            return;
        }

        let cdata = Candidats.filteredCandidatureData(originalData, Map);

        if (
            (cdata.total >= 1 && cdata.total <= 2 && !filtres.filtre1_2) ||
            (cdata.total >= 3 && cdata.total <= 5 && !filtres.filtre3_5) ||
            (cdata.total >= 6 && !filtres.filtre6)
        ) {
            return;
        }

        if (cdata.total === 0) {
            return; 
        }

        // Appliquer les filtres de catégorie
        if (
            (cdata.generale > 0 && !Map._catFilters.generale) ||
            (cdata.STI2D > 0 && !Map._catFilters.sti2d) ||
            (cdata.autre > 0 && !Map._catFilters.autre)
        ) {
            return;
        }

        let couleur;
        if (cdata.total === 0) {
            couleur = 'gray';
        } else if (cdata.total <= 2) {
            couleur = 'blue';
        } else if (cdata.total <= 5) {
            couleur = 'orange';
        } else {
            couleur = 'red';
        }
        
        // Vérifier que lat et lng sont valides
        if (isNaN(lat) || isNaN(lng)) {
            return;
        }
        let circleMarker = L.circleMarker([lat, lng], {
            radius: 6 + cdata.total,
            fillColor: couleur,
            color: couleur,
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        });

        cdata.isPostBac = false;
        circleMarker.candidatures = cdata;
    
        circleMarker.bindPopup(`
            <b>${lycee.appellation_officielle}</b><br>
            ${lycee.adresse_uai || 'Adresse non disponible'}<br>
            <strong>Candidatures Totales:</strong> ${cdata.total}<br>
            <strong>Détails par Filière:</strong><br>
            &nbsp;&nbsp;Générale: ${cdata.generale}<br>
            &nbsp;&nbsp;STI2D: ${cdata.STI2D}<br>
            &nbsp;&nbsp;Autre: ${cdata.autre}<br>
            &nbsp;&nbsp;Post-Bac: ${cdata.postbacCount}
        `);

        Map.markers.addLayer(circleMarker);
    });
};

Map.ajouterMarqueursPostBac = async function(candidaturesPostBac, filtres = {}) {
    for (let dept in candidaturesPostBac) {
        let originalData = candidaturesPostBac[dept];
        originalData.isPostBac = true; // IT14

        let postalForMap = dept + "000";
        let coords = await Coordonees.getCoordFromPostalCode(postalForMap, Map._coordsData);

        // Si pas de coords, ne pas afficher
        if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) {
            continue;
        }

        let dist = Coordonees.distanceVolDoiseau(Map._center.lat, Map._center.lng, coords.lat, coords.lng); // Distance en kilomètres
        if (dist > Map._radius) {
            continue;
        }

        let cdata = Candidats.filteredCandidatureData(originalData, Map);

        if (
            (cdata.total === 0 && !filtres.filtre0) ||
            (cdata.total >= 1 && cdata.total <= 2 && !filtres.filtre1_2) ||
            (cdata.total >= 3 && cdata.total <= 5 && !filtres.filtre3_5) ||
            (cdata.total >= 6 && !filtres.filtre6)
        ) {
            continue;
        }

        if (cdata.total === 0) {
            continue;
        }

        // Appliquer les filtres de catégorie
        if (
            (cdata.postbacCount > 0 && !Map._catFilters.postBac)
        ) {
            continue;
        }

        let couleur;
        if (cdata.total === 0) {
            couleur = 'gray';
        } else if (cdata.total <= 2) {
            couleur = 'green';
        } else if (cdata.total <= 5) {
            couleur = 'darkgreen';
        } else {
            couleur = 'purple';
        }

        let circleMarker = L.circleMarker([coords.lat, coords.lng], {
            radius: 6 + cdata.total,
            fillColor: couleur,
            color: couleur,
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        });

        cdata.isPostBac = true;
        circleMarker.candidatures = cdata;

        circleMarker.bindPopup(`
            <b>Post-Bac - Département ${dept}</b><br>
            <strong>Candidatures Totales:</strong> ${cdata.total}<br>
            <strong>Détails par Filière:</strong><br>
            &nbsp;&nbsp;Générale: ${cdata.generale}<br>
            &nbsp;&nbsp;STI2D: ${cdata.STI2D}<br>
            &nbsp;&nbsp;Autre: ${cdata.autre}<br>
            &nbsp;&nbsp;Post-Bac: ${cdata.postbacCount}
        `);

        Map.markers.addLayer(circleMarker);
    }
};

Map.ajouterLegende = async function() {
    let legend = L.control({ position: 'bottomright' });
    legend.onAdd = function (map) {
        let div = L.DomUtil.create('div', 'info legend');
        let grades = [0, 1, 3, 6];
        let labels = ['Aucune', '1-2', '3-5', '6+'];
        let colors = ['gray', 'blue', 'orange', 'red'];

        div.innerHTML += '<h4>Candidatures (Lycées)</h4>';
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                `<i style="background:${colors[i]}; width:18px; height:18px; display:inline-block; border-radius:50%; margin-right:8px;"></i> ` +
                `${labels[i]}<br>`;
        }

        div.innerHTML += '<hr><h4>Post-Bac</h4>';
        div.innerHTML += '<i style="background:green; width:18px; height:18px; display:inline-block; border-radius:50%; margin-right:8px;"></i> Peu<br>';
        div.innerHTML += '<i style="background:darkgreen; width:18px; height:18px; display:inline-block; border-radius:50%; margin-right:8px;"></i> Moyenne<br>';
        div.innerHTML += '<i style="background:purple; width:18px; height:18px; display:inline-block; border-radius:50%; margin-right:8px;"></i> Nombreux<br>';

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
            <label><input type="checkbox" id="candidatures1-2" checked> 1-2</label><br>
            <label><input type="checkbox" id="candidatures3-5" checked> 3-5</label><br>
            <label><input type="checkbox" id="candidatures6+" checked> 6+</label><br>
        `;
        return div;
    };

    filtrerCandidatures.addTo(Map.map);
};

Map.updateMarqueurs = async function(lycees, candidatures, candidaturesPostBac) {
    let filtre1_2 = document.getElementById('candidatures1-2').checked;
    let filtre3_5 = document.getElementById('candidatures3-5').checked;
    let filtre6 = document.getElementById('candidatures6+').checked;

    if (Map.markers) {
        Map.markers.clearLayers();
    }

    await Map.ajouterMarqueursLycees(lycees, candidatures, { filtre1_2, filtre3_5, filtre6 });
    await Map.ajouterMarqueursPostBac(candidaturesPostBac, { filtre1_2, filtre3_5, filtre6 });

    Charts.updateChart(lycees, candidatures, candidaturesPostBac, Map);
};

Map.ajouterEcouteursFiltres = async function(lycees, candidatures, candidaturesPostBac) {
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id.startsWith('candidatures')) {
            Map.updateMarqueurs(lycees, candidatures, candidaturesPostBac);
        }
    });
};

Map.ajouterControleSeuil = function() {
    let slider = document.getElementById('thresholdSlider');
    let thresholdVal = document.getElementById('thresholdValue');
    slider.addEventListener('input', (e) => {
        Map._threshold = parseInt(e.target.value);
        thresholdVal.textContent = Map._threshold;
        Charts.updateChart(Map._lycees, Map._candidaturesLycees, Map._candidaturesPostBac, Map);
    });
};

Map.ajouterControleRayon = function() {
    let slider = document.getElementById('radiusSlider');
    let radiusVal = document.getElementById('radiusValue');
    slider.addEventListener('input', (e) => {
        Map._radius = parseInt(e.target.value); // Rayon en kilomètres
        radiusVal.textContent = Map._radius;

        // Mettre à jour le rayon du cercle sur la carte (conversion en mètres)
        if (Map.circle) {
            Map.circle.setRadius(Map._radius * 1000); // Conversion en mètres
        }

        // Mettre à jour les marqueurs en fonction du nouveau rayon
        Map.updateMarqueurs(Map._lycees, Map._candidaturesLycees, Map._candidaturesPostBac);
    });
};

Map.ajouterControleCategories = function() {
    let cats = ['catPostBac', 'catGenerale', 'catSTI2D', 'catAutre'];
    cats.forEach(id => {
        let element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', (e) => {
                Map._catFilters.postBac = document.getElementById('catPostBac').checked;
                Map._catFilters.generale = document.getElementById('catGenerale').checked;
                Map._catFilters.sti2d = document.getElementById('catSTI2D').checked;
                Map._catFilters.autre = document.getElementById('catAutre').checked;
                Map.updateMarqueurs(Map._lycees, Map._candidaturesLycees, Map._candidaturesPostBac);
            });
        }
    });
};

export { Map };
