// Mobility Shield Builder ( mobilityshield.com )
// Angle Girder Generator by J.Rodrigo ( jrodrigo.net )
// Licence: Creative Commons — Attribution and Share Alike 

var lengthHoles, baseRows, wallRows, thickness, Shole, Dhole, Dcorner, quality;

var EPS = 0.001;
var MIN_THICKNESS = 0.1;
var MIN_SPACING = 0.1;
var MIN_DIAMETER = 0.1;
var MIN_WEB = 1.0;

function getParameterDefinitions() {
  return [
    { name: 'lengthHoles', caption: '<b>Length holes:</b>', type: 'int', initial: 5 },
    { name: 'baseRows', caption: '<b>Horizontal wing rows:</b>', type: 'int', initial: 1 },
    { name: 'wallRows', caption: '<b>Vertical wing rows:</b>', type: 'int', initial: 1 },
    { name: 'thickness', caption: '<b>Thickness (mm):</b>', type: 'float', initial: 1.2 },
    { name: 'Shole', caption: '<i>Hole spacing (mm):</i>', type: 'float', initial: 14 },
    { name: 'Dhole', caption: '<i>Hole diameter (mm):</i>', type: 'float', initial: 3.6 },
    { name: 'Dcorner', caption: '<i>Corner diameter / strip width (mm):</i>', type: 'float', initial: 12 },
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
  lengthHoles = clampInt(params.lengthHoles, 1, 999);
  baseRows = clampInt(params.baseRows, 1, 999);
  wallRows = clampInt(params.wallRows, 1, 999);

  thickness = sanitizePositive(params.thickness, 1.2, MIN_THICKNESS);
  Shole = sanitizePositive(params.Shole, 14, MIN_SPACING);
  Dhole = sanitizePositive(params.Dhole, 3.6, MIN_DIAMETER);
  Dcorner = sanitizePositive(params.Dcorner, 12, MIN_DIAMETER);
  quality = sanitizeQuality(params.quality);

  Dhole = Math.min(
    Dhole,
    Math.max(MIN_DIAMETER, Shole - MIN_WEB),
    Math.max(MIN_DIAMETER, Dcorner - MIN_WEB)
  );

  var girderLength = panelOuterSize(lengthHoles);
  var baseDepth = panelOuterSize(baseRows);
  var wallHeight = panelOuterSize(wallRows);

  var base = buildBase(girderLength, baseDepth);
  var wall = buildWall(girderLength, baseDepth, wallHeight);
  var bottomChamfer = buildBottomChamferFront(girderLength, baseDepth);

  return [
    color([0, 0.65, 1], union(
      base,
      wall,
      bottomChamfer
    ))
  ];
}

function buildBase(girderLength, baseDepth) {
  // Ala horizontal:
  // - apoyada sobre la superficie de trabajo
  // - comparte su borde superior con el ala vertical
  // - se redondean solo las esquinas del borde libre
  return translate(
    [0, 0, thickness / 2],
    buildPanel(lengthHoles, baseRows, true, true, false, false)
  );
}

function buildWall(girderLength, baseDepth, wallHeight) {
  // Ala vertical:
  // - apoyada sobre el borde superior del ala horizontal
  // - comparte el borde inferior con la base
  // - se redondean solo las esquinas superiores libres
  return translate(
    [0, (baseDepth / 2) + (thickness / 2), thickness + (wallHeight / 2)],
    rotate([90, 0, 0], buildPanel(lengthHoles, wallRows, false, false, true, true))
  );
}

function buildPanel(cols, rows, roundBL, roundBR, roundTL, roundTR) {
  var holes = [];
  var halfX = (Shole * (cols - 1)) / 2;
  var halfY = (Shole * (rows - 1)) / 2;
  var panelWidth = panelOuterSize(cols);
  var panelHeight = panelOuterSize(rows);
  var radius = clampOuterRadius(Dcorner / 2, panelWidth, panelHeight);
  var ix, iy;

  var plate = CAG.rectangle({
    center: [0, 0],
    radius: [panelWidth / 2, panelHeight / 2]
  });

  plate = applyOuterCornerRounds(
    plate,
    -panelWidth / 2, -panelHeight / 2,
     panelWidth / 2,  panelHeight / 2,
    radius,
    roundBL, roundBR, roundTL, roundTR
  );

  for (iy = 0; iy < rows; iy++) {
    for (ix = 0; ix < cols; ix++) {
      holes.push(
        CAG.circle({
          center: [(ix * Shole) - halfX, (iy * Shole) - halfY],
          radius: Dhole / 2,
          resolution: quality
        })
      );
    }
  }

  return translate(
    [0, 0, -thickness / 2],
    linear_extrude({ height: thickness }, plate.subtract(holes))
  );
}

function applyOuterCornerRounds(plate, minX, minY, maxX, maxY, radius, roundBL, roundBR, roundTL, roundTR) {
  if (roundBL) {
    plate = roundPanelCorner(plate, minX, minY, radius, -1, -1);
  }

  if (roundBR) {
    plate = roundPanelCorner(plate, maxX, minY, radius, 1, -1);
  }

  if (roundTL) {
    plate = roundPanelCorner(plate, minX, maxY, radius, -1, 1);
  }

  if (roundTR) {
    plate = roundPanelCorner(plate, maxX, maxY, radius, 1, 1);
  }

  return plate;
}

function roundPanelCorner(plate, cornerX, cornerY, radius, dirX, dirY) {
  if (radius <= EPS) {
    return plate;
  }

  var cutSquare = CAG.rectangle({
    center: [
      cornerX - (dirX * radius / 2),
      cornerY - (dirY * radius / 2)
    ],
    radius: [radius / 2, radius / 2]
  });

  var quarterCircle = buildQuarterCircle2D(
    cornerX - (dirX * radius),
    cornerY - (dirY * radius),
    dirX,
    dirY,
    radius
  );

  return plate.subtract(cutSquare.subtract(quarterCircle));
}

function buildQuarterCircle2D(centerX, centerY, dirX, dirY, radius) {
  var circle = CAG.circle({
    center: [centerX, centerY],
    radius: radius,
    resolution: quality
  });

  var clipRect = CAG.rectangle({
    center: [
      centerX + ((dirX * radius) / 2),
      centerY + ((dirY * radius) / 2)
    ],
    radius: [radius / 2, radius / 2]
  });

  return circle.intersect(clipRect);
}

function buildBottomChamferFront(length, depth) {
  var profile = CAG.fromPoints([
    [-thickness, 0],
    [0, 0],
    [-thickness, thickness]
  ]);

  return translate(
    [-(length / 2), depth / 2, 0],
    rotate([0, 90, 0], linear_extrude({ height: length }, profile))
  );
}

function panelOuterSize(holesCount) {
  return (Shole * (holesCount - 1)) + Dcorner;
}

function clampOuterRadius(radius, totalWidth, totalHeight) {
  return Math.max(EPS, Math.min(radius, totalWidth / 2, totalHeight / 2));
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
