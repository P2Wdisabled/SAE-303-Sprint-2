// ./src/main.js

import { Candidats } from "./data/data-candidats.js";
import { Lycees } from "./data/data-lycees.js";
import { Map } from "./ui/map/index.js";
import './index.css';

let C = {};

C.init = async function() {
    let lyceesData = await Lycees.getAll();
    let candidaturesData = await Candidats.getAll();

    const { candidaturesParLycee, candidaturesPostBacParDept } = Candidats.aggregateCandidatures(candidaturesData);

    Map.init('map', lyceesData, candidaturesParLycee, candidaturesPostBacParDept);
}

let V = {
    header: document.querySelector("#header")
};


C.init();
