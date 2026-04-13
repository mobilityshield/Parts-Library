// Mobility Shield Builder ( mobilityshield.com )
// Flanged Plate Generator by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

var X, Y, flangeRows, thickness, Shole, Dhole, Dcorner, quality;
var flangeTop, flangeBottom, flangeLeft, flangeRight;
var EPS = 0.001;
var MIN_THICKNESS = 0.1;
var MIN_SPACING = 0.1;
var MIN_DIAMETER = 0.1;
var MIN_WEB = 1.0;

function getParameterDefinitions() {
  return [
    { name: 'X', caption: '<b>Main face holes in X:</b>', type: 'int', initial: 5 },
    { name: 'Y', caption: '<b>Main face holes in Y:</b>', type: 'int', initial: 3 },
    { name: 'flangeRows', caption: '<b>Flange rows:</b>', type: 'int', initial: 1 },
    { name: 'flangeTop', caption: '<i>Top flange:</i>', type: 'checkbox', checked: true },
    { name: 'flangeBottom', caption: '<i>Bottom flange:</i>', type: 'checkbox', checked: false },
    { name: 'flangeLeft', caption: '<i>Left flange:</i>', type: 'checkbox', checked: false },
    { name: 'flangeRight', caption: '<i>Right flange:</i>', type: 'checkbox', checked: false },
    { name: 'thickness', caption: '<b>Thickness (mm):</b>', type: 'float', initial: 1.2 },
    { name: 'Shole', caption: '<i>Hole spacing (mm):</i>', type: 'float', initial: 14 },
    { name: 'Dhole', caption: '<i>Hole diameter (mm):</i>', type: 'float', initial: 3.6 },
    { name: 'Dcorner', caption: '<i>Edge margin (mm):</i>', type: 'float', initial: 12 },
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
  X = clampInt(params.X, 1, 999);
  Y = clampInt(params.Y, 1, 999);
  flangeRows = clampInt(params.flangeRows, 1, 999);
  flangeTop = !!params.flangeTop;
  flangeBottom = !!params.flangeBottom;
  flangeLeft = !!params.flangeLeft;
  flangeRight = !!params.flangeRight;
  thickness = sanitizePositive(params.thickness, 1.2, MIN_THICKNESS);
  Shole = sanitizePositive(params.Shole, 14, MIN_SPACING);
  Dcorner = sanitizePositive(params.Dcorner, 12, MIN_DIAMETER);
  Dhole = sanitizePositive(params.Dhole, 3.6, MIN_DIAMETER);
  quality = sanitizeQuality(params.quality);

  Dhole = clampHoleDiameter(Dhole, Shole, Dcorner);

  var baseWidth = panelOuterSize(X);
  var baseDepth = panelOuterSize(Y);
  var flangeHeight = panelOuterSize(flangeRows);
  var solids = [];

  solids.push(translate([0, 0, thickness / 2], buildFlatPanel(X, Y)));

  if (flangeTop) {
    solids.push(buildTopFlange(baseDepth, flangeHeight));
    solids.push(buildBottomChamferFront(baseWidth, baseDepth));
  }

  if (flangeBottom) {
    solids.push(buildBottomFlange(baseDepth, flangeHeight));
    solids.push(buildBottomChamferBack(baseWidth, baseDepth));
  }

  if (flangeLeft) {
    solids.push(buildLeftFlange(baseWidth, flangeHeight));
    solids.push(buildBottomChamferLeft(baseWidth, baseDepth));
  }

  if (flangeRight) {
    solids.push(buildRightFlange(baseWidth, flangeHeight));
    solids.push(buildBottomChamferRight(baseWidth, baseDepth));
  }

  if (flangeTop && flangeLeft) {
    solids.push(buildVerticalCornerChamfer(-baseWidth / 2, baseDepth / 2, -1, 1, flangeHeight));
    solids.push(buildBottomCornerFill(-baseWidth / 2, baseDepth / 2, -1, 1));
  }

  if (flangeTop && flangeRight) {
    solids.push(buildVerticalCornerChamfer(baseWidth / 2, baseDepth / 2, 1, 1, flangeHeight));
    solids.push(buildBottomCornerFill(baseWidth / 2, baseDepth / 2, 1, 1));
  }

  if (flangeBottom && flangeLeft) {
    solids.push(buildVerticalCornerChamfer(-baseWidth / 2, -baseDepth / 2, -1, -1, flangeHeight));
    solids.push(buildBottomCornerFill(-baseWidth / 2, -baseDepth / 2, -1, -1));
  }

  if (flangeBottom && flangeRight) {
    solids.push(buildVerticalCornerChamfer(baseWidth / 2, -baseDepth / 2, 1, -1, flangeHeight));
    solids.push(buildBottomCornerFill(baseWidth / 2, -baseDepth / 2, 1, -1));
  }

  return [color([0, 0.65, 1], union(solids))];
}

function buildTopFlange(baseDepth, flangeHeight) {
  return translate(
    [0, (baseDepth / 2) + (thickness / 2) - EPS, thickness + (flangeHeight / 2)],
    rotate([90, 0, 0], buildFlangePanel(X, flangeRows))
  );
}

function buildBottomFlange(baseDepth, flangeHeight) {
  return translate(
    [0, -(baseDepth / 2) - (thickness / 2) + EPS, thickness + (flangeHeight / 2)],
    rotate([90, 0, 0], buildFlangePanel(X, flangeRows))
  );
}

function buildLeftFlange(baseWidth, flangeHeight) {
  return translate(
    [-(baseWidth / 2) - (thickness / 2) + EPS, 0, thickness + (flangeHeight / 2)],
    rotate([90, 0, 90], buildFlangePanel(Y, flangeRows))
  );
}

function buildRightFlange(baseWidth, flangeHeight) {
  return translate(
    [(baseWidth / 2) + (thickness / 2) - EPS, 0, thickness + (flangeHeight / 2)],
    rotate([90, 0, 90], buildFlangePanel(Y, flangeRows))
  );
}

function buildFlatPanel(cols, rows) {
  var halfX = (Shole * (cols - 1)) / 2;
  var halfY = (Shole * (rows - 1)) / 2;
  var holes = [];
  var ix, iy;

  for (iy = 0; iy < rows; iy++) {
    for (ix = 0; ix < cols; ix++) {
      holes.push(CAG.circle({
        center: [(ix * Shole) - halfX, (iy * Shole) - halfY],
        radius: Dhole / 2,
        resolution: quality
      }));
    }
  }

  return extrudePanel2D(panelOuterSize(cols), panelOuterSize(rows), holes);
}

function buildFlangePanel(cols, rows) {
  var halfX = (Shole * (cols - 1)) / 2;
  var halfY = (Shole * (rows - 1)) / 2;
  var holes = [];
  var ix, iy;

  for (iy = 0; iy < rows; iy++) {
    for (ix = 0; ix < cols; ix++) {
      holes.push(CAG.circle({
        center: [(ix * Shole) - halfX, (iy * Shole) - halfY],
        radius: Dhole / 2,
        resolution: quality
      }));
    }
  }

  return extrudePanel2D(panelOuterSize(cols), panelOuterSize(rows), holes);
}

function extrudePanel2D(width, height, holes) {
  var plate = CAG.rectangle({
    center: [0, 0],
    radius: [width / 2, height / 2]
  });

  if (holes && holes.length > 0) {
    plate = plate.subtract(holes);
  }

  return translate(
    [0, 0, -thickness / 2],
    linear_extrude({ height: thickness }, plate)
  );
}

function buildVerticalCornerChamfer(cornerX, cornerY, dirX, dirY, height) {
  var profile = CAG.fromPoints([
    [0, 0],
    [dirX * thickness, 0],
    [0, dirY * thickness]
  ]);

  return translate(
    [cornerX, cornerY, thickness],
    linear_extrude({ height: height }, profile)
  );
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

function buildBottomChamferBack(length, depth) {
  var profile = CAG.fromPoints([
    [-thickness, -thickness],
    [0, 0],
    [-thickness, 0]
  ]);

  return translate(
    [-(length / 2), -(depth / 2), 0],
    rotate([0, 90, 0], linear_extrude({ height: length }, profile))
  );
}

function buildBottomChamferLeft(width, depth) {
  var profile = CAG.fromPoints([
    [0, 0],
    [0, thickness],
    [-thickness, thickness]
  ]);

  return translate(
    [-(width / 2), depth / 2, 0],
    rotate([90, 0, 0], linear_extrude({ height: depth }, profile))
  );
}

function buildBottomChamferRight(width, depth) {
  var profile = CAG.fromPoints([
    [0, 0],
    [0, thickness],
    [thickness, thickness]
  ]);

  return translate(
    [width / 2, depth / 2, 0],
    rotate([90, 0, 0], linear_extrude({ height: depth }, profile))
  );
}

function buildBottomCornerFill(cornerX, cornerY, dirX, dirY) {
  var points = [
    [cornerX, cornerY, 0],
    [cornerX, cornerY, thickness],
    [cornerX + (dirX * thickness), cornerY, thickness],
    [cornerX, cornerY + (dirY * thickness), thickness]
  ];

  return buildConvexSolid(points, [
    [1, 2, 3],
    [0, 1, 2],
    [0, 3, 1],
    [0, 2, 3]
  ]);
}

function buildConvexSolid(points, faces) {
  var centroid = averagePoint(points);
  var polygons = [];
  var i;

  for (i = 0; i < faces.length; i++) {
    var indices = faces[i].slice(0);
    var p0 = points[indices[0]];
    var p1 = points[indices[1]];
    var p2 = points[indices[2]];
    var normal = cross3(sub3(p1, p0), sub3(p2, p0));
    var faceCenter = averageFace(points, indices);
    var outward = sub3(faceCenter, centroid);

    if (dot3(normal, outward) < 0) {
      indices.reverse();
    }

    polygons.push(new CSG.Polygon([
      new CSG.Vertex(new CSG.Vector3D(points[indices[0]][0], points[indices[0]][1], points[indices[0]][2])),
      new CSG.Vertex(new CSG.Vector3D(points[indices[1]][0], points[indices[1]][1], points[indices[1]][2])),
      new CSG.Vertex(new CSG.Vector3D(points[indices[2]][0], points[indices[2]][1], points[indices[2]][2]))
    ]));
  }

  return CSG.fromPolygons(polygons);
}

function averagePoint(points) {
  var sum = [0, 0, 0];
  var i;

  for (i = 0; i < points.length; i++) {
    sum[0] += points[i][0];
    sum[1] += points[i][1];
    sum[2] += points[i][2];
  }

  return [sum[0] / points.length, sum[1] / points.length, sum[2] / points.length];
}

function averageFace(points, indices) {
  var sum = [0, 0, 0];
  var i;

  for (i = 0; i < indices.length; i++) {
    sum[0] += points[indices[i]][0];
    sum[1] += points[indices[i]][1];
    sum[2] += points[indices[i]][2];
  }

  return [sum[0] / indices.length, sum[1] / indices.length, sum[2] / indices.length];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross3(a, b) {
  return [
    (a[1] * b[2]) - (a[2] * b[1]),
    (a[2] * b[0]) - (a[0] * b[2]),
    (a[0] * b[1]) - (a[1] * b[0])
  ];
}

function dot3(a, b) {
  return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
}

function clampHoleDiameter(diameter, spacing, edgeMargin) {
  var bySpacing = Math.max(MIN_DIAMETER, spacing - MIN_WEB);
  var byEdgeMargin = Math.max(MIN_DIAMETER, edgeMargin - (2 * MIN_WEB));
  return Math.min(diameter, bySpacing, byEdgeMargin);
}

function panelOuterSize(holesCount) {
  return (Shole * (holesCount - 1)) + Dcorner;
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
