// Mobility Shield Builder ( mobilityshield.com )
// Triangular Plate Generator by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

// Global variables
var X, Y, thickness, Shole, Dhole, Dcorner, quality, allowEdgeHoles, holeClearance;
var w = [];

// Editable parameters
function getParameterDefinitions() {
  return [
    { name: 'X', caption: '<b>Holes in X:</b>', type: 'int', initial: 3 },
    { name: 'Y', caption: '<b>Holes in Y:</b>', type: 'int', initial: 3 },
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
  X = params.Y;
  Y = params.X;
  thickness = params.thickness;
  Shole = params.Shole;
  Dhole = params.Dhole;
  Dcorner = params.Dcorner;
  allowEdgeHoles = !!params.allowEdgeHoles;
  holeClearance = params.holeClearance;
  quality = parseInt(params.quality, 10);
  w = [];

  var plate = hullunion(
    CAG.circle({ center: [0, 0], radius: Dcorner / 2, resolution: quality }),
    CAG.circle({ center: [Shole * (X - 1), 0], radius: Dcorner / 2, resolution: quality }),
    CAG.circle({ center: [0, Shole * (Y - 1)], radius: Dcorner / 2, resolution: quality })
  );

  drills();

  return [
    translate([-(Shole * X) / 2, -(Shole * Y) / 2, 0],
      color([0, 0.65, 1],
        linear_extrude({ height: thickness },
          plate.subtract(w)
        )
      )
    )
  ];
}

function drills() {
  for (var iy = 0; iy < Y; iy++) {
    for (var ix = 0; ix < X; ix++) {
      var cx = Shole * ix;
      var cy = Shole * iy;

      if (allowEdgeHoles || holeFitsWithinPlate(cx, cy)) {
        w.push(CAG.circle({ center: [cx, cy], radius: Dhole / 2, resolution: quality }));
      }
    }
  }
}

function holeFitsWithinPlate(px, py) {
  var holeMargin = (Dhole / 2) + holeClearance;
  var cornerRadius = Dcorner / 2;
  var maxX = Shole * (X - 1);
  var maxY = Shole * (Y - 1);
  var availableOffset = cornerRadius - holeMargin;

  if (maxX <= 0 && maxY <= 0) {
    return distance2D(px, py, 0, 0) <= availableOffset;
  }

  if (maxX <= 0) {
    return pointToSegmentDistance(px, py, 0, 0, 0, maxY) <= availableOffset;
  }

  if (maxY <= 0) {
    return pointToSegmentDistance(px, py, 0, 0, maxX, 0) <= availableOffset;
  }

  return signedDistanceToBaseTriangle(px, py, maxX, maxY) >= (holeMargin - cornerRadius);
}

function signedDistanceToBaseTriangle(px, py, maxX, maxY) {
  var insideTriangle = (px >= 0) && (py >= 0) && ((maxY * px) + (maxX * py) <= (maxX * maxY));

  if (insideTriangle) {
    var distanceToHypotenuse = ((maxX * maxY) - (maxY * px) - (maxX * py)) / Math.sqrt((maxX * maxX) + (maxY * maxY));
    return Math.min(px, py, distanceToHypotenuse);
  }

  return -Math.min(
    pointToSegmentDistance(px, py, 0, 0, maxX, 0),
    pointToSegmentDistance(px, py, 0, 0, 0, maxY),
    pointToSegmentDistance(px, py, maxX, 0, 0, maxY)
  );
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var segmentLengthSquared = (dx * dx) + (dy * dy);

  if (segmentLengthSquared === 0) {
    return distance2D(px, py, x1, y1);
  }

  var t = (((px - x1) * dx) + ((py - y1) * dy)) / segmentLengthSquared;
  t = Math.max(0, Math.min(1, t));

  var closestX = x1 + (t * dx);
  var closestY = y1 + (t * dy);

  return distance2D(px, py, closestX, closestY);
}

function distance2D(x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  return Math.sqrt((dx * dx) + (dy * dy));
}

function hullunion() {
  var o = Array.prototype.slice.call(arguments);
  return union(hull(o));
}
