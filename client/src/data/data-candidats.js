

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

export { Candidats };