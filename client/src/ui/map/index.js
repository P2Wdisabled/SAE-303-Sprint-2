import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { Coordonees } from "../../data/data-coordonees";
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import * as echarts from 'echarts';



let Map = {};

Map.map = null;
Map.markers = null;
Map._coordsData = null;
Map._lycees = null;
Map._candidaturesLycees = null;
Map._candidaturesPostBac = null;
Map._threshold = 3; 
Map._radius = 650; 
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
    let sommeCandidatures = { total: 0, generale: 0, STI2D: 0, autre: 0 };
    markers.forEach(marker => {
        if (marker.candidatures) {
            let cdata = Map.filteredCandidatureData(marker.candidatures);
            sommeCandidatures.g = cdata.generale;
            sommeCandidatures.S = cdata.STI2D;
            sommeCandidatures.a = cdata.autre;
            sommeCandidatures.total += cdata.total;
            sommeCandidatures.generale += cdata.generale;
            sommeCandidatures.STI2D += cdata.STI2D;
            sommeCandidatures.autre += cdata.autre;
        }
    });
    let sommePostBac = sommeCandidatures.total - sommeCandidatures.generale - sommeCandidatures.STI2D - sommeCandidatures.autre
    let popupContent = `
        <b>Cluster</b><br>
        <strong>Total des candidatures:</strong> ${sommeCandidatures.total}<br>
        <strong>Détails par Filière:</strong><br>
        &nbsp;&nbsp;Générale: ${sommeCandidatures.generale}<br>
        &nbsp;&nbsp;STI2D: ${sommeCandidatures.STI2D}<br>
        &nbsp;&nbsp;Autre: ${sommeCandidatures.autre}<br>
        &nbsp;&nbsp;Post-Bac: ${sommePostBac} (définir marker postbac)
    `;

    let popup = L.popup({
        closeButton: true,
        autoClose: true,
    })
    .setLatLng(cluster.layer.getLatLng())
    .setContent(popupContent)
    .openOn(Map.map);
};

Map.loadCoordsData = async function() {
    if (!Map._coordsData) {
        Map._coordsData = await fetch("./src/data/json/coordonees.json").then(r=>r.json());
    }
    return Map._coordsData;
};

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

Map.filteredCandidatureData = function(originalData) {
    let result = {total:0, generale:0, STI2D:0, autre:0};
    let isPostBac = originalData.isPostBac;

    // Récupérer l'état des catégories filières
    let filiereSelected = (Map._catFilters.generale || Map._catFilters.sti2d || Map._catFilters.autre);

    if (isPostBac) {
        if (Map._catFilters.postBac) {
            if (filiereSelected) {
                let g = Map._catFilters.generale ? originalData.generale : 0;
                let s = Map._catFilters.sti2d ? originalData.STI2D : 0;
                let a = Map._catFilters.autre ? originalData.autre : 0;
                let tot = g+s+a;
                result.total = tot;
                result.generale = g;
                result.STI2D = s;
                result.autre = a;
            } else {
                let tot = originalData.postbacCount || originalData.total;
                
                result.total = tot;
            }
        } else {
            result.total = 0;
        }
    } else {
        let g = Map._catFilters.generale ? originalData.generale : 0;
        let s = Map._catFilters.sti2d ? originalData.STI2D : 0;
        let a = Map._catFilters.autre ? originalData.autre : 0;
        let tot = g+s+a;
        result.total = tot;
        result.generale = g;
        result.STI2D = s;
        result.autre = a;
    }

    return result;
};


Map.ajouterMarqueursLycees = async function(lycees, candidatures, filtres = {}) {
    lycees.forEach(lycee => {
        let lat = parseFloat(lycee.latitude);
        let lng = parseFloat(lycee.longitude);
        let uai = lycee.numero_uai.toUpperCase();
        let originalData = candidatures[uai] || { total: 0, generale: 0, STI2D: 0, autre: 0 };
        originalData.isPostBac = false; 

        let dist = Coordonees.distanceVolDoiseau(Map._center.lat, Map._center.lng, lat, lng);
        if (dist > Map._radius) {
            return;
        }

        let cdata = Map.filteredCandidatureData(originalData);

        if (
            (cdata.total === 0 && !filtres.filtre0) ||
            (cdata.total >= 1 && cdata.total <= 2 && !filtres.filtre1_2) ||
            (cdata.total >= 3 && cdata.total <= 5 && !filtres.filtre3_5) ||
            (cdata.total >= 6 && !filtres.filtre6)
        ) {
            return;
        }

        if (cdata.total === 0) {
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
            console.warn(`Coordonnées invalides pour le lycée : ${lycee.appellation_officielle}`, lycee);
            return; // Ne pas créer de marqueur
        }
        let circleMarker = L.circleMarker([lat, lng], {
            radius: 6 + cdata.total,
            fillColor: couleur,
            color: couleur,
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        });

        // Stocker data filtrée + isPostBac
        cdata.isPostBac = false;
        circleMarker.candidatures = cdata;
        let sommePostBac = cdata.total - cdata.generale - cdata.STI2D - cdata.autre
    
        circleMarker.bindPopup(`
            <b>${lycee.appellation_officielle}</b><br>
            ${lycee.adresse_uai || 'Adresse non disponible'}<br>
            <strong>Candidatures Totales:</strong> ${cdata.total}<br>
            <strong>Détails par Filière:</strong><br>
            &nbsp;&nbsp;Générale: ${cdata.generale}<br>
            &nbsp;&nbsp;STI2D: ${cdata.STI2D}<br>
            &nbsp;&nbsp;Autre: ${cdata.autre}
            &nbsp;&nbsp;Post-Bac: ${sommePostBac} (définir marker postbac)
        `);

        Map.markers.addLayer(circleMarker);
    });
};

Map.ajouterMarqueursPostBac = async function(candidaturesPostBac, filtres = {}) {
    for (let dept in candidaturesPostBac) {
        let originalData = candidaturesPostBac[dept];
        originalData.isPostBac = true; // IT14

        let postalForMap = dept + "000";
        let coords = await Map.getCoordFromPostalCode(postalForMap);

        // Si pas de coords, fallback sur Limoges par exemple
        if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) {
            console.warn(`Aucune coordonnée valide pour ${postalForMap}. Utilisation du fallback centre.`);
            coords = {lat: Map._center.lat, lng: Map._center.lng};
        }

        let dist = Coordonees.distanceVolDoiseau(Map._center.lat, Map._center.lng, coords.lat, coords.lng);
        if (dist > Map._radius) {
            continue;
        }

        let cdata = Map.filteredCandidatureData(originalData);

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
        let sommePostBac = cdata.total - cdata.generale - cdata.STI2D - cdata.autre

        circleMarker.bindPopup(`
            <b>Post-Bac - Département ${dept}</b><br>
            <strong>Candidatures Totales:</strong> ${cdata.total}<br>
            <strong>Détails par Filière:</strong><br>
            &nbsp;&nbsp;Générale: ${cdata.generale}<br>
            &nbsp;&nbsp;STI2D: ${cdata.STI2D}<br>
            &nbsp;&nbsp;Autre: ${cdata.autre}<br>
            &nbsp;&nbsp;Post-Bac: ${sommePostBac} (définir marker postbac)
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

    await Map.ajouterMarqueursLycees(lycees, candidatures, { filtre0, filtre1_2, filtre3_5, filtre6 });
    await Map.ajouterMarqueursPostBac(candidaturesPostBac, { filtre0, filtre1_2, filtre3_5, filtre6 });

    Map.updateChart(lycees, candidatures, candidaturesPostBac);
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
        Map.updateChart(Map._lycees, Map._candidaturesLycees, Map._candidaturesPostBac);
    });
};

Map.ajouterControleRayon = function() {
    let slider = document.getElementById('radiusSlider');
    let radiusVal = document.getElementById('radiusValue');
    slider.addEventListener('input', (e) => {
        Map._radius = parseInt(e.target.value);
        radiusVal.textContent = Map._radius;
        Map.updateMarqueurs(Map._lycees, Map._candidaturesLycees, Map._candidaturesPostBac);
    });
};

// IT14: Ajouter écouteurs pour les catégories
Map.ajouterControleCategories = function() {
    let cats = ['catPostBac', 'catGenerale', 'catSTI2D', 'catAutre'];
    cats.forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            Map._catFilters.postBac = document.getElementById('catPostBac').checked;
            Map._catFilters.generale = document.getElementById('catGenerale').checked;
            Map._catFilters.sti2d = document.getElementById('catSTI2D').checked;
            Map._catFilters.autre = document.getElementById('catAutre').checked;
            Map.updateMarqueurs(Map._lycees, Map._candidaturesLycees, Map._candidaturesPostBac);
        });
    });
};

Map.updateChart = async function(lycees, candidaturesLycee, candidaturesPostBac) {
    let coordsData = await Map.loadCoordsData();
    let candidaturesParDept = {};

    // Pour les lycées
    for (let lycee of lycees) {
        let uai = lycee.numero_uai.toUpperCase();
        let originalData = candidaturesLycee[uai];
        if (!originalData) continue;
        originalData.isPostBac = false;

        let lat = parseFloat(lycee.latitude);
        let lng = parseFloat(lycee.longitude);
        let dist = Coordonees.distanceVolDoiseau(Map._center.lat, Map._center.lng, lat, lng);
        if (dist > Map._radius) continue;

        let cdata = Map.filteredCandidatureData(originalData);
        if (cdata.total > 0) {
            let dept = lycee.code_departement.substring(0,2);
            if (!candidaturesParDept[dept]) {
                candidaturesParDept[dept] = {postbac:0, generale:0, sti2d:0, autre:0, total:0};
            }
            // cdata représente déjà postbac? Non cdata.isPostBac=false => pas de postbac
            // Juste ajouter filières
            candidaturesParDept[dept].generale += cdata.generale;
            candidaturesParDept[dept].sti2d += cdata.STI2D;
            candidaturesParDept[dept].autre += cdata.autre;
            candidaturesParDept[dept].total += cdata.total;
        }
    }

    // Post-bac
    for (let dept in candidaturesPostBac) {
        let originalData = candidaturesPostBac[dept];
        originalData.isPostBac = true;
        let postalForMap = dept + "000";
        let coords = coordsData.find(c => c.code_postal === postalForMap);
        if (!coords) continue;
        let parts = coords._geopoint.split(",");
        let lat = parseFloat(parts[0]);
        let lng = parseFloat(parts[1]);

        let dist = Coordonees.distanceVolDoiseau(Map._center.lat, Map._center.lng, lat, lng);
        if (dist > Map._radius) continue;

        let cdata = Map.filteredCandidatureData(originalData);
        if (cdata.total > 0) {
            if (!candidaturesParDept[dept]) {
                candidaturesParDept[dept] = {postbac:0, generale:0, sti2d:0, autre:0, total:0};
            }
            candidaturesParDept[dept].postbac += cdata.total;
            candidaturesParDept[dept].generale += cdata.generale;
            candidaturesParDept[dept].sti2d += cdata.STI2D;
            candidaturesParDept[dept].autre += cdata.autre;
            candidaturesParDept[dept].total += cdata.total;
        }
    }

    let deptArray = Object.keys(candidaturesParDept).map(d => {
        let dd = candidaturesParDept[d];
        return {dept:d, ...dd};
    });

    deptArray.sort((a,b) => b.total - a.total);

    if (Map._threshold > 0) {
        let regroupes = {dept:"Autres", postbac:0, generale:0, sti2d:0, autre:0, total:0};
        let filteredArray = [];
        deptArray.forEach(item => {
            if (item.total <= Map._threshold) {
                regroupes.postbac += item.postbac;
                regroupes.generale += item.generale;
                regroupes.sti2d += item.sti2d;
                regroupes.autre += item.autre;
                regroupes.total += item.total;
            } else {
                filteredArray.push(item);
            }
        });
        if (regroupes.total > 0) {
            filteredArray.push(regroupes);
        }
        deptArray = filteredArray;
    }

    let depts = deptArray.map(d => d.dept);
    let series = [];
    let legend = [];

    function addSeriesIfChecked(name, field) {
        let selected = false;
        if (name === 'Post-bac') selected = Map._catFilters.postBac;
        else if (name === 'Générale') selected = Map._catFilters.generale;
        else if (name === 'STI2D') selected = Map._catFilters.sti2d;
        else if (name === 'Autre') selected = Map._catFilters.autre;
        if (selected) {
            series.push({
                name: name,
                type: 'bar',
                stack: 'total',
                data: deptArray.map(d => d[field])
            });
            legend.push(name);
        }
    }

    addSeriesIfChecked('Post-bac', 'postbac');
    addSeriesIfChecked('Générale', 'generale');
    addSeriesIfChecked('STI2D', 'sti2d');
    addSeriesIfChecked('Autre', 'autre');

    let chartDom = document.getElementById('chartContainer');
    let myChart = echarts.init(chartDom);

    let option = {
        title: {
            text: 'Candidatures par Département',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {type: 'shadow'}
        },
        legend: {
            bottom: '0',
            data: legend
        },
        grid: {
            left: '3%', right: '4%', bottom: '10%', containLabel: true
        },
        xAxis: {
            type: 'value',
            boundaryGap: [0, 0.01]
        },
        yAxis: {
            type: 'category',
            data: depts
        },
        series: series
    };

    myChart.setOption(option);
};

export { Map };
