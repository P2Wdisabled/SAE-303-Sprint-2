import { HeaderView } from "./ui/header/index.js";
import { Candidats } from "./data/data-candidats.js";
import { Lycees } from "./data/data-lycees.js";
import { Coordonees } from "./data/data-coordonees.js";
import { Map } from "./ui/map/index.js";
import './index.css';

let C = {};



function getFiliere(candidature) {
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

function isPostBac(candidature) {
    if (candidature.Baccalaureat && (candidature.Baccalaureat.TypeDiplomeCode === 1 || candidature.Baccalaureat.TypeDiplomeCode === 2)) {
        return true;
    }
    return false;
}

function getRecentCodePostal(candidature) {
    for (let i = 0; i < 2; i++) {
        if (candidature.Scolarite[i] && candidature.Scolarite[i].CommuneEtablissementOrigineCodePostal) {
            return candidature.Scolarite[i].CommuneEtablissementOrigineCodePostal;
        }
    }
    return null;
}

function getDepartementFromCodePostal(cp) {
    let dept = cp.substring(0, 2);
    return dept;
}

C.init = async function() {
    V.init();
    let lyceesData = Lycees.getAll();
    let candidaturesData = Candidats.getAll();

    let candidaturesParLycee = {};
    let candidaturesPostBacParDept = {};

    candidaturesData.forEach(candidature => {
        let filiere = getFiliere(candidature);

        if (isPostBac(candidature)) {
            let cp = getRecentCodePostal(candidature);
            if (cp) {
                let dept = getDepartementFromCodePostal(cp);
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

    Map.init('map', lyceesData, candidaturesParLycee, candidaturesPostBacParDept);
}

let V = {
    header: document.querySelector("#header")
};

V.init = function(){
    V.renderHeader();
}

V.renderHeader = function(){
    V.header.innerHTML = HeaderView.render();
}

C.init();
