// Mobility Shield Builder ( mobilityshield.com )
// Slotted Strip Generato by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

var holes, slotCount, useAlternatingSlots, slotStraightLength, thickness, Shole, Dhole, Dcorner, quality;
var w = [];
var EPS = 0.001;
var MIN_DIAMETER = 0.1;
var MIN_THICKNESS = 0.1;
var MIN_SPACING = 0.1;
var MIN_WEB = 1.0;

function getParameterDefinitions() {
  return [
    { name: 'holes', caption: '<b>Nominal hole positions:</b>', type: 'int', initial: 11 },
    { name: 'slotCount', caption: '<b>Interior slots:</b>', type: 'int', initial: 3 },
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
  holes = clampInt(params.holes, 2, 999);
  useAlternatingSlots = !!params.useAlternatingSlots;
  slotCount = clampInt(params.slotCount, 0, Math.max(0, holes - 2));
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

  slotStraightLength = Math.min(
    slotStraightLength,
    Math.max(0, Shole - Dhole - MIN_WEB)
  );

  var halfSpan = (Shole * (holes - 1)) / 2;
  var stripRadius = Dcorner / 2;

  var plate = hullunion(
    CAG.circle({ center: [-halfSpan, 0], radius: stripRadius, resolution: quality }),
    CAG.circle({ center: [ halfSpan, 0], radius: stripRadius, resolution: quality })
  );

  drills(halfSpan);

  return [
    color([0, 0.65, 1],
      linear_extrude({ height: thickness }, plate.subtract(w))
    )
  ];
}

function drills(halfSpan) {
  var interiorCount = Math.max(0, holes - 2);
  var slotMap = useAlternatingSlots
    ? buildAlternatingSlotMap(interiorCount)
    : buildDistributedSlotMap(interiorCount, slotCount);

  var i, x;

  for (i = 0; i < holes; i++) {
    x = -halfSpan + (i * Shole);

    if (i > 0 && i < (holes - 1) && slotMap[i - 1]) {
      w.push(buildSlotAtX(x));
    } else {
      w.push(CAG.circle({ center: [x, 0], radius: Dhole / 2, resolution: quality }));
    }
  }
}

function buildAlternatingSlotMap(interiorCount) {
  var map = {};
  var i;

  for (i = 0; i < interiorCount; i++) {
    if ((i % 2) === 0) {
      map[i] = true;
    }
  }

  return map;
}

function buildDistributedSlotMap(interiorCount, selectedCount) {
  var map = {};
  var available = [];
  var i, targetIndex, bestPos, bestDist, dist, leftGap, rightGap, j;

  if (interiorCount <= 0 || selectedCount <= 0) {
    return map;
  }

  for (i = 0; i < interiorCount; i++) {
    if ((i % 2) === 0) {
      available.push(i);
    }
  }

  selectedCount = Math.min(selectedCount, available.length);

  if (selectedCount <= 0) {
    return map;
  }

  if (selectedCount === available.length) {
    for (i = 0; i < available.length; i++) {
      map[available[i]] = true;
    }
    return map;
  }

  for (i = 0; i < selectedCount; i++) {
    targetIndex = (available.length === 1) ? 0 : ((i * (available.length - 1)) / Math.max(1, selectedCount - 1));

    bestPos = 0;
    bestDist = Infinity;

    for (j = 0; j < available.length; j++) {
      if (available[j] === -1) continue;

      dist = Math.abs(j - targetIndex);
      leftGap = j;
      rightGap = available.length - 1 - j;
      dist = dist + (Math.abs(leftGap - rightGap) * 0.0001);

      if (dist < bestDist) {
        bestDist = dist;
        bestPos = j;
      }
    }

    map[available[bestPos]] = true;
    available[bestPos] = -1;
  }

  return map;
}

function buildSlotAtX(x) {
  var half = slotStraightLength / 2;

  return hullunion(
    CAG.circle({ center: [x - half, 0], radius: Dhole / 2, resolution: quality }),
    CAG.circle({ center: [x + half, 0], radius: Dhole / 2, resolution: quality })
  );
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
