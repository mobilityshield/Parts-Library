// Mobility Shield Builder ( mobilityshield.com )
// Triangular Corner Brace Generator by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike

var X, Y, Z, thickness, Shole, Dhole, Dcorner, quality, allowEdgeHoles, holeClearance;

var EPS = 0.001;
var MIN_THICKNESS = 0.1;
var MIN_SPACING = 0.1;
var MIN_DIAMETER = 0.1;
var MIN_WEB = 1.0;

// Editable parameters
function getParameterDefinitions() {
  return [
    { name: 'X', caption: '<b>Holes in X (base/front):</b>', type: 'int', initial: 3 },
    { name: 'Y', caption: '<b>Holes in Y (base/left):</b>', type: 'int', initial: 3 },
    { name: 'Z', caption: '<b>Holes in Z (wall height):</b>', type: 'int', initial: 2 },
    { name: 'thickness', caption: '<b>Thickness (mm):</b>', type: 'float', initial: 1.2 },
    { name: 'Shole', caption: '<i>Hole spacing (mm):</i>', type: 'float', initial: 14 },
    { name: 'Dhole', caption: '<i>Hole diameter (mm):</i>', type: 'float', initial: 3.6 },
    { name: 'Dcorner', caption: '<i>Corner diameter (mm):</i>', type: 'float', initial: 12 },
    { name: 'allowEdgeHoles', caption: '<i>Allow edge-touching holes:</i>', type: 'checkbox', checked: false },
    { name: 'holeClearance', caption: '<i>Edge clearance (mm):</i>', type: 'float', initial: 1 },
    { name: 'quality', type: 'choice',
      values: ['8', '16', '32'],
      captions: ['Low', 'Medium', 'High'],
      caption: '<i>Quality:</i>',
      initial: '16' }
  ];
}

function main(params) {
  X = clampInt(params.X, 1, 999);
  Y = clampInt(params.Y, 1, 999);
  Z = clampInt(params.Z, 1, 999);

  thickness = sanitizePositive(params.thickness, 1.2, MIN_THICKNESS);
  Shole = sanitizePositive(params.Shole, 14, MIN_SPACING);
  Dhole = sanitizePositive(params.Dhole, 3.6, MIN_DIAMETER);
  Dcorner = sanitizePositive(params.Dcorner, 12, MIN_DIAMETER);
  allowEdgeHoles = !!params.allowEdgeHoles;
  holeClearance = sanitizeNonNegative(params.holeClearance, 1);
  quality = sanitizeQuality(params.quality);

  // Prevent hole diameters from collapsing the material between holes.
  Dhole = Math.min(Dhole, Math.max(MIN_DIAMETER, Shole - MIN_WEB));

  var baseWidth = panelOuterSize(X);
  var baseDepth = panelOuterSize(Y);
  var wallHeight = panelOuterSize(Z);

  // All three faces are triangular.
  var base = translate([0, 0, thickness / 2], buildTriangularPanel(X, Y, 'TL'));

  // Walls moved outwards so the inner faces are flush with the base perimeter.
  var front = translate(
    [0, (baseDepth / 2) + (thickness / 2), thickness + (wallHeight / 2)],
    rotate([90, 0, 0], buildTriangularPanel(X, Z, 'BL'))
  );

  var left = translate(
    [-(baseWidth / 2) - (thickness / 2), 0, thickness + (wallHeight / 2)],
    rotate([90, 0, 90], buildTriangularPanel(Y, Z, 'BR'))
  );

  // 45 degree external chamfer to connect the two vertical walls at the corner.
  var chamferFL = buildCornerChamfer(-baseWidth / 2, baseDepth / 2, -1, 1, wallHeight);

  // 45 degree external chamfers between the base perimeter and the two walls.
  var bottomFront = buildBottomChamferFront(baseWidth, baseDepth);
  var bottomLeft = buildBottomChamferLeft(baseWidth, baseDepth);

  // Lower corner fill using an explicit convex solid compatible with OpenJSCAD v1.
  var bottomCornerFL = buildBottomCornerFill(-baseWidth / 2, baseDepth / 2, -1, 1);

  return [
    translate([thickness / 2, -thickness / 2, 0],
      color([0, 0.65, 1], union(
        base, front, left,
        chamferFL,
        bottomFront, bottomLeft,
        bottomCornerFL
      ))
    )
  ];
}

function buildTriangularPanel(cols, rows, keepCorner) {
  var holes = [];
  var halfX = (Shole * (cols - 1)) / 2;
  var halfY = (Shole * (rows - 1)) / 2;
  var geometry = getTriangleGeometry(halfX, halfY, keepCorner);
  var plate = buildTrianglePlate2D(geometry);

  for (var iy = 0; iy < rows; iy++) {
    for (var ix = 0; ix < cols; ix++) {
      var cx = (ix * Shole) - halfX;
      var cy = (iy * Shole) - halfY;

      if (allowEdgeHoles || holeFitsWithinTriangularPanel(cx, cy, geometry.centerPoints)) {
        holes.push(
          CAG.circle({
            center: [cx, cy],
            radius: Dhole / 2,
            resolution: quality
          })
        );
      }
    }
  }

  return translate(
    [0, 0, -thickness / 2],
    linear_extrude({ height: thickness }, plate.subtract(holes))
  );
}

function getTriangleGeometry(halfX, halfY, keepCorner) {
  var radius = Dcorner / 2;
  var centerPoints = getTriangleCenterPoints(halfX, halfY, keepCorner);
  var sharpOuterPoint;
  var roundedSupports;

  if (keepCorner === 'BL') {
    sharpOuterPoint = [-halfX - radius, -halfY - radius];
    roundedSupports = [
      { center: [ halfX, -halfY], edge: 'bottom' },
      { center: [-halfX,  halfY], edge: 'left' }
    ];
  } else if (keepCorner === 'BR') {
    sharpOuterPoint = [halfX + radius, -halfY - radius];
    roundedSupports = [
      { center: [-halfX, -halfY], edge: 'bottom' },
      { center: [ halfX,  halfY], edge: 'right' }
    ];
  } else {
    // keepCorner === 'TL'
    sharpOuterPoint = [-halfX - radius, halfY + radius];
    roundedSupports = [
      { center: [-halfX, -halfY], edge: 'left' },
      { center: [ halfX,  halfY], edge: 'top' }
    ];
  }

  return {
    centerPoints: centerPoints,
    sharpOuterPoint: sharpOuterPoint,
    roundedSupports: roundedSupports
  };
}

function getTriangleCenterPoints(halfX, halfY, keepCorner) {
  if (keepCorner === 'BL') {
    return [
      [-halfX, -halfY],
      [ halfX, -halfY],
      [-halfX,  halfY]
    ];
  }

  if (keepCorner === 'BR') {
    return [
      [-halfX, -halfY],
      [ halfX, -halfY],
      [ halfX,  halfY]
    ];
  }

  // keepCorner === 'TL'
  return [
    [-halfX, -halfY],
    [ halfX,  halfY],
    [-halfX,  halfY]
  ];
}

function buildTrianglePlate2D(geometry) {
  var sharpSupport = CAG.circle({
    center: geometry.sharpOuterPoint,
    radius: EPS,
    resolution: quality
  });

  var supportA = buildRoundedEdgeSupport(
    geometry.roundedSupports[0].center[0],
    geometry.roundedSupports[0].center[1],
    geometry.roundedSupports[0].edge
  );

  var supportB = buildRoundedEdgeSupport(
    geometry.roundedSupports[1].center[0],
    geometry.roundedSupports[1].center[1],
    geometry.roundedSupports[1].edge
  );

  return hullunion(sharpSupport, supportA, supportB);
}

function buildRoundedEdgeSupport(centerX, centerY, edge) {
  var radius = Dcorner / 2;
  var circle = CAG.circle({
    center: [centerX, centerY],
    radius: radius,
    resolution: quality
  });
  var square;

  if (edge === 'left') {
    square = CAG.rectangle({
      center: [centerX - (radius / 2), centerY],
      radius: [radius / 2, radius]
    });
  } else if (edge === 'right') {
    square = CAG.rectangle({
      center: [centerX + (radius / 2), centerY],
      radius: [radius / 2, radius]
    });
  } else if (edge === 'top') {
    square = CAG.rectangle({
      center: [centerX, centerY + (radius / 2)],
      radius: [radius, radius / 2]
    });
  } else {
    // edge === 'bottom'
    square = CAG.rectangle({
      center: [centerX, centerY - (radius / 2)],
      radius: [radius, radius / 2]
    });
  }

  return union(circle, square);
}

function holeFitsWithinTriangularPanel(px, py, points) {
  var holeMargin = (Dhole / 2) + holeClearance;
  var cornerRadius = Dcorner / 2;
  var availableOffset = cornerRadius - holeMargin;
  var unique = uniquePoints2D(points);

  if (unique.length === 1) {
    return distance2D(px, py, unique[0][0], unique[0][1]) <= (availableOffset + EPS);
  }

  if (unique.length === 2) {
    return pointToSegmentDistance(
      px, py,
      unique[0][0], unique[0][1],
      unique[1][0], unique[1][1]
    ) <= (availableOffset + EPS);
  }

  return signedDistanceToConvexPolygon(px, py, unique) >= ((holeMargin - cornerRadius) - EPS);
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

function signedDistanceToConvexPolygon(px, py, points) {
  var minDistance = Infinity;
  var inside = true;

  for (var i = 0; i < points.length; i++) {
    var a = points[i];
    var b = points[(i + 1) % points.length];
    var edgeX = b[0] - a[0];
    var edgeY = b[1] - a[1];
    var relX = px - a[0];
    var relY = py - a[1];
    var cross = (edgeX * relY) - (edgeY * relX);

    if (cross < -EPS) {
      inside = false;
    }

    minDistance = Math.min(minDistance, pointToSegmentDistance(px, py, a[0], a[1], b[0], b[1]));
  }

  return inside ? minDistance : -minDistance;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var segmentLengthSquared = (dx * dx) + (dy * dy);

  if (segmentLengthSquared <= EPS) {
    return distance2D(px, py, x1, y1);
  }

  var t = (((px - x1) * dx) + ((py - y1) * dy)) / segmentLengthSquared;
  t = Math.max(0, Math.min(1, t));

  var closestX = x1 + (t * dx);
  var closestY = y1 + (t * dy);

  return distance2D(px, py, closestX, closestY);
}

function distance2D(x1, y1, x2, y2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  return Math.sqrt((dx * dx) + (dy * dy));
}

function uniquePoints2D(points) {
  var unique = [];

  for (var i = 0; i < points.length; i++) {
    if (!containsPoint2D(unique, points[i])) {
      unique.push(points[i]);
    }
  }

  return unique;
}

function containsPoint2D(points, point) {
  for (var i = 0; i < points.length; i++) {
    if (samePoint2D(points[i], point)) {
      return true;
    }
  }

  return false;
}

function samePoint2D(a, b) {
  return (Math.abs(a[0] - b[0]) <= EPS) && (Math.abs(a[1] - b[1]) <= EPS);
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
  return hull(o);
}
