let data = await fetch("./src/data/json/coordonees.json");
data = await data.json();

let Coordonees = {}

Coordonees.getAll = function(){
    return data;
}

export { Coordonees };
