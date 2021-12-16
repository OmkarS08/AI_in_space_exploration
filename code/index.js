// import country dataset
var countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017');
var roi = countries.filter(ee.Filter.eq('country_na', 'Swaziland'));
Map.addLayer(roi, {}, 'Swaziland', false);

//load sentinel data
var image = ee.ImageCollection("COPERNICUS/S2_SR")
    .filterDate('2020-01-01', '2020-01-30') // filtering out date
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) // filtering out clound contamination
    .filterBounds(roi) // bounded to our study region
    .median(); //agregating into a single image

// create visualisation

var visParamTrue = { bands: ['B4', 'B3', 'B2'], min: 0, max: 2500, gamma: 1.1 };
Map.addLayer(image.clip(roi), visParamTrue, 'Sentinel 2020')
Map.centerObject(roi, 8);

//Training Data Set
var training = Water.merge(barrenland).merge(cropLand).merge(UrbanCity);
print(training);
var label = "Class";
var bands = ['B2', 'B3', 'B4', 'B8'];
var input = image.select(bands);

//Overlay the points on the imagenery to get training
var trainImage = input.sampleRegions({
    collection: training,
    properties: [label],
    scale: 30
});

var trainingData = trainImage.randomColumn();
var trainSet = trainingData.filter(ee.Filter.lessThan('random', 0.8));
var testSet = trainingData.filter(ee.Filter.greaterThanOrEquals('random', 0.8));

//Classification Model
var classifier = ee.Classifier.smileCart().train(trainSet, label, bands);

//classify the Image
var classified = input.classify(classifier);

//DEfine a pallete for the classification

var landcoverPallete = ['07ECF5', //water(0)
    'F5D007', //barren(1)
    '5BF507', //cropland(2)
    'F50707', //urbancity(3)
];
Map.addLayer(classified.clip(roi), { palette: landcoverPallete, min: 0, max: 4 }, 'Classification CART');


//Acuracy Assement
var ConfusionMatrix = ee.ConfusionMatrix(testSet.classify(classifier)
    .errorMatrix({
        actual: 'Class',
        predicted: 'classification'
    }));
print('ConfusionMatrix:', ConfusionMatrix);
print('Overall Accuracy:', ConfusionMatrix.accuracy());