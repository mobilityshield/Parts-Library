// Mobility Shield Builder ( mobilityshield.com )
// Rectangular Frame Generator by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

var X, Y, frameX, frameY, thickness, Shole, Dhole, Dcorner, quality;
var w = [];
var EPS = 0.001;

function getParameterDefinitions() {
  return [
    { name: 'X', caption: '<b>Outer holes in X:</b>', type: 'int', initial: 6 },
    { name: 'Y', caption: '<b>Outer holes in Y:</b>', type: 'int', initial: 4 },
    { name: 'frameX', caption: '<b>Frame holes in X:</b>', type: 'int', initial: 1 },
    { name: 'frameY', caption: '<b>Frame holes in Y:</b>', type: 'int', initial: 1 },
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
  X = clampInt(params.X, 3, 999);
  Y = clampInt(params.Y, 3, 999);
  frameX = clampInt(params.frameX, 1, Math.floor((X - 1) / 2));
  frameY = clampInt(params.frameY, 1, Math.floor((Y - 1) / 2));
  thickness = sanitizePositive(params.thickness, 1.2, 0.1);
  Shole = sanitizePositive(params.Shole, 14, 0.1);
  Dhole = sanitizePositive(params.Dhole, 3.6, 0.1);
  Dcorner = sanitizePositive(params.Dcorner, 12, 0.1);
  quality = sanitizeQuality(params.quality);
  w = [];

  var totalWidth = Shole * (X - 1);
  var totalHeight = Shole * (Y - 1);
  var outerRadius = clampOuterRadius(Dcorner / 2, totalWidth, totalHeight);
  var holeRadius = Dhole / 2;
  var plate = roundedRectByCornerHoleCenters(0, 0, totalWidth, totalHeight, outerRadius);
  var innerOpening = buildInnerOpening2D();

  if (innerOpening) {
    plate = plate.subtract(innerOpening);
  }

  drills(holeRadius);

  return [
    translate([-(totalWidth / 2), -(totalHeight / 2), 0],
      color([0, 0.65, 1],
        linear_extrude({ height: thickness }, plate.subtract(w))
      )
    )
  ];
}

function buildInnerOpening2D() {
  var innerMinCenterX = (frameX - 1) * Shole;
  var innerMaxCenterX = (X - frameX) * Shole;
  var innerMinCenterY = (frameY - 1) * Shole;
  var innerMaxCenterY = (Y - frameY) * Shole;
  var innerCenterSpanX = innerMaxCenterX - innerMinCenterX;
  var innerCenterSpanY = innerMaxCenterY - innerMinCenterY;

  if (innerCenterSpanX <= 0 || innerCenterSpanY <= 0) {
    return null;
  }

  // The inner border is measured from the INNER corner-hole centers toward
  // the opening. Therefore, exterior and interior react in the same direction
  // when Dcorner changes.
  var innerRadius = clampInnerRadius(Dcorner / 2, innerCenterSpanX, innerCenterSpanY);
  var minX = innerMinCenterX + innerRadius;
  var maxX = innerMaxCenterX - innerRadius;
  var minY = innerMinCenterY + innerRadius;
  var maxY = innerMaxCenterY - innerRadius;

  if (minX >= maxX || minY >= maxY) {
    return null;
  }

  return roundedRectFromBounds(minX, minY, maxX, maxY, innerRadius);
}

function drills(holeRadius) {
  for (var iy = 0; iy < Y; iy++) {
    for (var ix = 0; ix < X; ix++) {
      if (ix < frameX || ix >= (X - frameX) || iy < frameY || iy >= (Y - frameY)) {
        w.push(CAG.circle({ center: [Shole * ix, Shole * iy], radius: holeRadius, resolution: quality }));
      }
    }
  }
}

function roundedRectByCornerHoleCenters(minCenterX, minCenterY, maxCenterX, maxCenterY, radius) {
  return hullunion(
    CAG.circle({ center: [minCenterX, minCenterY], radius: radius, resolution: quality }),
    CAG.circle({ center: [maxCenterX, minCenterY], radius: radius, resolution: quality }),
    CAG.circle({ center: [minCenterX, maxCenterY], radius: radius, resolution: quality }),
    CAG.circle({ center: [maxCenterX, maxCenterY], radius: radius, resolution: quality })
  );
}

function roundedRectFromBounds(minX, minY, maxX, maxY, radius) {
  var width = maxX - minX;
  var height = maxY - minY;
  var safeRadius = Math.max(EPS, Math.min(radius, width / 2, height / 2));

  return hullunion(
    CAG.circle({ center: [minX + safeRadius, minY + safeRadius], radius: safeRadius, resolution: quality }),
    CAG.circle({ center: [maxX - safeRadius, minY + safeRadius], radius: safeRadius, resolution: quality }),
    CAG.circle({ center: [minX + safeRadius, maxY - safeRadius], radius: safeRadius, resolution: quality }),
    CAG.circle({ center: [maxX - safeRadius, maxY - safeRadius], radius: safeRadius, resolution: quality })
  );
}

function clampOuterRadius(radius, totalWidth, totalHeight) {
  return Math.max(EPS, Math.min(radius, totalWidth / 2, totalHeight / 2));
}

function clampInnerRadius(radius, centerSpanX, centerSpanY) {
  // To keep the inner edge at +radius from the inner hole centers, and still
  // be able to build a valid rounded rectangle, the radius cannot exceed a
  // quarter of the inner center span in either direction.
  return Math.max(EPS, Math.min(radius, centerSpanX / 4, centerSpanY / 4));
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

function hullunion() {
  var o = Array.prototype.slice.call(arguments);
  return hull(o);
}
