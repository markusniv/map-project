// Creating an array to store information on the mmsi, latitude and longitude of the ships
let locationInformation = [];
let metadataInformation = [];
let circleInformation = [];

let filtersPushed = false;
let mapVisible = true;

let locationAPI = 'https://meri.digitraffic.fi/api/v1/locations/latest';
let metadataAPI = 'https://meri.digitraffic.fi/api/v1/metadata/vessels';
let weatherIcon = 'http://openweathermap.org/img/wn/';

let mymap = L.map('mapid').setView([61.924110, 25.748152], 5);

let showAllShips = true;

// Creating the Leaflet map using the Mapbox API and focusing it on Finland

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: config.MAP_KEY
}).addTo(mymap);

const ships = new L.LayerGroup;

// Requesting the Digitraffic ship location API and pushing the information into locationInformation array

storeLocationData();

// Requesting the Digitraffic ship metadata API and storing the information into metadataInformation
// Creating the markers for the ships on the map. Creating popups when clicking the ships using the metadata to show things such as ship names.

fetch(metadataAPI)
    .then(function (answer) {
        return answer.json();
    }).then(function(json){
    metadataInformation = json;
    catchMetadata();
}).catch(function(error) {
    console.log(error);
});

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

// Searching when pressing enter while search bar is active
searchBar.addEventListener('keyup', e => {
    if (e.keyCode === 13) {
        e.preventDefault();
        searchBtn.click();
    }
});

// If map is clicked on, clear all the markers
mymap.addEventListener('click', e => {
    markers.eachLayer((layer) => {
        layer.remove();
    })
});

/*
=====================================================
            HERE ARE ALL THE FUNCTIONS
=====================================================
 */

// Store the location data from the API into locationInformation

function storeLocationData() {
    locationInformation = [];
    fetch(locationAPI)
        .then(function (answer) {
            return answer.json();
        }).then(function(json){
        for (let i = 0; i < json.features.length; i++) {
            // Storing the mmsi, latitude and longitude as a singular object and pushing it into the array
            locationInformation.push(
                {'mmsi' : json.features[i].mmsi,
                    'latitude' : json.features[i].geometry.coordinates[1],
                    'longitude' : json.features[i].geometry.coordinates[0]
                });
        }
    }).catch(function(error) {
        console.log(error);
    });
}

// Reload the locations from the API

function resetLocationData() {
    clearMap();
    storeLocationData();
}

// Get weather data from the area where a ship currently resides from OpenWeatherMap

function getWeatherData(lat, lon) {
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${config.WEATHER_KEY}`)
        .then(function (answer) {
            return answer.json();
        }).then(function(json){
            const latlng = L.latLng(lat, lon);
            printWeatherData(json, latlng);
        }).catch(function(error) {
            console.log(error);
        });
}

// Print weather data from getWeatherData into a popup

function printWeatherData(json, latlng) {
    let popup = L.popup()
        .setLatLng(latlng)
        .setContent(`<p class="popupTextBox"><img src="${weatherIcon}${json.weather[0].icon}.png" alt="${json.weather[0].main} image"><br>
                 <br>General weather: ${json.weather[0].main}
                 <br>Temperature: ${(+json.main.temp - 273.15).toFixed(1)} 'C
                 <br>Wind speed: ${json.wind.speed} m/s</p>`)
        .openOn(mymap);
}

// Use the ship metadataInformation and locationInformation collected from the APIs to store information on where the
// circles need to be drawn at

function catchMetadata() {

    for (let i = 0; i < metadataInformation.length; i++) {
        // Calling the getShips function to fuse the correct ship location with the correct metadata and to add
        // the ship name from this JSON to the array
        const shipNameString = metadataInformation[i].name;
        const shipMMSI = getShips(metadataInformation[i].mmsi, shipNameString);

        if (shipMMSI === undefined) {
            continue;
        }
        const shipType = metadataInformation[i].shipType;
        let shipTypeString;
        let color;

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
            color = 'greenyellow';
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
            color = 'gray';
        }

        const name = metadataInformation[i].name;
        let destination = metadataInformation[i].destination;

        // If destination for some reason also includes the starting point, only show the destination
        if (destination.includes('>')) {
            const destinationArray = destination.split(">");
            destination = destinationArray[1];
        }

        circleInformation.push({
            'shipMMSI' : locationInformation[shipMMSI].mmsi,
            'latitude' : locationInformation[shipMMSI].latitude,
            'longitude' : locationInformation[shipMMSI].longitude,
            'color' : color,
            'popUp' : `<p class="popupTextBox">Ship name: ${name}
                                <br>Ship destination: <a href="https://www.marinetraffic.com/en/ais/index/search/all/keyword:${destination}/search_type:2">${destination}</a>
                                <br>Ship type: ${shipTypeString}
                                <br>Ship coordinates: ${locationInformation[shipMMSI].latitude}, ${locationInformation[shipMMSI].longitude}
                                <br>Weather information: <button onclick="getWeatherData(${locationInformation[shipMMSI].latitude}, 
                                ${locationInformation[shipMMSI].longitude})">Click here</button>                         
                                </p>`

        });
    }
}

// Draws the ships on the map

function drawShips(color) {
    clearMap();
    if (showAllShips) {
        for (let i = 0; i < circleInformation.length; i++) {
            let circle = L.circle([circleInformation[i].latitude, circleInformation[i].longitude], {
                color: circleInformation[i].color,
                radius: 5,
            }).addTo(ships);
            circle.bindPopup(circleInformation[i].popUp);
        }
    } else {
        for (let i = 0; i < circleInformation.length; i++) {
            if (circleInformation[i].color === color) {
                let circle = L.circle([circleInformation[i].latitude, circleInformation[i].longitude], {
                    color: circleInformation[i].color,
                    radius: 5,
                }).addTo(ships);
                circle.bindPopup(circleInformation[i].popUp);
            }
        }
    }
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

// Search for ship via either the mmsi or ship name. Search results are pushed into an array which is then checked in
// the addSearchMarker function where the results are drawn on the map.

function searchForShip(markers, searchBar) {
    // Clearing map before search
    clearMap();
    let searchResults = [];
    const search = searchBar.value;
    let count = 0;
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
                    count++;
                    searchResults.push(`'i':${i}
                                        'latitude':${locationInformation[i].latitude}
                                        'longitude':${locationInformation[i].longitude}`);
                }
            }
            // If ship name checkbox is checked, search by the mmsi
            if (document.getElementById('shipName').checked) {
                if (locationInformation[i]['name'].toLowerCase().includes(search.toLowerCase())) {
                    count++;
                    searchResults.push({
                        'number': i,
                        'latitude': locationInformation[i].latitude,
                        'longitude': locationInformation[i].longitude
                    });
                }
            }
        }
        if (count > 20) {
            break;
        }
    }
    // Finally, add markers to map if there are under 20 results
    if (count > 20) {
        alert("Too many results, please refine your search input!");
    } else if (count === 0) {
        alert("No results!");
    } else {
        addSearchMarker(searchResults, count);
    }
}

// Draw search result circle and marker. If there is one search result, draw marker and open popup. If five or less,
// only draw the popups but not open them. If there are more than that, only draw the circles.

function addSearchMarker(searchResults, count) {
    for (let i = 0; i < searchResults.length; i++) {
        const number = searchResults[i].number;
        const latitude = searchResults[i].latitude;
        const longitude = searchResults[i].longitude;
        marker = L.marker([latitude, longitude]);
        markers.addLayer(marker);
        for (let p = 0; p < circleInformation.length; p++) {
            if (circleInformation[p].shipMMSI === locationInformation[number].mmsi) {
                let circle = L.circle([latitude, longitude], {
                    color: circleInformation[p].color,
                    radius: 5,
                }).addTo(ships);
                circle.bindPopup(circleInformation[p].popUp);
                if (count === 1) {
                    marker.bindPopup(circleInformation[p].popUp).addTo(mymap).openPopup();
                } else if (count <= 5) {
                    marker.bindPopup(circleInformation[p].popUp).addTo(mymap);
                }
            }
        }
    }
    ships.addTo(mymap);
}

// Clear all layers from the map

function clearMap() {
    ships.clearLayers();
    markers.eachLayer((layer) => {
        layer.remove();
    })
}
// Clear markers and show all types of ships

function showAll() {
    ships.clearLayers();
    showAllShips = true;
    drawShips();
}

// Clear markers and show specific ships

function showOther(color) {
    ships.clearLayers();
    showAllShips = false;
    drawShips(color);
}

// Handling Dark Mode setting

function changeMode() {
    let darkmode = document.getElementById('darkMode');
    let uppersection = document.getElementById('upperSection');
    const buttons = document.getElementsByClassName('button');
    if (darkmode.classList.contains("disabled")) {
        darkmode.classList.replace("disabled", "enabled");
        darkmode.innerHTML = "Light mode";
        document.querySelector("html").style.backgroundImage = "linear-gradient(to top, #303030, #505050, #696969)";
        uppersection.style.backgroundColor = '#181818';
        uppersection.style.color = 'white';
        uppersection.style.boxShadow = 'white 1px 1px 30px';
        document.getElementById("darkImage").style.opacity = 1;
        document.getElementById("image").style.opacity = 0;
        document.querySelector('body').style.filter = 'brightness(50%)';
        document.querySelector('#logo').src =  './images/whitelogo.png';
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].style.color = 'white';
        }
    } else {
        darkmode.classList.replace("enabled", "disabled");
        darkmode.innerHTML = "Dark mode";
        uppersection.style.color = 'black';
        uppersection.style.backgroundColor = 'white';
        uppersection.style.boxShadow = 'black 2px 2px 60px';
        document.getElementById("darkImage").style.opacity = 0;
        document.getElementById("image").style.opacity = 1;
        document.querySelector("html").style.backgroundImage = "linear-gradient(to top, silver, #DCDCDC, white)";
        document.getElementById('resetLocation').style.color = 'black';
        document.querySelector('body').style.filter = 'brightness(100%)';
        document.querySelector('#logo').src =  './images/logo.png';
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].style.color = 'black';
        }
    }
}


// intro functions

function removeStartScreen(){
    document.getElementById('intro').remove();
}
function intro(){
    let intro = document.getElementById('intro');
    intro.style.top = '-110%';
    setTimeout(removeStartScreen, 2000);
}

// Displays the color code buttons by sliding them to the left

function displayColors(){
    let filters = document.getElementById('filters');
    let colors = document.getElementById('colors');
    let arrow = document.getElementById('arrow');
    if(colors.className === 'hidden') {
        filtersPushed = true;
        filters.style.left = '1vw';
        colors.classList.replace('hidden', 'visible');
        arrow.style.webkitTransform = 'rotate(180deg)';
    } else {
        filtersPushed = false;
        filters.style.left = '9.5vw';
        colors.classList.replace('visible', 'hidden');
        arrow.style.webkitTransform = 'rotate(0deg)';
    }
}

// hide main section

function hideMain(){
    let main = document.getElementById("midSection");
    let button = document.getElementById("hideMap");
    if (mapVisible) {
        mapVisible = false;
        document.getElementById("mapid").style.display = "none";
        document.getElementById("filters").style.display = "none";
        button.innerHTML = "Show map";
    } else {
        mapVisible = true;
        main.style.zIndex = 9;
        button.innerHTML = "Hide map";
        document.getElementById("filters").style.display = "flex";
        document.getElementById("mapid").style.display = "block";
    }
}

// react to resizing window

window.addEventListener('resize', e => {
    let w = document.documentElement.clientWidth;
    let filters = document.getElementById('filters');
    if (w <= 1050) {
        filters.style.left = '37%';
    } else {
        if (filtersPushed) {
            filters.style.left = '0vw';
        } else {
            filters.style.left = '9vw';
        }
    }
})