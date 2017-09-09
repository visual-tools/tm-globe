import { scene, camera, renderer } from './common/scene';
import { setEvents } from './common/setEvents';
import { convertToXYZ, getEventCenter, geodecoder } from './common/geoHelpers';
import { mapTexture, projection } from './common/mapTexture';
import { getTween, memoize } from './common/utils';
import * as topojson from 'topojson';
import THREE from 'THREE';
import d3 from 'd3';
var countryEvidence = {

    "India": pdflink("./somedocument.pdf"),
    "Indonesia": youtubelink("https://www.youtube.com/embed/ZnuwB35GYMY"),
    "Nigeria": pdflink("./somedocument.pdf"),
    "Madagascar": youtubelink("https://www.youtube.com/embed/ZnuwB35GYMY")
};
window.countryEvidence = countryEvidence;


function pdflink(doc) {
    return '<a href="' + doc + '"><img src=\"https://upload.wikimedia.org/wikipedia/commons/2/2c/Pdflogogt.png\" alt=\"Open Document\" /></a>';
}

function youtubelink(vid) {
    return '<iframe width="560" height="315" src="' + vid + '" frameborder="0" allowfullscreen></iframe>';
}

window.countryEvidence = countryEvidence;

d3.json('data/world.json?_=' + new Date().getTime(), function(err, data) { // I'm currently adding things to the world.json so refresh it every time

    d3.select("#loading").transition().duration(500)
        .style("opacity", 0).remove();

    var currentCountry, overlay, clickedCountry;

    var segments = 155; // number of vertices. Higher = better mouse accuracy

    // Setup cache for country textures
    var countries = topojson.feature(data, data.objects.countries);
    var cities = topojson.feature(data, data.objects.cities);
    var geo = geodecoder(countries.features);

    var textureCache = memoize(function(cntryID, color) {
        var country = geo.find(cntryID);
        return mapTexture(country, color);
    });

    // Base globe with blue "water"
    let blueMaterial = new THREE.MeshPhongMaterial({ color: '#2B3B59', transparent: true });
    let sphere = new THREE.SphereGeometry(200, segments, segments);
    let baseGlobe = new THREE.Mesh(sphere, blueMaterial);
    baseGlobe.rotation.y = Math.PI;
    baseGlobe.addEventListener('click', onGlobeClick);
    baseGlobe.addEventListener('mousemove', onGlobeMousemove);

    // add base map layer with all countries
    let worldTexture = mapTexture(countries, '#647089');
    let mapMaterial = new THREE.MeshPhongMaterial({ map: worldTexture, transparent: true });
    var baseMap = new THREE.Mesh(new THREE.SphereGeometry(200, segments, segments), mapMaterial);
    baseMap.rotation.y = Math.PI;

    // add cities
    var citiesGeometry = new THREE.SphereGeometry(200, segments, segments);
    let citiesMaterial = new THREE.MeshPhongMaterial({ transparent: true });
    let citiesMesh = new THREE.Mesh({ transparent: true });
    let pointGeometry = new THREE.SphereGeometry(1, 10, 10);
    let pointMaterial = new THREE.MeshPhongMaterial({ color: '#FF0000', transparent: false });
    cities.features.forEach(function(city) {
        var pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
        var lng = city.geometry.coordinates[0]
        var lat = city.geometry.coordinates[1];
        pointMesh.position.set(
            200 * Math.sin(lat) * Math.sin(lng),
            200 * Math.cos(lat),
            200 * Math.sin(lat) * Math.cos(lng)
        );
        citiesMesh.add(pointMesh);
    }); 
    citiesMesh.rotation.y = Math.PI;

    // create a container node and add the two meshes
    var root = new THREE.Object3D();
    root.scale.set(2.5, 2.5, 2.5);
    root.add(baseGlobe);
    root.add(baseMap);
	root.add(citiesMesh);
    scene.add(root);

    function onGlobeClick(event) {
        console.log("click");
        // Get pointc, convert to latitude/longitude
        var latlng = getEventCenter.call(this, event);

        // // Look for country at that latitude/longitude
        // var country = geo.search(latlng[0], latlng[1]);

        // if (country !== null && country.code !== clickedCountry) {

        //     // Track the current country displayed
        //     clickedCountry = country.code;


        // }

        // Get new camera position
        var temp = new THREE.Mesh();
        temp.position.copy(convertToXYZ(latlng, 900));
        temp.lookAt(root.position);
        temp.rotateY(Math.PI);

        for (let key in temp.rotation) {
            if (temp.rotation[key] - camera.rotation[key] > Math.PI) {
                temp.rotation[key] -= Math.PI * 2;
            } else if (camera.rotation[key] - temp.rotation[key] > Math.PI) {
                temp.rotation[key] += Math.PI * 2;
            }
        }

        var tweenPos = getTween.call(camera, 'position', temp.position);
        d3.timer(tweenPos);

        var tweenRot = getTween.call(camera, 'rotation', temp.rotation);
        d3.timer(tweenRot);
    }

    function onGlobeMousemove(event) {
        var map, material;
        // Get pointc, convert to latitude/longitude
        var latlng = getEventCenter.call(this, event);

        // Look for country at that latitude/longitude
        var country = geo.search(latlng[0], latlng[1]);

        if (country !== null && country.code !== currentCountry) {

            // Track the current country displayed
            currentCountry = country.code;

            // Update the html
            d3.select("#msg").html(country.code);
            if (window.countryEvidence[country.code] !== undefined) {

                d3.select("#msg2").html(countryEvidence[country.code]);
            } else {
                d3.select("#msg2").html("<p></p>");
            }
            // Overlay the selected country
            map = textureCache(country.code, '#CDC290');
            material = new THREE.MeshPhongMaterial({ map: map, transparent: true });
            if (!overlay) {
                overlay = new THREE.Mesh(new THREE.SphereGeometry(201, 40, 40), material);
                overlay.rotation.y = Math.PI;
                root.add(overlay);
            } else {
                overlay.material = material;
            }

        } else {
            d3.select("#msg").html(clickedCountry);
            if (window.countryEvidence[clickedCountry] !== undefined) {

                d3.select("#msg2").html(countryEvidence[clickedCountry]);
            } else {
                d3.select("#msg2").html("<p></p>");
            }
        }
    }

    setEvents(camera, [baseGlobe], 'click');
    setEvents(camera, [baseGlobe], 'mousemove', 10);
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
