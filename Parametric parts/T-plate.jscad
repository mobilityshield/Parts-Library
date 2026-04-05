// Mobility Shield Builder ( mobilityshield.com )
// T Plate Generator by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

var stemX, stemY, topBarY, leftExt, rightExt;
var thickness, Shole, Dhole, Dcorner, quality;
var w = [];

var EPS = 0.001;
var MIN_THICKNESS = 0.1;
var MIN_SPACING = 0.1;
var MIN_DIAMETER = 0.1;
var MIN_WEB = 1.0;

function getParameterDefinitions() {
  return [
    { name: 'stemX', caption: '<b>Stem width holes:</b>', type: 'int', initial: 1 },
    { name: 'stemY', caption: '<b>Stem rows below top bar:</b>', type: 'int', initial: 2 },
    { name: 'topBarY', caption: '<b>Top bar rows:</b>', type: 'int', initial: 1 },
    { name: 'leftExt', caption: '<b>Left extension holes:</b>', type: 'int', initial: 1 },
    { name: 'rightExt', caption: '<b>Right extension holes:</b>', type: 'int', initial: 1 },
    { name: 'thickness', caption: '<b>Thickness (mm):</b>', type: 'float', initial: 1.2 },
    { name: 'Shole', caption: '<i>Hole spacing (mm):</i>', type: 'float', initial: 14 },
    { name: 'Dhole', caption: '<i>Hole diameter (mm):</i>', type: 'float', initial: 3.6 },
    { name: 'Dcorner', caption: '<i>Corner diameter (mm):</i>', type: 'float', initial: 12 },
    {
      name: 'quality',
      type: 'choice',
      values: ['8', '16', '32'],
      captions: ['Low', 'Medium', 'High'],
      caption: '<i>Quality:</i>',
      initial: '16'
    }
  ];
}

function main(params) {
  stemX = clampInt(params.stemX, 1, 999);
  stemY = clampInt(params.stemY, 1, 999);         // filas visibles bajo la barra superior
  topBarY = clampInt(params.topBarY, 1, 999);
  leftExt = clampInt(params.leftExt, 0, 999);
  rightExt = clampInt(params.rightExt, 0, 999);

  thickness = sanitizePositive(params.thickness, 1.2, MIN_THICKNESS);
  Shole = sanitizePositive(params.Shole, 14, MIN_SPACING);
  Dhole = sanitizePositive(params.Dhole, 3.6, MIN_DIAMETER);
  Dcorner = sanitizePositive(params.Dcorner, 12, MIN_DIAMETER);
  quality = sanitizeQuality(params.quality);
  w = [];

  Dhole = Math.min(
    Dhole,
    Math.max(MIN_DIAMETER, Shole - MIN_WEB),
    Math.max(MIN_DIAMETER, Dcorner - MIN_WEB)
  );

  var topBarX = stemX + leftExt + rightExt;
  var stemTotalRows = stemY + 1;      // añade la fila compartida con la barra superior
  var totalRows = stemY + topBarY;    // filas visibles totales
  var totalWidth = Shole * (topBarX - 1);
  var totalHeight = Shole * (totalRows - 1);

  var stemOffsetX = leftExt * Shole;
  var topBarOffsetY = stemY * Shole;

  var stem = roundedRect2D(stemX, stemTotalRows, stemOffsetX, 0);
  var topBar = roundedRect2D(topBarX, topBarY, 0, topBarOffsetY);
  var plate = union(stem, topBar);

  drills(topBarX, stemTotalRows, stemOffsetX, topBarOffsetY);

  return [
    translate([-(totalWidth / 2), -(totalHeight / 2), 0],
      color([0, 0.65, 1],
        linear_extrude({ height: thickness }, plate.subtract(w))
      )
    )
  ];
}

function drills(topBarX, stemTotalRows, stemOffsetX, topBarOffsetY) {
  var seen = {};

  addRectHoles(stemX, stemTotalRows, stemOffsetX, 0, seen);
  addRectHoles(topBarX, topBarY, 0, topBarOffsetY, seen);
}

function addRectHoles(cols, rows, offsetX, offsetY, seen) {
  var ix, iy, cx, cy, key;

  for (iy = 0; iy < rows; iy++) {
    for (ix = 0; ix < cols; ix++) {
      cx = offsetX + (ix * Shole);
      cy = offsetY + (iy * Shole);
      key = cx + ':' + cy;

      if (!seen[key]) {
        seen[key] = true;
        w.push(CAG.circle({
          center: [cx, cy],
          radius: Dhole / 2,
          resolution: quality
        }));
      }
    }
  }
}

function roundedRect2D(cols, rows, offsetX, offsetY) {
  var maxX = offsetX + (Shole * (cols - 1));
  var maxY = offsetY + (Shole * (rows - 1));
  var radius = Math.max(EPS, Dcorner / 2);

  return hullunion(
    CAG.circle({ center: [offsetX, offsetY], radius: radius, resolution: quality }),
    CAG.circle({ center: [maxX, offsetY], radius: radius, resolution: quality }),
    CAG.circle({ center: [offsetX, maxY], radius: radius, resolution: quality }),
    CAG.circle({ center: [maxX, maxY], radius: radius, resolution: quality })
  );
}

function hullunion() {
  var o = Array.prototype.slice.call(arguments);
  return hull(o);
}

function clampInt(value, minValue, maxValue) {
  var parsed = parseInt(value, 10);

  if (!isFinite(parsed)) {
    parsed = minValue;
  }

  return Math.max(minValue, Math.min(maxValue, parsed));
}

function sanitizePositive(value, fallback, minValue) {
  var parsed = parseFloat(value);

  if (!isFinite(parsed)) {
    parsed = fallback;
  }

  return Math.max(minValue, parsed);
}

function sanitizeQuality(value) {
  var parsed = parseInt(value, 10);

  if (parsed !== 8 && parsed !== 16 && parsed !== 32) {
    parsed = 16;
  }

  return parsed;
}
