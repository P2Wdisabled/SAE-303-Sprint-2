// src/main.js

import { HeaderView } from "./ui/header/index.js";
import { Candidats } from "./data/data-candidats.js";
import { Lycees } from "./data/data-lycees.js";
import { Coordonees } from "./data/data-coordonees.js"; // IT10
import { Map } from "./ui/map/index.js";
import './index.css';

let C = {};

// Fonction pour obtenir le dernier UAI (année la plus récente) d'une candidature
function getLatestUai(candidature) {
    for (let i = 0; i < candidature.Scolarite.length; i++) {
        let scolarite = candidature.Scolarite[i];
        if (scolarite.UAIEtablissementorigine) {
            return scolarite.UAIEtablissementorigine.toUpperCase();
        }
    }
    return null;
}

// Fonction pour déterminer la filière
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

// IT10 : Déterminer si un candidat est post-bac
function isPostBac(candidature) {
    // TypeDiplomeCode : 4 = en préparation, 1 = bac obtenu, 2 = diplôme étranger équivalent
    // post-bac => type 1 ou 2
    if (candidature.Baccalaureat && (candidature.Baccalaureat.TypeDiplomeCode === 1 || candidature.Baccalaureat.TypeDiplomeCode === 2)) {
        return true;
    }
    return false;
}

// IT10 : Récupérer le code postal récent (année N ou N-1)
function getRecentCodePostal(candidature) {
    // Année 0 = N, année 1 = N-1
    for (let i = 0; i < 2; i++) {
        if (candidature.Scolarite[i] && candidature.Scolarite[i].CommuneEtablissementOrigineCodePostal) {
            return candidature.Scolarite[i].CommuneEtablissementOrigineCodePostal;
        }
    }
    return null;
}

// IT10 : Obtenir le code département principal de rattachement (ex: "45000" pour le 45)
function getDepartementFromCodePostal(cp) {
    // cp type "45120" => dept = "45" + "000" => "45000"
    let dept = cp.substring(0, 2) + "000";
    return dept;
}

// Fonction d'initialisation
C.init = async function(){
    V.init();
    let lyceesData = Lycees.getAll();
    let candidaturesData = Candidats.getAll();

    // Compter les candidatures par lycée (pour les TypeDiplomeCode=4)
    // ET IT10 : compter les candidatures post-bac par département
    let candidaturesParLycee = {};
    let candidaturesPostBacParDept = {}; // IT10

    candidaturesData.forEach(candidature => {
        let filiere = getFiliere(candidature);

        if (isPostBac(candidature)) {
            // Post-bac : récupérer code postal récent
            let cp = getRecentCodePostal(candidature);
            if (cp) {
                let deptCp = getDepartementFromCodePostal(cp);
                if (!candidaturesPostBacParDept[deptCp]) {
                    candidaturesPostBacParDept[deptCp] = { total:0, generale:0, STI2D:0, autre:0 };
                }
                candidaturesPostBacParDept[deptCp].total++;
                if (filiere === "Générale") {
                    candidaturesPostBacParDept[deptCp].generale++;
                } else if (filiere === "STI2D") {
                    candidaturesPostBacParDept[deptCp].STI2D++;
                } else {
                    candidaturesPostBacParDept[deptCp].autre++;
                }
            }
            // Si pas de CP sur N ou N-1 => on ne compte pas
        } else {
            // Candidat bac en préparation (TypeDiplomeCode=4)
            let uai = getLatestUai(candidature);
            if (uai && uai != null) {
                if (!candidaturesParLycee[uai]) {
                    candidaturesParLycee[uai] = {
                        total: 0,
                        generale: 0,
                        STI2D: 0,
                        autre: 0
                    };
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

    // Initialiser la carte
    Map.init('map', lyceesData, candidaturesParLycee, candidaturesPostBacParDept);
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
