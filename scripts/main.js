// Creating an array to store information on the mmsi, latitude and longitude of the ships
let locationInformation = [];
let circleInformation = [];
let locationAPI = 'https://meri.digitraffic.fi/api/v1/locations/latest';
let metadataAPI = 'https://meri.digitraffic.fi/api/v1/metadata/vessels';

let mymap = L.map('mapid').setView([61.924110, 25.748152], 5);

let showAllShips = true;
let showExactShips = false;
let showInBetweenShips = false;
let showBothShips = false;
let showOtherShips = false;

// Creating the Leaflet map using the Mapbox API and focusing it on Finland
//This is a comment
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoibWFya3VuaXYiLCJhIjoiY2tmMmM5c3QxMTB0NjJ3bG54ZG5wcDdjaCJ9.wUUxpW1q8GIClp0KfCdltg'
}).addTo(mymap);

const ships = new L.LayerGroup;

// Requesting the Digitraffic ship location API and pushing the information into locationInformation array

fetch(locationAPI)
    .then(function (answer) {
        return answer.json();
    }).then(function(json){
        storeLocationData(json);
    }).catch(function(error) {
        console.log(error);
});

// Requesting the Digitraffic ship metadata API and creating the markers for the ships on the map. Creating popups when clicking the ships
// using the metadata to show things such as ship names.

catchMetadata();

// Adding search function to the map, allowing search by either the mmsi or ship name. If ship is found, a marker is
// put on the map at the ship's location

// Create a new layer group for the markers to be drawn on
let markers = new L.LayerGroup;
let searchBar = document.querySelector('#searchBar');
let searchBtn = document.querySelector('#search');

// Clicking the search button
searchBtn.addEventListener('click', e => {
    searchForShip(markers, searchBar, searchBtn);
});

// If map is clicked on, clear all the markers
mymap.addEventListener('click', e => {
    markers.eachLayer((layer) => {
        layer.remove();
    })
});

// HERE ARE ALL THE FUNCTIONS!
//
// 1. storeLocationData
// 2. catchMetadata
// 3. getShips
// 4. searchForShip
// 5. toggle
// 6. showAll
// 7. showExact
// 8. showInBetween
// 9. showBoth
// 10. showOthers
// 11. changeMode
//
//

function storeLocationData(json) {
    for (let i = 0; i < json.features.length; i++) {
        // Storing the mmsi, latitude and longitude as a singular object and pushing it into the array
        locationInformation.push(
            {'mmsi' : json.features[i].mmsi,
                'latitude' : json.features[i].geometry.coordinates[1],
                'longitude' : json.features[i].geometry.coordinates[0]
            });
    }
}

function getWeatherData(lat, lon) {
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=84d359deffe03ea7a7ebe3687be9f05a`)
        .then(function (answer) {
            return answer.json();
        }).then(function(json){
            const latlng = L.latLng(lat, lon);
            printWeatherData(json, latlng);

        }).catch(function(error) {
            console.log(error);
        });
}

function printWeatherData(json, latlng) {
    let popup = L.popup()
        .setLatLng(latlng)
        .setContent(`General weather: ${json.weather[0].main}
                 <br>Temperature: ${(+json.main.temp - 273.15).toFixed(1)} 'C
                 <br>Wind speed: ${json.wind.speed}`)
        .openOn(mymap);
    console.log("General weather: " + json.weather[0].main);
    console.log("Temperature: " + (+json.main.temp - 273.15).toFixed(1) + ` 'C`);
    console.log("Wind speed: " + json.wind.speed);
}

function catchMetadata(type, type2, typeName, typeColor) {

    fetch(metadataAPI)
        .then(function (answer) {
            return answer.json();
        }).then(function (json) {
        for (let i = 0; i < json.length; i++) {
            // Calling the getShips function to fuse the correct ship location with the correct metadata and to add
            // the ship name from this JSON to the array
            const shipNameString = json[i].name;
            const shipMMSI = getShips(json[i].mmsi, shipNameString);

            if (shipMMSI == undefined) {
                continue;
            }
            const shipType = json[i].shipType;
            let shipTypeString;
            let color;

            if (showAllShips) {

                if (shipType === 30) {
                    shipTypeString = 'fishing';
                    color = 'blue';
                } else if (shipType === 31 || shipType === 32) {
                    shipTypeString = 'towing';
                    color = 'yellow'
                } else if (shipType === 35) {
                    shipTypeString = 'military';
                    color = 'green';
                } else if (shipType === 36) {
                    shipTypeString = 'sailing';
                    color = 'white';
                } else if (shipType === 37) {
                    shipTypeString = 'pleasure craft'
                    color = 'white';
                } else if (shipType >= 40 && shipType < 50) {
                    shipTypeString = 'high speed craft';
                    color = 'crimson'
                } else if (shipType === 50) {
                    shipTypeString = 'pilot vessel';
                    color = 'orange'
                } else if (shipType === 51) {
                    shipTypeString = 'search and rescue';
                    color = 'darkkhaki'
                } else if (shipType === 52) {
                    shipTypeString = 'tug';
                    color = 'yellow';
                } else if (shipType === 53) {
                    shipTypeString = 'port tender';
                    color = 'magenta';
                } else if (shipType === 54) {
                    shipTypeString = 'anti-pollution equipment';
                    color = 'darkslategray'
                } else if (shipType === 55) {
                    shipTypeString = 'law enforcement';
                    color = 'darkblue';
                } else if (shipType >= 60 && shipType < 70) {
                    shipTypeString = 'passenger';
                    color = 'red';
                } else if (shipType >= 70 && shipType < 80) {
                    shipTypeString = 'cargo';
                    color = 'brown';
                } else if (shipType >= 80 && shipType < 90) {
                    shipTypeString = 'tanker';
                    color = 'black';
                } else {
                    shipTypeString = 'other';
                    color = 'slategrey';
                }
            }
            if (showExactShips) {
                if (shipType === type) {
                    shipTypeString = typeName;
                    color = typeColor;
                } else {
                    continue;
                }
            }
            if (showInBetweenShips) {
                if (shipType >= +type && shipType < +type2) {
                    shipTypeString = typeName;
                    color = typeColor;
                } else {
                    continue;
                }
            }
            if (showBothShips) {
                if (shipType === +type || shipType === +type2 ) {
                    shipTypeString = typeName;
                    color = typeColor;
                } else {
                    continue;
                }
            }
            if (showOtherShips) {
                if (shipType < +type || shipType > +type2) {
                    shipTypeString = typeName;
                    color = typeColor;
                } else {
                    continue;
                }
            }

            let circle = L.circle([locationInformation[shipMMSI].latitude, locationInformation[shipMMSI].longitude], {
                id: i,
                color: color,
                fillColor: '#f03',
                fillOpacity: 1.0,
                radius: 5,
            }).addTo(ships);
            const name = json[i].name;
            let destination = json[i].destination;

            // If destination for some reason also includes the starting point, only show the destination
            if (destination.includes('>')) {
                const destinationArray = destination.split(">");
                destination = destinationArray[1];
            }

            circle.bindPopup(`Ship name: ${name}
                                <br>Ship destination: <a href="https://www.marinetraffic.com/en/ais/index/search/all/keyword:${destination}/search_type:2">${destination}</a>
                                <br>Ship type: ${shipTypeString}
                                <br>Ship coordinates: ${locationInformation[shipMMSI].latitude}, ${locationInformation[shipMMSI].longitude}
                                <br>Weather information: <button onclick="getWeatherData(${locationInformation[shipMMSI].latitude}, ${locationInformation[shipMMSI].longitude})">Click here</button>`);
            circleInformation.push({
                'shipMMSI' : locationInformation[shipMMSI].mmsi,
                'popUp' : `Ship name: ${name}
                                <br>Ship destination: <a href="https://www.marinetraffic.com/en/ais/index/search/all/keyword:${destination}/search_type:2">${destination}</a>
                                <br>Ship type: ${shipTypeString}
                                <br>Ship coordinates: ${locationInformation[shipMMSI].latitude}, ${locationInformation[shipMMSI].longitude}
                                <br>Weather information: <button onclick="getWeatherData(${locationInformation[shipMMSI].latitude}, ${locationInformation[shipMMSI].longitude})">Click here</button>`

            });

        }

    }).catch(function (error) {
        console.log(error);
    });
    ships.addTo(mymap);
}

// Comparing the mmsi information from the location array to the current ship in the metadata list to make sure
// we're adding the correct location to the correct ships. Also adds the correct name to the information array
// to be used later

function getShips(mmsi, shipName) {
    for (let i = 0; i < locationInformation.length; i++) {
        if (locationInformation[i].mmsi === mmsi) {
            locationInformation[i]['name'] = shipName;
            return i;
        }
    }
}

function searchForShip(markers, searchBar) {
    // Clearing the markers before new search
    markers.eachLayer((layer) => {
        layer.remove();
    })
    const search = searchBar.value;

    // Looking through the information array to see if there's a ship with the correct mmsi or name
    for (let i = 0; i < locationInformation.length; i++) {
        // If the object for some reason has no name, skip the current object
        if (locationInformation[i].name === undefined) {
            continue;
        }
        // If search box is empty, do not do anything
        if (search.value !== "") {
            // If mmsi checkbox is checked, search by the mmsi
            if (document.getElementById('mmsi').checked) {
                if (locationInformation[i].mmsi === search) {
                    marker = L.marker([locationInformation[i].latitude, locationInformation[i].longitude]);
                    markers.addLayer(marker);
                    for (let p = 0; p < circleInformation.length; p++) {
                        if (circleInformation[p].shipMMSI === locationInformation[i].mmsi) {
                            marker.bindPopup(circleInformation[p].popUp).addTo(mymap).openPopup();
                        }
                    }
                }
            }
            // If ship name checkbox is checked, search by the mmsi
            if (document.getElementById('shipName').checked) {
                if (locationInformation[i]['name'].toLowerCase().includes(search.toLowerCase())) {
                    marker = L.marker([locationInformation[i].latitude, locationInformation[i].longitude]);
                    console.log(locationInformation[i].mmsi);
                    markers.addLayer(marker);
                    for (let p = 0; p < circleInformation.length; p++) {
                        if (circleInformation[p].shipMMSI === locationInformation[i].mmsi) {
                            marker.bindPopup(circleInformation[p].popUp).addTo(mymap).openPopup();
                        }
                    }
                }
            }
        }

    }
    // Finally, add markers to map
    markers.addTo(mymap);
}

//Show and hide color code elements
function toggle() {
    let lista = document.getElementById("colors");
    //if list contains a hidden class, remove it and add a visible class
    if (lista.classList.contains("hidden")){
        lista.classList.remove("hidden");
        lista.classList.add("visible");
    } else {
        //else change the visibility back to hidden
        lista.classList.remove("visible");
        lista.classList.add("hidden");
    }
}

function showAll() {
    ships.clearLayers();
    showAllShips = true;
    showExactShips = false;
    showInBetweenShips = false;
    showBothShips = false;
    showOtherShips = false;
    catchMetadata();
}

//Clearing markers and displaying ships with precise typenumbers.

function showExact(type, type2, typeName, typeColor) {
    ships.clearLayers();
    showAllShips = false;
    showExactShips = true;
    showInBetweenShips = false;
    showBothShips = false;
    showOtherShips = false;
    catchMetadata(type, type2, typeName, typeColor);
}

//Clearing all markers and filtering shiptypes between numbers.

function showInBetween(type, type2, typeName, typeColor) {
    ships.clearLayers();
    showAllShips = false;
    showExactShips = false;
    showInBetweenShips = true;
    showBothShips = false;
    showOtherShips = false;
    catchMetadata(type, type2, typeName, typeColor);
}

//Clearing markers and displaying 2 different shiptypes

function showBoth(type, type2, typeName, typeColor) {
    ships.clearLayers();
    showAllShips = false;
    showExactShips = false;
    showInBetweenShips = false;
    showBothShips = true;
    showOtherShips = false;
    catchMetadata(type, type2, typeName, typeColor);
}

//Clearing markers and displaying other shiptypes under shiptype 30 and above 90

function showOthers(type, type2, typeName, typeColor) {
    ships.clearLayers();
    showAllShips = false;
    showExactShips = false;
    showInBetweenShips = false;
    showBothShips = false;
    showOtherShips = true;
    catchMetadata(type, type2, typeName, typeColor);
}

// Handling Dark Mode setting

function changeMode() {
    let darkmode = document.getElementById("switch");
    if (darkmode.checked) {
        document.body.style.backgroundColor = "#181818";
        document.getElementById("uppersection").style.backgroundColor = "#181818";
        document.getElementById("uppersection").style.color = "white";
        document.getElementById("toggle").style.color = "white";
        document.getElementById("all").style.color = "white";
        document.getElementById("second").style.color = "white";
        document.getElementById("logo").src = "images/whitelogo.png";
        document.getElementById("background").style.opacity = 0;
        document.getElementById("background2").style.opacity = 1;
        document.getElementById("mapid").style.filter = "brightness(70%)";
        document.getElementById("colors").style.filter = "brightness(70%)";

    } else {
        document.body.style.backgroundColor = "white";
        document.getElementById("uppersection").style.backgroundColor = "white";
        document.getElementById("toggle").style.color = "black";
        document.getElementById("all").style.color = "black";
        document.getElementById("second").style.color = "black";
        document.getElementById("logo").src = "images/logo.png";
        document.getElementById("background").style.opacity = 1;
        document.getElementById("background2").style.opacity = 0;
        document.getElementById("mapid").style.filter = "brightness(100%)";
        document.getElementById("colors").style.filter = "brightness(100%)";


    }

}