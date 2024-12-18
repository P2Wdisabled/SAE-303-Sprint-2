import { Coordonees } from "./data-coordonees.js";
import { Candidats } from "./data-candidats.js";

let data = await fetch("./src/data/json/lycees.json");
data = await data.json();

let Lycees = {}

Lycees.getAll = function(){ 
    return data;
}

Lycees.filtercandidaturesParDept = function(lycees, candidaturesLycee, candidaturesPostBac, Map){
    let coordsData = Map._coordsData;
    let candidaturesParDept = {};
    for (let lycee of lycees) {
        let uai = lycee.numero_uai.toUpperCase();
        let originalData = candidaturesLycee[uai];
        if (!originalData) continue;
        originalData.isPostBac = false;

        let lat = parseFloat(lycee.latitude);
        let lng = parseFloat(lycee.longitude);
        let dist = Coordonees.distanceVolDoiseau(Map._center.lat, Map._center.lng, lat, lng);
        if (dist > Map._radius) continue;

        let cdata = Candidats.filteredCandidatureData(originalData, Map);
        if (cdata.total > 0) {
            let dept = lycee.code_departement.substring(0,2);
            if (!candidaturesParDept[dept]) {
                candidaturesParDept[dept] = {postbac:0, generale:0, sti2d:0, autre:0, total:0};
            }
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

        let cdata = Candidats.filteredCandidatureData(originalData, Map);
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
    
    return candidaturesParDept;
}

export { Lycees };