// Mobility Shield Builder ( mobilityshield.com )
// Circular Strip Generator by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

var mode, pitchRadius, holeCount, thickness, Shole, Dhole, Dcorner, quality;
var w = [];

var EPS = 0.001;
var MIN_DIAMETER = 0.1;
var MIN_THICKNESS = 0.1;
var MIN_SPACING = 0.1;
var MIN_WEB = 1.0;

function getParameterDefinitions() {
  return [
    {
      name: 'mode',
      caption: '<b>Definition mode:</b>',
      type: 'choice',
      values: ['radius', 'spacing'],
      captions: ['By pitch radius', 'By hole spacing'],
      initial: 'spacing'
    },
    { name: 'pitchRadius', caption: '<b>Pitch radius (mm):</b>', type: 'float', initial: 31.8 },
    { name: 'holeCount', caption: '<b>Holes:</b>', type: 'int', initial: 14 },
    { name: 'thickness', caption: '<b>Thickness (mm):</b>', type: 'float', initial: 1.2 },
    { name: 'Shole', caption: '<i>Hole spacing (mm, spacing mode):</i>', type: 'float', initial: 14 },
    { name: 'Dhole', caption: '<i>Hole diameter (mm):</i>', type: 'float', initial: 3.6 },
    { name: 'Dcorner', caption: '<i>Strip width / corner diameter (mm):</i>', type: 'float', initial: 12 },
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
  mode = sanitizeMode(params.mode);
  holeCount = clampInt(params.holeCount, 2, 999);
  pitchRadius = sanitizePositive(params.pitchRadius, 31.8, MIN_DIAMETER);
  thickness = sanitizePositive(params.thickness, 1.2, MIN_THICKNESS);
  Shole = sanitizePositive(params.Shole, 14, MIN_SPACING);
  Dhole = sanitizePositive(params.Dhole, 3.6, MIN_DIAMETER);
  Dcorner = sanitizePositive(params.Dcorner, 12, MIN_DIAMETER);
  quality = sanitizeQuality(params.quality);
  w = [];

  var stripRadius = Dcorner / 2;

  pitchRadius = resolvePitchRadius(mode, pitchRadius, holeCount, Shole, stripRadius);

  var actualSpacing = chordSpacingForCircle(pitchRadius, holeCount);

  Dhole = Math.min(
    Dhole,
    Math.max(MIN_DIAMETER, Dcorner - MIN_WEB),
    Math.max(MIN_DIAMETER, actualSpacing - MIN_WEB)
  );

  var outerRadius = pitchRadius + stripRadius;
  var innerRadius = Math.max(EPS, pitchRadius - stripRadius);
  var radialResolution = getRadialResolution(holeCount, quality);

  var ring = CAG.circle({
    center: [0, 0],
    radius: outerRadius,
    resolution: radialResolution
  }).subtract(
    CAG.circle({
      center: [0, 0],
      radius: innerRadius,
      resolution: radialResolution
    })
  );

  drills(pitchRadius);

  return [
    color([0, 0.65, 1],
      linear_extrude({ height: thickness }, ring.subtract(w))
    )
  ];
}

function resolvePitchRadius(modeValue, radiusValue, count, spacing, stripRadius) {
  var resolvedRadius;

  if (modeValue === 'spacing') {
    resolvedRadius = pitchRadiusFromSpacing(count, spacing);
  } else {
    resolvedRadius = radiusValue;
  }

  return Math.max(stripRadius + EPS, resolvedRadius);
}

function pitchRadiusFromSpacing(count, spacing) {
  var halfStepAngle = Math.PI / count;
  var denom = 2 * Math.sin(halfStepAngle);

  if (denom <= EPS) {
    return spacing / 2;
  }

  return spacing / denom;
}

function chordSpacingForCircle(radius, count) {
  if (count <= 1) {
    return 0;
  }

  return 2 * radius * Math.sin(Math.PI / count);
}

function drills(radius) {
  for (var i = 0; i < holeCount; i++) {
    var angle = -Math.PI / 2 + ((2 * Math.PI * i) / holeCount);
    var cx = radius * Math.cos(angle);
    var cy = radius * Math.sin(angle);

    w.push(CAG.circle({
      center: [cx, cy],
      radius: Dhole / 2,
      resolution: quality
    }));
  }
}

function getRadialResolution(count, baseQuality) {
  return Math.min(512, Math.max(baseQuality * 2, count * 2));
}

function sanitizeMode(value) {
  return (value === 'radius' || value === 'spacing') ? value : 'spacing';
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
