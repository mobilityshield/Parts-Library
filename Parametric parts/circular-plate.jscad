// Mobility Shield Builder ( mobilityshield.com )
// Circular Plate Generator by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

var outerDiameter, thickness, Shole, Dhole, quality, allowEdgeHoles, holeClearance;
var w = [];

var EPS = 0.001;
var MIN_THICKNESS = 0.1;
var MIN_SPACING = 0.1;
var MIN_DIAMETER = 0.1;
var MIN_WEB = 1.0;

function getParameterDefinitions() {
  return [
    { name: 'outerDiameter', caption: '<b>Outer diameter (mm):</b>', type: 'float', initial: 100.0 },
    { name: 'thickness', caption: '<b>Thickness (mm):</b>', type: 'float', initial: 1.2 },
    { name: 'Shole', caption: '<i>Hole spacing (mm):</i>', type: 'float', initial: 14 },
    { name: 'Dhole', caption: '<i>Hole diameter (mm):</i>', type: 'float', initial: 3.6 },
    { name: 'allowEdgeHoles', caption: '<i>Allow edge-touching holes:</i>', type: 'checkbox', checked: false },
    { name: 'holeClearance', caption: '<i>Edge clearance (mm):</i>', type: 'float', initial: 2 },
    {
      name: 'quality',
      type: 'choice',
      values: ['8', '16', '32'],
      captions: ['Low', 'Medium', 'High'],
      caption: '<i>Quality:</i>',
      initial: '32'
    }
  ];
}

function main(params) {
  outerDiameter = sanitizePositive(params.outerDiameter, 101.6, MIN_DIAMETER);
  thickness = sanitizePositive(params.thickness, 1.2, MIN_THICKNESS);
  Shole = sanitizePositive(params.Shole, 14, MIN_SPACING);
  Dhole = sanitizePositive(params.Dhole, 3.6, MIN_DIAMETER);
  allowEdgeHoles = !!params.allowEdgeHoles;
  holeClearance = sanitizeNonNegative(params.holeClearance, 1);
  quality = sanitizeQuality(params.quality);
  w = [];

  // Prevent hole size from collapsing the web between adjacent holes.
  Dhole = Math.min(Dhole, Math.max(MIN_DIAMETER, Shole - MIN_WEB));

  var outerRadius = outerDiameter / 2;
  var plate = CAG.circle({
    center: [0, 0],
    radius: outerRadius,
    resolution: quality
  });

  drills(outerRadius);

  return [
    color([0, 0.65, 1],
      linear_extrude({ height: thickness }, plate.subtract(w))
    )
  ];
}

function drills(outerRadius) {
  var holeRadius = Dhole / 2;

  // If edge holes are allowed, include any hole that intersects the plate.
  // Otherwise require full containment plus requested clearance.
  var centerLimit = allowEdgeHoles
    ? (outerRadius + holeRadius + EPS)
    : Math.max(0, outerRadius - holeRadius - holeClearance + EPS);

  var maxIndex = Math.ceil(centerLimit / Shole);
  var centerLimitSq = centerLimit * centerLimit;

  for (var iy = -maxIndex; iy <= maxIndex; iy++) {
    var cy = iy * Shole;
    var cySq = cy * cy;

    for (var ix = -maxIndex; ix <= maxIndex; ix++) {
      var cx = ix * Shole;
      var distSq = (cx * cx) + cySq;

      if (distSq <= centerLimitSq) {
        w.push(CAG.circle({
          center: [cx, cy],
          radius: holeRadius,
          resolution: quality
        }));
      }
    }
  }
}

function sanitizePositive(value, fallback, minValue) {
  var parsed = parseFloat(value);

  if (!isFinite(parsed)) {
    parsed = fallback;
  }

  return Math.max(minValue, parsed);
}

function sanitizeNonNegative(value, fallback) {
  var parsed = parseFloat(value);

  if (!isFinite(parsed)) {
    parsed = fallback;
  }

  return Math.max(0, parsed);
}

function sanitizeQuality(value) {
  var parsed = parseInt(value, 10);

  if (parsed !== 8 && parsed !== 16 && parsed !== 32) {
    parsed = 16;
  }

  return parsed;
}
