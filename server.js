// Load External Packages
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const privateKey = 
const ee = require("@google/earthengine");
const shortid = require("shortid");
const session = require("express-session");

// Get Express Middleware
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: "omniverse", // just a long random string
    resave: false,
    saveUninitialized: true,
  })
);



// Static Routing w/ Express 
app.get('/echo', (req, res) => {
    res.json({ message: "Hello from the backend!" });
});
app.get(["/index", "/"], (req, res) => {
    res.sendFile(__dirname + "/public/views/index.html");
});
app.get('/about', (req, res) => {
    res.sendFile(__dirname + "/public/views/about.html");
});
app.get("/format-questions", (req, res) => {
    res.sendFile(__dirname + "/public/views/format-questions.html");
});
app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/public/views/login.html");
});
app.get("/map", (req, res) => {
    res.sendFile(__dirname + "/public/views/map.html");
});
app.get("/species-interactions", (req, res) => {
    res.sendFile(__dirname + "/public/views/species-interactions.html");
});
app.get("/species-portrait", (req, res) => {
    res.sendFile(__dirname + "/public/views/species-portrait.html");
});
app.get("/cytoscape-style", (req, res) => {
    res.sendFile(__dirname + "/public/json/cytoscape-style.json");
});
app.get("/species-portrait-questions", (req, res) => {
    res.sendFile(__dirname + "/public/json/species-portrait-questions.json");
});
app.get("/localspecies", (req, res) => {
    res.sendFile(__dirname + "/public/json/localspecies.json");
});

// Listen for requests
const listener = app.listen(process.env.PORT_EXPRESS, function () {
    console.log("Server: Lepidoptera is listening on port " + listener.address().port);
});

// POST request handling
app.post("/getEEData", async (req, res) => {
    console.log("Server: Analysis Request Recieved...");
    const filenamePrefix = `${req.sessionID}_${shortid.generate()}`;
    // Initialize client library and run analysis.
    var runAnalysis = function () {
        ee.initialize(null, null, function () {
            runAnalysisSeries(req.body, filenamePrefix);
        }, function (e) {
            console.error('Server: Initialization error:: ' + e);
        });
    };
    // Authenticate using a service account.
    ee.data.authenticateViaPrivateKey(privateKey, runAnalysis, function (e) {
        console.error('Server: Authentication error:: ' + e);
    });
    const response = await downloadIntoMemoryCSV(filenamePrefix);
    res.json({ eeData: response });
});

// Get TimeSeries Data Earth Engine
function runAnalysisSeries(coordinates, filenamePrefix) {
    // Define EE search polygon from coordinats
    const ee_search_poly = ee.Geometry({
        type: "Polygon",
        coordinates: coordinates,
    });
    // Define start and end dates for analysis
    var ee_date_start = ee.Date("2017-05-01T00:00:00");
    var ee_date_end = ee.Date("2023-05-01T00:00:00");
    // EE function to retrieve matching Dynamic World image
    function getMatchingDWImage(ee_img_s2) {
        var ee_img_s2_id = ee_img_s2.get("system:index");
        var ee_imgC_dw = ee
            .ImageCollection("GOOGLE/DYNAMICWORLD/V1")
            .filter(ee.Filter.eq("system:index", ee_img_s2_id))
            .filterBounds(ee_search_poly);
        return ee.Image(ee_imgC_dw.first());
    }
    // Add additional bands to the image collection
    function addVI(ee_img) {
        // Adds 'date' band to the image which includes a constant uint16 format date value
        function addDate(ee_img) {
            var year = ee_img.date().get("year");
            var month = ee_img.date().get("month");
            var day = ee_img.date().get("day");
            var ee_long_date = year.multiply(10000).add(month.multiply(100)).add(day);
            var dateBand = ee.Image.constant(ee_long_date).uint32().rename("date");
            dateBand = dateBand.updateMask(ee_img.select("B8").mask());
            return ee_img.addBands(dateBand.select("date"));
        }
        var ee_img_latlon = ee.Image.pixelLonLat();
        var ee_img_date = addDate(ee_img);
        var ee_img_compiled = ee_img_date.addBands(
            ee_img_latlon.select("longitude", "latitude")
        );
        return ee_img_compiled;
    }
    // EE function that converts an Image Collection into FeatureCollection
    function imgC_to_fc(ee_imgC) {
        var ee_fc = ee_imgC.map(function (image) {
            var features = image.sample({
                region: ee_search_poly,
                scale: 10,
                geometries: false,
            });
            return features;
        });
        // Merge all feature collections into a single feature collection
        var ee_fc_merged = ee.FeatureCollection(ee_fc.flatten());
        return ee_fc_merged;
    }
    function dw_float_to_uint8(ee_imgC_dw_float) {
        var ee_imgC_dw_float_noLabel = ee_imgC_dw_float.select([
            "water",
            "trees",
            "grass",
            "flooded_vegetation",
            "crops",
            "shrub_and_scrub",
            "built",
            "bare",
            "snow_and_ice",
        ]);
        var ee_imgC_dw_uint8_noLabel = ee_imgC_dw_float_noLabel.map(function (
            ee_img_float
        ) {
            var ee_img_float_scaled = ee_img_float.multiply(255);
            return ee_img_float_scaled.uint8();
        });
        return ee_imgC_dw_uint8_noLabel;
    }
    // Load Sentinel-2 image collection and apply multiple filters to the dataset
    var ee_imgC_s2 = ee
        .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterDate(ee_date_start, ee_date_end)
        .filterBounds(ee_search_poly)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 35))
        .select(["B2", "B4", "B8", "B11", "B12", "SCL", "TCI_R", "TCI_G", "TCI_B"]);
    // Calculate and add NDVI and EVI bands for the collection
    var ee_imgC_s2VI = ee_imgC_s2.map(addVI);
    // Map over the Sentinel-2 EVI collection ang get corresponding Dynamic World collection
    var ee_imgC_DW_float = ee_imgC_s2VI.map(getMatchingDWImage, true);
    // Convert DW probability bands from float to uInt8 to save memory
    var ee_imgC_DW_uint8_noLabel = dw_float_to_uint8(ee_imgC_DW_float);
    // Overwrite the origonal float image collection with the unit8 bands
    var ee_imgC_DW = ee_imgC_DW_float.combine(ee_imgC_DW_uint8_noLabel, true);
    // Combine bands of the DW and S2 collections
    var ee_imgC_s2VI_DW = ee_imgC_s2VI.combine(ee_imgC_DW);
    // Make layer selection before conversion to feature collection
    var ee_imgC_s2VI_DW_select = ee_imgC_s2VI_DW.select([
        "B2",
        "B4",
        "B8",
        "B11",
        "B12",
        "SCL",
        "TCI_R",
        "TCI_G",
        "TCI_B",
        "longitude",
        "latitude",
        "date",
        "water",
        "trees",
        "grass",
        "flooded_vegetation",
        "crops",
        "shrub_and_scrub",
        "built",
        "bare",
        "snow_and_ice",
        "label",
    ]);
    var ee_fc_s2VI_DW_select = imgC_to_fc(ee_imgC_s2VI_DW_select);
    const ee_task_export = ee.batch.Export.table.toCloudStorage({
        collection: ee_fc_s2VI_DW_select,
        description: `GeoJSON Pixel Data`,
        bucket: "environment-data-requests-0",
        fileNamePrefix: filenamePrefix,
        fileFormat: "CSV",
        selectors: [
            "date",
            "longitude",
            "latitude",
            "B2",
            "B4",
            "B8",
            "B11",
            "B12",
            "SCL",
            "TCI_R",
            "TCI_G",
            "TCI_B",
            "water",
            "trees",
            "grass",
            "flooded_vegetation",
            "crops",
            "shrub_and_scrub",
            "built",
            "bare",
            "snow_and_ice",
            "label",
        ],
    });
    ee_task_export.start();
    console.log(`Server: Analysis task exported to Earth Engine...`);
}

// Retrieve Data from Cloud Bucket
async function downloadIntoMemoryCSV(fileNamePrefix) {
    const filename = `${fileNamePrefix}.csv`;
    const bucketName = "environment-data-requests-0";
    const { Storage } = require("@google-cloud/storage");
    const storage = new Storage({
        projectId: "lepidoptera-01",
        credentials: privateKey,
    });
    const contents = await downloadIntoMemory(
        storage,
        bucketName,
        filename
    ).catch(console.error);
    process.on("unhandledRejection", (err) => {
        console.error(err.message);
        process.exitCode = 1;
    });
    return contents;
}







// Download the EE geojson Data from the bucket once it exists
async function downloadIntoMemory(storage, bucketName, fileName) {
    const file = storage.bucket(bucketName).file(fileName);
    let exists = await file.exists().then(function (data) {
        return data[0];
    });
    while (!exists) {
        console.log(`Server: Earth Engine task has not finished yet...`);
        await new Promise((resolve) => setTimeout(resolve, 10000)); // wait for 5 seconds
        exists = await file.exists().then(function (data) {
            return data[0];
        });
    }
    console.log("Server: Earth Engine task finished. Starting Download...");
    console.time("DownloadEEToBuffer");
    const buffer = await file.download();
    console.timeEnd("DownloadEEToBuffer");
    console.log(
        "Server: Download Complete. Formatting response from memory buffer to JSON..."
    );
    //const headerRowJSON = bufferToJson(buffer);
    return buffer.toString(); //headerRowJSON;
}
