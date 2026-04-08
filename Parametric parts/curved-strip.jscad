// Mobility Shield Builder ( mobilityshield.com )
// Curved Strip Generato by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

var holes, arcRise, thickness, Shole, Dhole, Dcorner, quality;
var w = [];
var EPS = 0.001;
var MIN_WEB = 1.0;
var MIN_DIAMETER = 0.1;

function getParameterDefinitions() {
  return [
    { name: 'holes', caption: '<b>Holes:</b>', type: 'int', initial: 9 },
    { name: 'arcRise', caption: '<b>Arc rise (mm):</b>', type: 'float', initial: 12 },
    { name: 'thickness', caption: '<b>Thickness (mm):</b>', type: 'float', initial: 1.2 },
    { name: 'Shole', caption: '<i>Hole spacing (mm):</i>', type: 'float', initial: 14 },
    { name: 'Dhole', caption: '<i>Hole diameter (mm):</i>', type: 'float', initial: 3.6 },
    { name: 'Dcorner', caption: '<i>Corner diameter (mm):</i>', type: 'float', initial: 12 },
    { name: 'quality', type: 'choice',
      values: ['8', '16', '32'],
      captions: ['Low', 'Medium', 'High'],
      caption: '<i>Quality:</i>',
      initial: '16' }
  ];
}

function main(params) {
  holes = clampInt(params.holes, 2, 999);
  arcRise = sanitizeNonNegative(params.arcRise, 12);
  thickness = sanitizePositive(params.thickness, 1.2, 0.1);
  Shole = sanitizePositive(params.Shole, 14, 0.1);
  Dhole = sanitizePositive(params.Dhole, 3.6, MIN_DIAMETER);
  Dcorner = sanitizePositive(params.Dcorner, 12, MIN_DIAMETER);
  quality = sanitizeQuality(params.quality);
  w = [];

  Dhole = Math.min(
    Dhole,
    Math.max(MIN_DIAMETER, Dcorner - MIN_WEB),
    Math.max(MIN_DIAMETER, Shole - MIN_WEB)
  );

  var stripRadius = Dcorner / 2;
  var arc = buildArcData(stripRadius);
  var holeCenters = buildArcPoints(arc, holes);
  var plate = buildStrip2D(arc, stripRadius);

  drills(holeCenters);

  return [
    translate([0, -(arc.rise / 2), 0],
      color([0, 0.65, 1],
        linear_extrude({ height: thickness }, plate.subtract(w))
      )
    )
  ];
}

function buildArcData(stripRadius) {
  var arcLength = Shole * (holes - 1);
  var maxRiseBySemicircle = Math.max(0, (arcLength / Math.PI) - EPS);
  var maxRiseByStripWidth = maxArcRiseForStrip(arcLength, stripRadius);
  var safeRise = Math.min(arcRise, maxRiseBySemicircle, maxRiseByStripWidth);

  if (safeRise <= EPS) {
    return {
      rise: 0,
      arcLength: arcLength,
      chordLength: arcLength,
      radius: 0,
      halfAngle: 0,
      totalAngle: 0,
      centerY: 0,
      straight: true
    };
  }

  var low = EPS;
  var high = Math.PI - EPS;
  var mid = 0;
  var i = 0;

  for (i = 0; i < 80; i++) {
    mid = (low + high) / 2;

    if (riseFromArcLengthAndAngle(arcLength, mid) < safeRise) {
      low = mid;
    } else {
      high = mid;
    }
  }

  var totalAngle = (low + high) / 2;
  var radius = arcLength / totalAngle;
  var halfAngle = totalAngle / 2;
  var chordLength = 2 * radius * Math.sin(halfAngle);

  return {
    rise: safeRise,
    arcLength: arcLength,
    chordLength: chordLength,
    radius: radius,
    halfAngle: halfAngle,
    totalAngle: totalAngle,
    centerY: -(radius - safeRise),
    straight: false
  };
}

function maxArcRiseForStrip(arcLength, stripRadius) {
  var safeRadius = Math.max(stripRadius + EPS, EPS);
  var maxAngle = Math.min(Math.PI - EPS, Math.max(EPS, (arcLength / safeRadius) - EPS));
  return riseFromArcLengthAndAngle(arcLength, maxAngle);
}

function riseFromArcLengthAndAngle(arcLength, totalAngle) {
  var radius = arcLength / totalAngle;
  return radius * (1 - Math.cos(totalAngle / 2));
}

function buildArcPoints(arc, count) {
  var points = [];
  var i = 0;

  if (count <= 1) {
    return [[0, 0]];
  }

  if (arc.straight) {
    for (i = 0; i < count; i++) {
      points.push([
        -(arc.arcLength / 2) + (arc.arcLength * i / (count - 1)),
        0
      ]);
    }

    return points;
  }

  for (i = 0; i < count; i++) {
    points.push(pointOnArc(arc, i / (count - 1)));
  }

  return points;
}

function pointOnArc(arc, t) {
  var angle = -arc.halfAngle + (arc.totalAngle * t);

  return [
    arc.radius * Math.sin(angle),
    arc.centerY + (arc.radius * Math.cos(angle))
  ];
}

function buildStrip2D(arc, radius) {
  if (arc.straight) {
    return hullunion(
      CAG.circle({ center: [-(arc.arcLength / 2), 0], radius: radius, resolution: quality }),
      CAG.circle({ center: [ (arc.arcLength / 2), 0], radius: radius, resolution: quality })
    );
  }

  var sweepPointCount = Math.max(quality, (holes - 1) * 8) + 1;
  var sweepCenters = buildArcPoints(arc, sweepPointCount);

  return buildStripFromSweep(sweepCenters, radius);
}

function buildStripFromSweep(points, radius) {
  var plate = null;
  var i = 0;

  for (i = 0; i < (points.length - 1); i++) {
    var a = CAG.circle({ center: points[i], radius: radius, resolution: quality });
    var b = CAG.circle({ center: points[i + 1], radius: radius, resolution: quality });
    var segment = hull([a, b]);

    if (plate === null) {
      plate = segment;
    } else {
      plate = union(plate, segment);
    }
  }

  return plate;
}

function drills(points) {
  var i = 0;

  for (i = 0; i < points.length; i++) {
    w.push(CAG.circle({ center: points[i], radius: Dhole / 2, resolution: quality }));
  }
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

function hullunion() {
  var o = Array.prototype.slice.call(arguments);
  return union(hull(o));
}
