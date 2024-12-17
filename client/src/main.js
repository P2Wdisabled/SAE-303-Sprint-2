// src/main.js

import { HeaderView } from "./ui/header/index.js";
import { Candidats } from "./data/data-candidats.js";
import { Lycees } from "./data/data-lycees.js";
import { Map } from "./ui/map/index.js"; // Importer le composant Map
import './index.css';

let C = {};

// Fonction pour obtenir le dernier UAI d'une candidature
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
        } else if (["S", "ES", "L"].includes(serie)) { // Ajouter d'autres séries générales si nécessaire
            return "Générale";
        } else {
            return "Autre";
        }
    }
    return "Autre";
}

// Fonction d'initialisation
C.init = async function(){
    V.init();
    let lyceesData = Lycees.getAll();
    let candidaturesData = Candidats.getAll();
    console.log("Candidatures:", candidaturesData);
    console.log("Lycées:", lyceesData);
    
    // Compter les candidatures par lycée en filtrant celles qui préparent le bac et les catégoriser par filière
    let candidaturesParLycee = {};
    candidaturesData.forEach(candidature => {
        // Vérifier si le candidat prépare le baccalauréat
        //if (candidature.Baccalaureat && candidature.Baccalaureat.TypeDiplomeCode === 4) {
            let uai = getLatestUai(candidature);
            if (uai && uai != null) {
                // Déterminer la filière
                let filiere = getFiliere(candidature);
                
                // Initialiser l'objet si nécessaire
                if (!candidaturesParLycee[uai]) {
                    candidaturesParLycee[uai] = {
                        total: 0,
                        generale: 0,
                        STI2D: 0,
                        autre: 0
                    };
                }
                
                // Incrémenter les compteurs
                candidaturesParLycee[uai].total++;
                if (filiere === "Générale") {
                    candidaturesParLycee[uai].generale++;
                } else if (filiere === "STI2D") {
                    candidaturesParLycee[uai].STI2D++;
                } else {
                    candidaturesParLycee[uai].autre++;
                }
            }
        //}
    });
    console.log("Candidatures par lycée (Préparation Bac):", candidaturesParLycee);

    // Initialiser la carte en utilisant le composant Map
    Map.init('map', lyceesData, candidaturesParLycee);
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
