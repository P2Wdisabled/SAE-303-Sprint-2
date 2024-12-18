let data = await fetch("./src/data/json/coordonees.json");
data = await data.json();

let Coordonees = {}

Coordonees.getAll = function(){
    return data;
}

Coordonees.distanceVolDoiseau = function(lat_a, lon_a, lat_b, lon_b) {
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

export { Coordonees };
