import { HeaderView } from "./ui/header/index.js";
import { Candidats } from "./data/data-candidats.js";
import { Lycees } from "./data/data-lycees.js";
import './index.css';


let C = {};

C.init = async function(){
    V.init();
    console.log(Candidats.getAll());
    console.log(Lycees.getAll());
    var mymap = L.map('mapid').setView([47, 2], 6); 
// Les coordonnées [47,2] sont en gros le centre de la France, et le zoom à 6 permet de voir tout le pays.
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mymap);
var marker = L.marker([48.8566, 2.3522]).addTo(mymap); // Marker sur Paris
marker.bindPopup("Hello from Paris!").openPopup();

}

let V = {
    header: document.querySelector("#header")
};

V.init = function(){
    V.renderHeader();
}

V.renderHeader= function(){
    V.header.innerHTML = HeaderView.render();
}


C.init();