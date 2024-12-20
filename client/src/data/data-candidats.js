// ./src/data/data-candidats.js

import { Coordonees } from "./data-coordonees";

let data = await fetch("./src/data/json/candidatures.json");
data = await data.json();

let Candidats = {}

Candidats.getAll = function(){
    return data;
}

Candidats.getLatestUai = function(candidature) {
    for (let i = 0; i < candidature.Scolarite.length; i++) {
        let scolarite = candidature.Scolarite[i];
        if (scolarite.UAIEtablissementorigine) {
            return scolarite.UAIEtablissementorigine.toUpperCase();
        }
    }
    return null;
}

Candidats.filteredCandidatureData = function(originalData, Map) {
    let result = {total:0, generale:0, STI2D:0, autre:0, postbacCount:0};
    let isPostBac = originalData.isPostBac;

    // Récupérer l'état des catégories filières
    let filiereSelected = (Map._catFilters.generale || Map._catFilters.sti2d || Map._catFilters.autre);

    if (isPostBac) {
        // Marker post-bac
        if (Map._catFilters.postBac) {
                // Post-bac coché
                let tot = originalData.postbacCount || originalData.total;
                result.total = tot;
                result.generale = 0;
                result.STI2D = 0;
                result.autre = 0;
                result.postbacCount = tot;
        } else {
            // Post-bac non coché => rien
            result.total = 0;
            result.postbacCount = 0;
        }
    } else {
        // Lycée marker
        let g = Map._catFilters.generale ? originalData.generale : 0;
        let s = Map._catFilters.sti2d ? originalData.STI2D : 0;
        let a = Map._catFilters.autre ? originalData.autre : 0;
        let tot = g+s+a;
        result.total = tot;
        result.generale = g;
        result.STI2D = s;
        result.autre = a;
        result.postbacCount = 0;
    }

    return result;
};




Candidats.getFiliere = function(candidature) {
    if (candidature.Baccalaureat && candidature.Baccalaureat.SerieDiplomeCode) {
        const serie = candidature.Baccalaureat.SerieDiplomeCode.toUpperCase();
        if (serie === "STI2D") {
            return "STI2D";
        } else if (["S", "ES", "L", "GÉNÉRALE"].includes(serie)) {
            return "Générale";
        } else {
            return "Autre";
        }
    }
    return "Autre";
}

Candidats.isPostBac = function(candidature) {
    if (candidature.Baccalaureat && (candidature.Baccalaureat.TypeDiplomeCode === 1 || candidature.Baccalaureat.TypeDiplomeCode === 2)) {
        return true;
    }
    return false;
}

Candidats.getRecentCodePostal = function(candidature) {
    for (let i = 0; i < 2; i++) {
        if (candidature.Scolarite[i] && candidature.Scolarite[i].CommuneEtablissementOrigineCodePostal) {
            return candidature.Scolarite[i].CommuneEtablissementOrigineCodePostal;
        }
    }
    return null;
}


Candidats.aggregateCandidatures = function(candidaturesData) {
    let candidaturesParLycee = {};
    let candidaturesPostBacParDept = {};

    candidaturesData.forEach(candidature => {
        let filiere = Candidats.getFiliere(candidature);

        if (Candidats.isPostBac(candidature)) {
            let cp = Candidats.getRecentCodePostal(candidature);
            if (cp) {
                let dept = Coordonees.getDepartementFromCodePostal(cp);
                if (!candidaturesPostBacParDept[dept]) {
                    candidaturesPostBacParDept[dept] = { total:0, generale:0, STI2D:0, autre:0 };
                }
                candidaturesPostBacParDept[dept].total++;
                if (filiere === "Générale") {
                    candidaturesPostBacParDept[dept].generale++;
                } else if (filiere === "STI2D") {
                    candidaturesPostBacParDept[dept].STI2D++;
                } else {
                    candidaturesPostBacParDept[dept].autre++;
                }
            }
        } else {
            let uai = Candidats.getLatestUai(candidature);
            if (uai && uai != null) {
                if (!candidaturesParLycee[uai]) {
                    candidaturesParLycee[uai] = { total:0, generale:0, STI2D:0, autre:0 };
                }
                candidaturesParLycee[uai].total++;
                if (filiere === "Générale") {
                    candidaturesParLycee[uai].generale++;
                } else if (filiere === "STI2D") {
                    candidaturesParLycee[uai].STI2D++;
                } else {
                    candidaturesParLycee[uai].autre++;
                }
            }
        }
    });

    return { candidaturesParLycee, candidaturesPostBacParDept };
};






export { Candidats };