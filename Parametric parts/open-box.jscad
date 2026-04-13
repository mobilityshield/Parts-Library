// Mobility Shield Builder ( mobilityshield.com )
// Open Box Generator by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

var X, Y, Z, thickness, Shole, Dhole, Dcorner, quality;

// Editable parameters
function getParameterDefinitions() {
  return [
    { name: 'X', caption: '<b>Holes in X (base/front/back):</b>', type: 'int', initial: 3 },
    { name: 'Y', caption: '<b>Holes in Y (base/left/right):</b>', type: 'int', initial: 3 },
    { name: 'Z', caption: '<b>Holes in Z (wall height):</b>', type: 'int', initial: 2 },
    { name: 'thickness', caption: '<b>Thickness (mm):</b>', type: 'float', initial: 1.2 },
    { name: 'Shole', caption: '<i>Hole spacing (mm):</i>', type: 'float', initial: 14 },
    { name: 'Dhole', caption: '<i>Hole diameter (mm):</i>', type: 'float', initial: 3.6 },
    { name: 'Dcorner', caption: '<i>Edge margin (mm):</i>', type: 'float', initial: 12 },
    { name: 'quality', type: 'choice',
      values: ['8', '16', '32'],
      captions: ['Low', 'Medium', 'High'],
      caption: '<i>Quality:</i>',
      initial: '16' }
  ];
}

function main(params) {
  X = params.X;
  Y = params.Y;
  Z = params.Z;
  thickness = params.thickness;
  Shole = params.Shole;
  Dhole = params.Dhole;
  Dcorner = params.Dcorner;
  quality = parseInt(params.quality, 10);

  var baseWidth = panelOuterSize(X);
  var baseDepth = panelOuterSize(Y);
  var wallHeight = panelOuterSize(Z);

  var base = translate([0, 0, thickness / 2], buildPanel(X, Y));

  // Walls moved outwards so the inner faces are flush with the base perimeter
  var front = translate(
    [0, (baseDepth / 2) + (thickness / 2), thickness + (wallHeight / 2)],
    rotate([90, 0, 0], buildPanel(X, Z))
  );

  var back = translate(
    [0, -(baseDepth / 2) - (thickness / 2), thickness + (wallHeight / 2)],
    rotate([90, 0, 0], buildPanel(X, Z))
  );

  var left = translate(
    [-(baseWidth / 2) - (thickness / 2), 0, thickness + (wallHeight / 2)],
    rotate([90, 0, 90], buildPanel(Y, Z))
  );

  var right = translate(
    [(baseWidth / 2) + (thickness / 2), 0, thickness + (wallHeight / 2)],
    rotate([90, 0, 90], buildPanel(Y, Z))
  );

  // 45 degree external chamfers to connect the walls at the vertical corners
  var chamferFL = buildCornerChamfer(-baseWidth / 2,  baseDepth / 2, -1,  1, wallHeight);
  var chamferFR = buildCornerChamfer( baseWidth / 2,  baseDepth / 2,  1,  1, wallHeight);
  var chamferBL = buildCornerChamfer(-baseWidth / 2, -baseDepth / 2, -1, -1, wallHeight);
  var chamferBR = buildCornerChamfer( baseWidth / 2, -baseDepth / 2,  1, -1, wallHeight);

  // 45 degree external chamfers between the base perimeter and the four walls
  var bottomFront = buildBottomChamferFront(baseWidth, baseDepth);
  var bottomBack = buildBottomChamferBack(baseWidth, baseDepth);
  var bottomLeft = buildBottomChamferLeft(baseWidth, baseDepth);
  var bottomRight = buildBottomChamferRight(baseWidth, baseDepth);

  // Lower corner fills using explicit convex solids compatible with OpenJSCAD v1
  var bottomCornerFL = buildBottomCornerFill(-baseWidth / 2,  baseDepth / 2, -1,  1);
  var bottomCornerFR = buildBottomCornerFill( baseWidth / 2,  baseDepth / 2,  1,  1);
  var bottomCornerBL = buildBottomCornerFill(-baseWidth / 2, -baseDepth / 2, -1, -1);
  var bottomCornerBR = buildBottomCornerFill( baseWidth / 2, -baseDepth / 2,  1, -1);

  return [
    color([0, 0.65, 1], union(
      base, front, back, left, right,
      chamferFL, chamferFR, chamferBL, chamferBR,
      bottomFront, bottomBack, bottomLeft, bottomRight,
      bottomCornerFL, bottomCornerFR, bottomCornerBL, bottomCornerBR
    ))
  ];
}

function buildPanel(cols, rows) {
  var holes = [];
  var halfX = (Shole * (cols - 1)) / 2;
  var halfY = (Shole * (rows - 1)) / 2;
  var panelWidth = panelOuterSize(cols);
  var panelHeight = panelOuterSize(rows);

  var plate = CAG.rectangle({
    center: [0, 0],
    radius: [panelWidth / 2, panelHeight / 2]
  });

  for (var iy = 0; iy < rows; iy++) {
    for (var ix = 0; ix < cols; ix++) {
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

function buildCornerChamfer(cornerX, cornerY, dirX, dirY, height) {
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

  for (var i = 0; i < faces.length; i++) {
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

  for (var i = 0; i < points.length; i++) {
    sum[0] += points[i][0];
    sum[1] += points[i][1];
    sum[2] += points[i][2];
  }

  return [sum[0] / points.length, sum[1] / points.length, sum[2] / points.length];
}

function averageFace(points, indices) {
  var sum = [0, 0, 0];

  for (var i = 0; i < indices.length; i++) {
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

function panelOuterSize(holesCount) {
  return (Shole * (holesCount - 1)) + Dcorner;
}
