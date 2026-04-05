// Mobility Shield Builder ( mobilityshield.com )
// Cross Plate Generator by J.Rodrigo ( jrodrigo.com )
// Licence: Creative Commons — Attribution and Share Alike 

var coreX, coreY, leftExt, rightExt, topExt, bottomExt;
var thickness, Shole, Dhole, Dcorner, quality;
var w = [];

function getParameterDefinitions() {
  return [
    { name: 'coreX', caption: '<b>Central width holes:</b>', type: 'int', initial: 2 },
    { name: 'coreY', caption: '<b>Central height holes:</b>', type: 'int', initial: 2 },
    { name: 'leftExt', caption: '<b>Left extension holes:</b>', type: 'int', initial: 2 },
    { name: 'rightExt', caption: '<b>Right extension holes:</b>', type: 'int', initial: 2 },
    { name: 'topExt', caption: '<b>Top extension holes:</b>', type: 'int', initial: 2 },
    { name: 'bottomExt', caption: '<b>Bottom extension holes:</b>', type: 'int', initial: 2 },
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
  coreX = Math.max(1, params.coreX);
  coreY = Math.max(1, params.coreY);
  leftExt = Math.max(0, params.leftExt);
  rightExt = Math.max(0, params.rightExt);
  topExt = Math.max(0, params.topExt);
  bottomExt = Math.max(0, params.bottomExt);
  thickness = params.thickness;
  Shole = params.Shole;
  Dhole = params.Dhole;
  Dcorner = params.Dcorner;
  quality = parseInt(params.quality, 10);
  w = [];

  var totalX = coreX + leftExt + rightExt;
  var totalY = coreY + topExt + bottomExt;
  var totalWidth = Shole * (totalX - 1);
  var totalHeight = Shole * (totalY - 1);

  var vertical = roundedRect2D(coreX, totalY, leftExt * Shole, 0);
  var horizontal = roundedRect2D(totalX, coreY, 0, bottomExt * Shole);
  var plate = union(vertical, horizontal);

  drills(totalX, totalY);

  return [
    translate([-(totalWidth / 2), -(totalHeight / 2), 0],
      color([0, 0.65, 1],
        linear_extrude({ height: thickness }, plate.subtract(w))
      )
    )
  ];
}

function drills(totalX, totalY) {
  var seen = {};

  addRectHoles(coreX, totalY, leftExt * Shole, 0, seen);
  addRectHoles(totalX, coreY, 0, bottomExt * Shole, seen);
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
