const express = require('express');
const app = express();
const path = require('path');

app.use(express.static("public"));

// Static .html Routing 
app.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});
app.get("/about.html", function(request, response) {
  response.sendFile(__dirname + "/views/about.html");
});
app.get("/env.html", function(request, response) {
  response.sendFile(__dirname + "/views/env.html");
});
app.get("/format-questions.html", function(request, response) {
  response.sendFile(__dirname + "/views/format-questions.html");
});
app.get("/howto.html", function(request, response) {
  response.sendFile(__dirname + "/views/howto.html");
});
app.get("/index.html", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});
app.get("/login.html", function(request, response) {
  response.sendFile(__dirname + "/views/login.html");
});
app.get("/map.html", function(request, response) {
  response.sendFile(__dirname + "/views/map.html");
});
app.get("/my-account.html", function(request, response) {
  response.sendFile(__dirname + "/views/my-account.html");
});
app.get("/species-interactions.html", function(request, response) {
  response.sendFile(__dirname + "/views/species-interactions.html");
});
app.get("/species-portrait.html", function(request, response) {
  response.sendFile(__dirname + "/views/species-portrait.html");
});

// Static .json Routing
app.get("/cytoscape-style.json", function(request, response) {
  response.sendFile(__dirname + "/public/cytoscape-style.json");
});
app.get("/localspecies.json", function(request, response) {
  response.sendFile(__dirname + "/public/localspecies.json");
});
app.get("/species-portrait-questions.json", function(request, response) {
  response.sendFile(__dirname + "/public/species-portrait-questions.json");
});

// listen for requests
const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

async function geteeData() {
  // Load client library.
var ee = require('@google/earthengine');

  // Initialize client library and run analysis.
var initialize = function() {
  ee.initialize(null, null, function() {
    // ... run analysis ...
  }, function(e) {
    console.error('Initialization error: ' + e);
  });
};

// Authenticate using an OAuth pop-up.
ee.data.authenticateViaOauth(YOUR_CLIENT_ID, initialize, function(e) {
  console.error('Authentication error: ' + e);
}, null, function() {
  ee.data.authenticateViaPopup(initialize);
});
}
