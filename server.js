const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const session = require("express-session");
const bodyParser = require("body-parser");
const ee = require("@google/earthengine");
const privateKey = {
    type: "service_account",
    project_id: "lepidoptera-01",
    private_key_id: "3f3f7c4d51c42db4b5c4b72df4eebd761b567a71",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCyIz2o6qMlb/e7\nEIyPq5ygt/c9xh7DOWq2I07rtMkKzEzghmMzzEe0mGzpaaeEho9WiqzkxMLbQCzg\nHJ6RtkmYd0/uMTgBAThGEBUl3j+nK8ycfcLUGFpYDuWFxCVX6GJooKo3p9IaoFwL\n3NWRoI3w2KVyppN34UnHnPIK4jK1ZEK8OKVwM+1OQ4TevLSyXEtZmAwPhMMn2d1s\ndsKkzytkI7m3AfoTri0fJ6M32FuDWlsrWQwybTpuA2r/33QXFUWAPUbQ6wLIybbw\n922FU5PjjXQjptTRavRp/AwqddcHLspNH2Vu5FEQaIV8/uBI9V76/ay+3RFPbctk\nM80H1FcjAgMBAAECggEAV5685/aNi88Qp6sCsHJFZspGKtTl8bmususYGRkB4DVQ\nRQnlBqfex0ZIH+EvnCCBpZwtYZMkkyp0SEHbfymN9pgNMUh1Vw0uDExB0rAIWCZT\njM/RAnj+Cx08qTiq85vit7r7Lsf1sNIapF0ZkXlLB+HQM14a4Bboru4UIeVT8uMN\nNKR72GgdbMp11n+yoEZ4MS1JiHhvdAf2A4GVzSYY4auHiHRoRIB/NkQ3tbDUxqQg\nyE+BCuzZafYPLJXjhBeY/j1IcLwl5HsXaouxbwWQ8m1CyCw0OuMCqdgB+R16Wacp\n5F6TtzUZdPvuaPdShj1VCuymzoZnNelrq8u0yRa6uQKBgQDdqj1H+hPCFaJIe2+l\nxhWsW3/FyKW/zJ5cyLbY06d88M+CzZaBqxAmG4uufOVBJGSL3cweRM7kXhUIARhl\nqVLIszvqIsK5dxh/EQb2aTmgrRWO4jSjFiJ6JlwOvsRjNdcQDLlUdKSRMNS1EVqP\niibid4j0ofggsWcC4hijeVr56QKBgQDNuv8dFIIlJ5SJTFd4/57oV/QkiwSTyCG2\nQd+Iv9768QI9esZJx9GM7jIDCKM3F3+2JgbuxkfmzXPhEv8LJB7pH/n7n1h9me/M\nbKelNXNobyQ/238YmYyoz47KO38LLcQyaTbttPLRf7xSJYcqf5GyDKkfqVG1pQ/J\nzhFr3sJVKwKBgQDHEkGw54VhE57H65tMTMZgIVhx3w4EX5aFi3iy5/qOOZKTTWFy\nmJeLMcfTb7VQOIfYGNxc/ryz2U6X/qvTeSqwtk8Dqi4o9C1ayIbxO3UWuPsYdEyD\nfrh97P9V+rtSwiKf9l1m3M6C2lDdQHWNXawoTOQBl4jIi6oQq88m2TD8KQKBgQDN\nZDSQPspT97kGfe4SgfmO80huN1BBjhuCDy/xIcWm+HiJEormXBSsQ54wgy4XsWEy\nY7KmLdTY6yMWgNWZtN0bV25GtOYut0G98HhKqxtmFxe0nRm9YIcafeWLp2yFp5Jp\n1bseBHoriABmbssMNcIqZRNv5aYK2Bj0G8Qu0n1ncwKBgClb3TdwxqzP+1iDRPwZ\nupC5smC4biUURyX0nEiwZnRSDwSolM4RGETYka7udpsj6HLndYHMLzVVmK+LLyX0\nxWkuiGZ9iuMZ3jlfIShUDjI0IRILFTTTk9wgvBVXHSmx4EGYzRJBN7ha+vLY223g\n2SkAs0vmx3M0D6SP5E5UL58P\n-----END PRIVATE KEY-----\n",
    client_email: "service-01@lepidoptera-01.iam.gserviceaccount.com",
    client_id: "117900934518121811125",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/service-01%40lepidoptera-01.iam.gserviceaccount.com",
};

authenticate(ee);

// Get Middleware
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(
    session({
        secret: "34SDgsdgspxxxxxxxdfsG", // just a long random string
        resave: false,
        saveUninitialized: true,
    })
);

// GET Static .html Routing
app.get("/", function (request, response) {
    response.sendFile(__dirname + "/views/index.html");
});
app.get("/about.html", function (request, response) {
    response.sendFile(__dirname + "/views/about.html");
});
app.get("/env.html", function (request, response) {
    response.sendFile(__dirname + "/views/env.html");
});
app.get("/format-questions.html", function (request, response) {
    response.sendFile(__dirname + "/views/format-questions.html");
});
app.get("/howto.html", function (request, response) {
    response.sendFile(__dirname + "/views/howto.html");
});
app.get("/index.html", function (request, response) {
    response.sendFile(__dirname + "/views/index.html");
});
app.get("/login.html", function (request, response) {
    response.sendFile(__dirname + "/views/login.html");
});
app.get("/map.html", function (request, response) {
    response.sendFile(__dirname + "/views/map.html");
});
app.get("/my-account.html", function (request, response) {
    response.sendFile(__dirname + "/views/my-account.html");
});
app.get("/species-interactions.html", function (request, response) {
    response.sendFile(__dirname + "/views/species-interactions.html");
});
app.get("/species-portrait.html", function (request, response) {
    response.sendFile(__dirname + "/views/species-portrait.html");
});
app.get("/cytoscape-style.json", function (request, response) {
    response.sendFile(__dirname + "/public/cytoscape-style.json");
});
app.get("/localspecies.json", function (request, response) {
    response.sendFile(__dirname + "/public/localspecies.json");
});
app.get("/species-portrait-questions.json", function (request, response) {
    response.sendFile(__dirname + "/public/species-portrait-questions.json");
});
// listen for requests
const listener = app.listen(process.env.PORT, function () {
    console.log("Your app is listening on port " + listener.address().port);
});
// POST request handling
app.post("/getEEData", (req, res) => {
    console.log('Server: Analysis Request Recieved...')
    const response = runAnalysis(req.body, req.sessionID);
    console.log('Server: Sending Response...')
    res.json({ eeData: response });
});

// Server Functions
//Authenticate Earth Engine
async function authenticate(ee) {
    await ee.data.authenticateViaPrivateKey(privateKey);
    await ee.initialize();
}

// Run primary Earth Engine Computations
function runAnalysis(coordinates, sessionID) {
    // Get Start and End Dates for Dataset
    //const ee_projection_crs = ee.Projection('EPSG:3857');
    const ee_date_start = ee.Date({ date: "2022-08-01" });
    const ee_date_end = ee.Date({ date: "2022-08-30" });
    // Construct a bounding polygon from the users client side search polygon coordinates
    const ee_search_poly = ee.Geometry({
        type: "Polygon",
        coordinates: coordinates,
        //proj: ee_projection_crs,
    });
    // Construst a filter to return data only within the dates, bounding polygon, and with <35% cloud cover
    const ee_filter_s2 = ee.Filter.and(
        ee.Filter.bounds(ee_search_poly),
        ee.Filter.date(ee_date_start, ee_date_end),
        ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 35)
    );
    // Construct image collection with filter, and with only 'selected' bands
    const ee_imageCollection_s2 = ee
        .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filter(ee_filter_s2)
        .select([
            "B1",
            "B2",
            "B3",
            "B4",
            "B5",
            "B6",
            "B7",
            "B8",
            "B8A",
            "B9",
            "B11",
            "B12",
            "AOT",
            "WVP",
            "SCL",
            "TCI_R",
            "TCI_G",
            "TCI_B",
        ]);
    // Get First chronologcial image in the collection
    const ee_image_s2 = ee.Image(ee_imageCollection_s2.first());
    // Get system index of the first image
    const ee_image_s2_index = ee_image_s2.get("system:index");
    // Create a filter to use on other datasets that only returns an image of the same index as our s2
    const ee_filter_dw = ee.Filter.eq("system:index", ee_image_s2_index);
    // Get Dynamic World image with the same index as our s2
    const ee_imageCollection_dw = ee
        .ImageCollection("GOOGLE/DYNAMICWORLD/V1")
        .filter(ee_filter_dw);
    const ee_image_dw = ee.Image(ee_imageCollection_dw.first()); // Redundent?
    // Append bands from our Dynamic World Image to the origional S2 Image
    const ee_image_compile_1 = ee_image_s2.addBands({
        srcImg: ee_image_dw,
        overwrite: false,
    });
    // Calculate EVI based on the S2 Bands
    const ee_image_evi = getEVI(ee_image_s2).select("EVI");
    // Calculate NDVI based on the S2 Bands
    const ee_image_normdiff = ee_image_s2.normalizedDifference(["B8", "B4"]);
    const ee_image_ndvi = ee_image_normdiff.rename(["NDVI"]);
    // Add EVI bands to S2 Image
    const ee_image_compile_2 = ee_image_compile_1.addBands({
        srcImg: ee_image_evi,
        overwrite: true,
    });
    // Add NDVI bands to S2 Image
    const ee_image_compile_3 = ee_image_compile_2.addBands({
        srcImg: ee_image_ndvi,
        overwrite: false,
    });
    // Retrieve Data from Google as a sample
    const ee_featureCollection_compile = ee_image_compile_3.sample({
        region: ee_search_poly,
        scale: 10,
        //projection: ee_projection_crs,
        geometries: true,
    });
    //const ee_fc_compile_coords = ee_fc_compile.map(ee, projCoord);
    //const ee_img_compile_3_viz = ee_image_compile_3.visualize({'bands': ['B4', 'B3', 'B2'],'min': 0, 'max': 4000});
    const filenamePrefix = `${sessionID}_Compiled`;
    const ee_task_exportcsv = ee.batch.Export.table.toCloudStorage({
        collection: ee_featureCollection_compile,
        description: `GeoJSON Pixel Data for Session:${sessionID}`,
        bucket: "environment-data-requests-0",
        fileNamePrefix: filenamePrefix,
        fileFormat: "GeoJSON",
    });
    ee_task_exportcsv.start();
    console.log(`Server: Exporting Data to Cloud...`);
    console.log(`Server: Fetching Data from Cloud...`);
    const responseData = downloadIntoMemoryJSON(filenamePrefix);
    return responseData;
}

/*
// Logs Init errors to console
function logAnalysisErrors(e) {
    console.error("Initialization error: " + e);
}

// Logs Auth Errors to Console
function logAuthErrors(e) {
    console.error("Authentication error: " + e);
}
*/

// Computes the EVI on a given Sentinal 2 Image
function getEVI(ee_image) {
    const EVI = ee_image
        .expression("2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))", {
            NIR: ee_image.select("B8").divide(10000),
            RED: ee_image.select("B4").divide(10000),
            BLUE: ee_image.select("B2").divide(10000),
        })
        .rename("EVI");
    const ee_image2 = ee_image.addBands(EVI);
    return ee_image2;
}

// Retrieve Data from Cloud Bucket
function downloadIntoMemoryJSON(fileNamePrefix) {
    const filename = `${fileNamePrefix}.json`;
    const bucketName = "environment-data-requests-0";
    const { Storage } = require("@google-cloud/storage");
    const storage = new Storage();
    const contents = downloadIntoMemory(storage, bucketName, filename).catch(
        console.error
    );
    process.on("unhandledRejection", (err) => {
        console.error(err.message);
        process.exitCode = 1;
    });
    return contents;
}

// Async Download Data
async function downloadIntoMemory(storage, bucketName, fileName) {
    // Downloads the file into a buffer in memory.
    const contents = await storage.bucket(bucketName).file(fileName).download();
    console.log(
        `Server: Contents of gs://${bucketName}/${fileName} Recieved.`
    );
    return contents;
}
