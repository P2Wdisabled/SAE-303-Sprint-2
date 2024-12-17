// src/ui/map/index.js

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

// Cette variable doit être remplie à partir du coordonees.json au besoin
// On le fera à la demande (lazy loading)
let Map = {};

Map.map = null;
Map.markers = null;
Map._coordsData = null; // IT10 : pour stocker les données de coordonees

Map.init = async function(containerId, lycees, candidaturesParLycee, candidaturesPostBac) {
    Map.map = L.map(containerId).setView([45.8336, 1.2611], 13); // Centrer sur Limoges

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(Map.map);

    Map.markers = L.markerClusterGroup({
        zoomToBoundsOnClick: false,
    });

    Map.markers.on('clusterclick', Map.onClusterClick.bind(this));
    Map.map.addLayer(Map.markers);

    Map.ajouterLegende();
    Map.ajouterControleFiltrage();
    Map.ajouterEcouteursFiltres(lycees, candidaturesParLycee, candidaturesPostBac);

    // Afficher les marqueurs (lycées et post-bac)
    Map.updateMarqueurs(lycees, candidaturesParLycee, candidaturesPostBac);
};

Map.onClusterClick = function(cluster) {
    let markers = cluster.layer.getAllChildMarkers();
    let sommeCandidatures = { total: 0, generale: 0, STI2D: 0, autre: 0 };
    markers.forEach(marker => {
        if (marker.candidatures) {
            sommeCandidatures.total += marker.candidatures.total;
            sommeCandidatures.generale += marker.candidatures.generale;
            sommeCandidatures.STI2D += marker.candidatures.STI2D;
            sommeCandidatures.autre += marker.candidatures.autre;
        }
    });

    let popupContent = `
        <b>Cluster</b><br>
        <strong>Total des candidatures:</strong> ${sommeCandidatures.total}<br>
        <strong>Détails par Filière:</strong><br>
        &nbsp;&nbsp;Générale: ${sommeCandidatures.generale}<br>
        &nbsp;&nbsp;STI2D: ${sommeCandidatures.STI2D}<br>
        &nbsp;&nbsp;Autre: ${sommeCandidatures.autre}
    `;

    let popup = L.popup({
        closeButton: true,
        autoClose: true,
    })
    .setLatLng(cluster.layer.getLatLng())
    .setContent(popupContent)
    .openOn(Map.map);
};

// IT10 : fonction pour charger coordonees.json si pas déjà fait
Map.loadCoordsData = async function() {
    if (!Map._coordsData) {
        Map._coordsData = await fetch("./src/data/json/coordonees.json").then(r=>r.json());
    }
    return Map._coordsData;
};

// IT10 : fonction pour obtenir les coordonnées d'un code postal (type "45000")
Map.getCoordFromPostalCode = async function(cp) {
    let data = await Map.loadCoordsData();
    for (let c of data) {
        if (c.code_postal === cp) {
            let parts = c._geopoint.split(",");
            return {lat: parseFloat(parts[0]), lng: parseFloat(parts[1])};
        }
    }
    return null;
};

Map.ajouterMarqueursLycees = async function(lycees, candidatures, filtres = {}) {
    // Effacer les anciens marqueurs déjà fait dans updateMarqueurs
    // Ici on ajoute uniquement les lycées
    lycees.forEach(lycee => {
        let lat = parseFloat(lycee.latitude);
        let lng = parseFloat(lycee.longitude);
        let uai = lycee.numero_uai.toUpperCase();
        let candidatureData = candidatures[uai] || { total: 0, generale: 0, STI2D: 0, autre: 0 };

        // Application des filtres
        if (
            (candidatureData.total === 0 && !filtres.filtre0) ||
            (candidatureData.total >= 1 && candidatureData.total <= 2 && !filtres.filtre1_2) ||
            (candidatureData.total >= 3 && candidatureData.total <= 5 && !filtres.filtre3_5) ||
            (candidatureData.total >= 6 && !filtres.filtre6)
        ) {
            return;
        }

        if (!isNaN(lat) && !isNaN(lng)) {
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

            let circleMarker = L.circleMarker([lat, lng], {
                radius: 6 + candidatureData.total,
                fillColor: couleur,
                color: couleur,
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });

            circleMarker.candidatures = candidatureData;
            circleMarker.bindPopup(`
                <b>${lycee.appellation_officielle}</b><br>
                ${lycee.adresse_uai || 'Adresse non disponible'}<br>
                <strong>Candidatures Totales:</strong> ${candidatureData.total}<br>
                <strong>Détails par Filière:</strong><br>
                &nbsp;&nbsp;Générale: ${candidatureData.generale}<br>
                &nbsp;&nbsp;STI2D: ${candidatureData.STI2D}<br>
                &nbsp;&nbsp;Autre: ${candidatureData.autre}
            `);

            Map.markers.addLayer(circleMarker);
        }
    });
};

// IT10 : nouvelle fonction pour ajouter les marqueurs post-bac
Map.ajouterMarqueursPostBac = async function(candidaturesPostBac, filtres = {}) {
    for (let deptCp in candidaturesPostBac) {
        let cdata = candidaturesPostBac[deptCp];
        // Filtres
        if (
            (cdata.total === 0 && !filtres.filtre0) ||
            (cdata.total >= 1 && cdata.total <= 2 && !filtres.filtre1_2) ||
            (cdata.total >= 3 && cdata.total <= 5 && !filtres.filtre3_5) ||
            (cdata.total >= 6 && !filtres.filtre6)
        ) {
            continue;
        }

        let coords = await Map.getCoordFromPostalCode(deptCp);
        if (!coords) continue; 

        // Couleurs différentes pour post-bac
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

        circleMarker.candidatures = cdata;
        circleMarker.bindPopup(`
            <b>Post-Bac - ${deptCp}</b><br>
            <strong>Candidatures Totales:</strong> ${cdata.total}<br>
            <strong>Détails par Filière:</strong><br>
            &nbsp;&nbsp;Générale: ${cdata.generale}<br>
            &nbsp;&nbsp;STI2D: ${cdata.STI2D}<br>
            &nbsp;&nbsp;Autre: ${cdata.autre}
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
                `<i style="background:${colors[i]}; width: 18px; height: 18px; display: inline-block; border-radius: 50%; margin-right: 8px;"></i> ` +
                `${labels[i]}<br>`;
        }

        // IT10 : On peut aussi ajouter une légende pour post-bac
        div.innerHTML += '<hr><h4>Post-Bac</h4>';
        div.innerHTML += '<i style="background:green; width:18px; height:18px; display:inline-block; border-radius:50%; margin-right:8px;"></i> Peu de candidats<br>';
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
            <label><input type="checkbox" id="candidatures0"> 0</label><br>
            <label><input type="checkbox" id="candidatures1-2" checked> 1-2</label><br>
            <label><input type="checkbox" id="candidatures3-5" checked> 3-5</label><br>
            <label><input type="checkbox" id="candidatures6+" checked> 6+</label><br>
        `;
        return div;
    };

    filtrerCandidatures.addTo(Map.map);
};

Map.updateMarqueurs = async function(lycees, candidatures, candidaturesPostBac) {
    let filtre0 = document.getElementById('candidatures0').checked;
    let filtre1_2 = document.getElementById('candidatures1-2').checked;
    let filtre3_5 = document.getElementById('candidatures3-5').checked;
    let filtre6 = document.getElementById('candidatures6+').checked;

    if (Map.markers) {
        Map.markers.clearLayers();
    }

    // Ré-ajouter les marqueurs
    await Map.ajouterMarqueursLycees(lycees, candidatures, { filtre0, filtre1_2, filtre3_5, filtre6 });
    await Map.ajouterMarqueursPostBac(candidaturesPostBac, { filtre0, filtre1_2, filtre3_5, filtre6 });
};

Map.ajouterEcouteursFiltres = async function(lycees, candidatures, candidaturesPostBac) {
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id.startsWith('candidatures')) {
            Map.updateMarqueurs(lycees, candidatures, candidaturesPostBac);
        }
    });
};

export { Map };
