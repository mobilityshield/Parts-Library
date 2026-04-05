// Mobility Shield Builder ( mobilityshield.com )
// U Plate Generator by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

var X, Y, armX, baseY, thickness, Shole, Dhole, Dcorner, quality;
var w = [];

function getParameterDefinitions() {
  return [
    { name: 'X', caption: '<b>Outer holes in X:</b>', type: 'int', initial: 5 },
    { name: 'Y', caption: '<b>Outer holes in Y:</b>', type: 'int', initial: 5 },
    { name: 'armX', caption: '<b>Side arm holes:</b>', type: 'int', initial: 1 },
    { name: 'baseY', caption: '<b>Base rows:</b>', type: 'int', initial: 2 },
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
  X = Math.max(3, params.X);
  Y = Math.max(3, params.Y);
  armX = Math.max(1, Math.min(params.armX, Math.floor((X - 1) / 2)));
  baseY = Math.max(1, Math.min(params.baseY, Y - 1));
  thickness = params.thickness;
  Shole = params.Shole;
  Dhole = params.Dhole;
  Dcorner = params.Dcorner;
  quality = parseInt(params.quality, 10);
  w = [];

  var totalWidth = Shole * (X - 1);
  var totalHeight = Shole * (Y - 1);
  var plate = buildUShape2D();

  drills();

  return [
    translate([-(totalWidth / 2), -(totalHeight / 2), 0],
      color([0, 0.65, 1],
        linear_extrude({ height: thickness }, plate.subtract(w))
      )
    )
  ];
}

function buildUShape2D() {
  var leftArm = roundedRect2D(armX, Y, 0, 0);
  var rightArm = roundedRect2D(armX, Y, Shole * (X - armX), 0);
  var base = roundedRect2D(X, baseY, 0, 0);
  var plate = union(leftArm, rightArm, base);

  return roundInnerBottomCorners(plate);
}

function roundInnerBottomCorners(plate) {
  var radius = Dcorner / 2;
  var leftSideX = (Shole * (armX - 1)) + radius;
  var rightSideX = (Shole * (X - armX)) - radius;
  var baseTopY = (Shole * (baseY - 1)) + radius;
  var leftCenter = [leftSideX + radius, baseTopY + radius];
  var rightCenter = [rightSideX - radius, baseTopY + radius];

  if (baseY < Y && leftCenter[0] < rightCenter[0]) {
    plate = plate.subtract(CAG.circle({ center: leftCenter, radius: radius, resolution: quality }));
    plate = plate.subtract(CAG.circle({ center: rightCenter, radius: radius, resolution: quality }));
  }

  return plate;
}

function drills() {
  var seen = {};

  addRectHoles(X, baseY, 0, 0, seen);
  addRectHoles(armX, Y, 0, 0, seen);
  addRectHoles(armX, Y, Shole * (X - armX), 0, seen);
}

function addRectHoles(cols, rows, offsetX, offsetY, seen) {
  for (var iy = 0; iy < rows; iy++) {
    for (var ix = 0; ix < cols; ix++) {
      var cx = offsetX + (ix * Shole);
      var cy = offsetY + (iy * Shole);
      var key = cx + ':' + cy;

      if (!seen[key]) {
        seen[key] = true;
        w.push(CAG.circle({ center: [cx, cy], radius: Dhole / 2, resolution: quality }));
      }
    }
  }
}

function roundedRect2D(cols, rows, offsetX, offsetY) {
  var maxX = offsetX + (Shole * (cols - 1));
  var maxY = offsetY + (Shole * (rows - 1));

  return hullunion(
    CAG.circle({ center: [offsetX, offsetY], radius: Dcorner / 2, resolution: quality }),
    CAG.circle({ center: [maxX, offsetY], radius: Dcorner / 2, resolution: quality }),
    CAG.circle({ center: [offsetX, maxY], radius: Dcorner / 2, resolution: quality }),
    CAG.circle({ center: [maxX, maxY], radius: Dcorner / 2, resolution: quality })
  );
}

function hullunion() {
  var o = Array.prototype.slice.call(arguments);
  return union(hull(o));
}
