// Mobility Shield Builder ( mobilityshield.com )
// Curved Strip with Slots Generato by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

var featureCount, arcRise, thickness, Shole, Dhole, Dcorner, quality, useAlternatingSlots, slotStraightLength;
var w = [];
var EPS = 0.001;
var MIN_WEB = 1.0;
var MIN_DIAMETER = 0.1;
var MIN_THICKNESS = 0.1;
var MIN_SPACING = 0.1;

function getParameterDefinitions() {
  return [
    { name: 'featureCount', caption: '<b>Total positions:</b>', type: 'int', initial: 5 },
    { name: 'arcRise', caption: '<b>Arc rise (mm):</b>', type: 'float', initial: 12 },
    { name: 'useAlternatingSlots', caption: '<i>Use alternating interior slots:</i>', type: 'checkbox', checked: false },
    { name: 'slotStraightLength', caption: '<i>Slot straight length (mm):</i>', type: 'float', initial: 6 },
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
  featureCount = clampInt(params.featureCount, 2, 999);
  arcRise = sanitizeNonNegative(params.arcRise, 12);
  useAlternatingSlots = !!params.useAlternatingSlots;
  slotStraightLength = sanitizeNonNegative(params.slotStraightLength, 6);
  thickness = sanitizePositive(params.thickness, 1.2, MIN_THICKNESS);
  Shole = sanitizePositive(params.Shole, 14, MIN_SPACING);
  Dhole = sanitizePositive(params.Dhole, 3.6, MIN_DIAMETER);
  Dcorner = sanitizePositive(params.Dcorner, 12, MIN_DIAMETER);
  quality = sanitizeQuality(params.quality);
  w = [];

  Dhole = Math.min(
    Dhole,
    Math.max(MIN_DIAMETER, Dcorner - MIN_WEB),
    Math.max(MIN_DIAMETER, Shole - MIN_WEB)
  );

  slotStraightLength = clampSlotStraightLength(slotStraightLength);

  var stripRadius = Dcorner / 2;
  var arc = buildArcData(stripRadius);
  var centers = buildArcPoints(arc, featureCount);
  var plate = buildStrip2D(arc, stripRadius);

  drills(arc, centers);

  return [
    translate([0, -(arc.rise / 2), 0],
      color([0, 0.65, 1],
        linear_extrude({ height: thickness }, plate.subtract(w))
      )
    )
  ];
}

function clampSlotStraightLength(length) {
  return Math.min(length, Math.max(0, Shole - Dhole - MIN_WEB));
}

function buildArcData(stripRadius) {
  var arcLength = Shole * (featureCount - 1);
  var maxRiseBySemicircle = Math.max(0, (arcLength / Math.PI) - EPS);
  var maxRiseByStripWidth = maxArcRiseForStrip(arcLength, stripRadius);
  var safeRise = Math.min(arcRise, maxRiseBySemicircle, maxRiseByStripWidth);

  if (safeRise <= EPS) {
    return {
      rise: 0,
      arcLength: arcLength,
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
  var i;

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

  return {
    rise: safeRise,
    arcLength: arcLength,
    radius: radius,
    halfAngle: totalAngle / 2,
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
  var i;

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

function tangentOnArc(arc, t) {
  if (arc.straight) {
    return [1, 0];
  }

  var angle = -arc.halfAngle + (arc.totalAngle * t);
  return normalize2D(Math.cos(angle), -Math.sin(angle));
}

function buildStrip2D(arc, radius) {
  if (arc.straight) {
    return hullunion(
      CAG.circle({ center: [-(arc.arcLength / 2), 0], radius: radius, resolution: quality }),
      CAG.circle({ center: [ (arc.arcLength / 2), 0], radius: radius, resolution: quality })
    );
  }

  var sweepPointCount = Math.max(quality, (featureCount - 1) * 8) + 1;
  var sweepCenters = buildArcPoints(arc, sweepPointCount);

  return buildStripFromSweep(sweepCenters, radius);
}

function buildStripFromSweep(points, radius) {
  var plate = null;
  var i;

  for (i = 0; i < (points.length - 1); i++) {
    var seg = hull([
      CAG.circle({ center: points[i], radius: radius, resolution: quality }),
      CAG.circle({ center: points[i + 1], radius: radius, resolution: quality })
    ]);

    if (plate === null) {
      plate = seg;
    } else {
      plate = union(plate, seg);
    }
  }

  return plate;
}

function drills(arc, centers) {
  var slotsEnabled = useAlternatingSlots && (slotStraightLength > EPS);
  var i, isSlot, t, tangent;

  for (i = 0; i < centers.length; i++) {
    isSlot = slotsEnabled && i > 0 && i < (centers.length - 1) && ((i % 2) === 1);

    if (isSlot) {
      t = i / (centers.length - 1);
      tangent = tangentOnArc(arc, t);
      w.push(buildSlotAtPoint(centers[i], tangent));
    } else {
      w.push(buildHoleAtPoint(centers[i]));
    }
  }
}

function buildHoleAtPoint(center) {
  return CAG.circle({
    center: center,
    radius: Dhole / 2,
    resolution: quality
  });
}

function buildSlotAtPoint(center, tangent) {
  var half = slotStraightLength / 2;
  var dx = tangent[0] * half;
  var dy = tangent[1] * half;

  return hullunion(
    CAG.circle({ center: [center[0] - dx, center[1] - dy], radius: Dhole / 2, resolution: quality }),
    CAG.circle({ center: [center[0] + dx, center[1] + dy], radius: Dhole / 2, resolution: quality })
  );
}

function normalize2D(x, y) {
  var len = Math.sqrt((x * x) + (y * y));

  if (len <= EPS) {
    return [1, 0];
  }

  return [x / len, y / len];
}

function hullunion() {
  var o = Array.prototype.slice.call(arguments);
  return union(hull(o));
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
