import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import * as echarts from 'echarts';

// Distance "à vol d'oiseau" entre 2 points géographiques
function distanceVolDoiseau(lat_a, lon_a, lat_b, lon_b) {
    let a = Math.PI / 180;
    let lat1 = lat_a * a;
    let lat2 = lat_b * a;
    let lon1 = lon_a * a;
    let lon2 = lon_b * a;

    let t1 = Math.sin(lat1)*Math.sin(lat2);
    let t2 = Math.cos(lat1)*Math.cos(lat2);
    let t3 = Math.cos(lon1 - lon2);
    let t4 = t2*t3;
    let t5 = t1+t4;
    let rad_dist = Math.atan(-t5/Math.sqrt(-t5 * t5 +1)) + 2 * Math.atan(1);

    return (rad_dist * 3437.74677 * 1.1508) * 1.6093470878864446;
}

let Map = {};

Map.map = null;
Map.markers = null;
Map._coordsData = null;
Map._lycees = null;
Map._candidaturesLycees = null;
Map._candidaturesPostBac = null;
Map._threshold = 3; 
Map._radius = 10; // IT13: rayon par défaut
Map._center = {lat:45.8336, lng:1.2611}; // Centre Limoges

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
    Map.ajouterControleRayon(); // IT13: ajouter écouteur sur le slider de rayon

    Map.updateMarqueurs(Map._lycees, Map._candidaturesLycees, Map._candidaturesPostBac);
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

Map.ajouterMarqueursLycees = async function(lycees, candidatures, filtres = {}) {
    lycees.forEach(lycee => {
        let lat = parseFloat(lycee.latitude);
        let lng = parseFloat(lycee.longitude);
        let uai = lycee.numero_uai.toUpperCase();
        let candidatureData = candidatures[uai] || { total: 0, generale: 0, STI2D: 0, autre: 0 };

        // Filtre rayon : calcul de la distance depuis Limoges
        let dist = distanceVolDoiseau(Map._center.lat, Map._center.lng, lat, lng);
        if (dist > Map._radius) {
            return; // hors rayon
        }

        // Filtres de candidatures
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

Map.ajouterMarqueursPostBac = async function(candidaturesPostBac, filtres = {}) {
    for (let dept in candidaturesPostBac) {
        let cdata = candidaturesPostBac[dept];

        let postalForMap = dept + "000";
        let coords = await Map.getCoordFromPostalCode(postalForMap);
        if (!coords) continue; 
        if (isNaN(coords.lat) || isNaN(coords.lng)) {
            console.warn(`Coordonnées invalides pour ${postalForMap}`, coords);
            continue;
        }

        // Filtre rayon
        let dist = distanceVolDoiseau(Map._center.lat, Map._center.lng, coords.lat, coords.lng);
        if (dist > Map._radius) {
            continue;
        }

        // Filtres
        if (
            (cdata.total === 0 && !filtres.filtre0) ||
            (cdata.total >= 1 && cdata.total <= 2 && !filtres.filtre1_2) ||
            (cdata.total >= 3 && cdata.total <= 5 && !filtres.filtre3_5) ||
            (cdata.total >= 6 && !filtres.filtre6)
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

        circleMarker.candidatures = cdata;
        circleMarker.bindPopup(`
            <b>Post-Bac - Département ${dept}</b><br>
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

// IT13: Ajouter un contrôle pour le rayon
Map.ajouterControleRayon = function() {
    let slider = document.getElementById('radiusSlider');
    let radiusVal = document.getElementById('radiusValue');
    slider.addEventListener('input', (e) => {
        Map._radius = parseInt(e.target.value);
        radiusVal.textContent = Map._radius;
        Map.updateMarqueurs(Map._lycees, Map._candidaturesLycees, Map._candidaturesPostBac);
    });
};

Map.updateChart = async function(lycees, candidaturesLycee, candidaturesPostBac) {
    // Filtrage par rayon pour la partie chart également
    // Il faut filtrer les lycées et post-bac par distance avant d'agréger.
    let coordsData = await Map.loadCoordsData();

    // Créer une map {dept -> données} comme avant, mais seulement pour ceux dans le rayon
    let candidaturesParDept = {};

    // Pour les lycées
    for (let lycee of lycees) {
        let uai = lycee.numero_uai.toUpperCase();
        let data = candidaturesLycee[uai];
        if (!data) continue;

        let lat = parseFloat(lycee.latitude);
        let lng = parseFloat(lycee.longitude);

        // Filtre par rayon
        let dist = distanceVolDoiseau(Map._center.lat, Map._center.lng, lat, lng);
        if (dist > Map._radius) continue;

        let dept = lycee.code_departement.substring(0,2);
        if (!candidaturesParDept[dept]) {
            candidaturesParDept[dept] = {postbac:0, generale:0, sti2d:0, autre:0};
        }
        candidaturesParDept[dept].generale += data.generale;
        candidaturesParDept[dept].sti2d += data.STI2D;
        candidaturesParDept[dept].autre += data.autre;
    }

    // Post-bac
    for (let dept in candidaturesPostBac) {
        let data = candidaturesPostBac[dept];
        let postalForMap = dept + "000";
        let coords = coordsData.find(c => c.code_postal === postalForMap);
        if (!coords) continue;
        let parts = coords._geopoint.split(",");
        let lat = parseFloat(parts[0]);
        let lng = parseFloat(parts[1]);

        let dist = distanceVolDoiseau(Map._center.lat, Map._center.lng, lat, lng);
        if (dist > Map._radius) continue;

        if (!candidaturesParDept[dept]) {
            candidaturesParDept[dept] = {postbac:0, generale:0, sti2d:0, autre:0};
        }
        candidaturesParDept[dept].postbac += data.total;
    }

    // Convertir en tableau
    let deptArray = Object.keys(candidaturesParDept).map(d => {
        let dd = candidaturesParDept[d];
        let total = dd.postbac + dd.generale + dd.sti2d + dd.autre;
        return {dept:d, ...dd, total};
    });

    // Tri décroissant par total
    deptArray.sort((a,b) => b.total - a.total);

    // Regroupement sous le seuil
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
    let postbacData = deptArray.map(d => d.postbac);
    let generaleData = deptArray.map(d => d.generale);
    let sti2dData = deptArray.map(d => d.sti2d);
    let autreData = deptArray.map(d => d.autre);

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
            data: ['Post-bac', 'Générale', 'STI2D', 'Autre']
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
        series: [
            {
                name: 'Post-bac',
                type: 'bar',
                stack: 'total',
                data: postbacData
            },
            {
                name: 'Générale',
                type: 'bar',
                stack: 'total',
                data: generaleData
            },
            {
                name: 'STI2D',
                type: 'bar',
                stack: 'total',
                data: sti2dData
            },
            {
                name: 'Autre',
                type: 'bar',
                stack: 'total',
                data: autreData
            }
        ]
    };

    myChart.setOption(option);
};

export { Map };
