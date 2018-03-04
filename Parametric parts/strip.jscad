// Mobility Shield Builder ( mobilityshield.com )
// Plates and Strips Generator by J.Rodrigo ( jrodrigo.net )
// Licence: Creative Commons — Attribution and Share Alike 

// Global variables
var X=1,Y,thickness,Shole,Dhole,Dcorner,quality;
var w = new Array();

// Editable parameters
function getParameterDefinitions() {
  return [
    { name: 'X', caption: '<b>Holes in X:</b>', type: 'int', initial: 3 },
//    { name: 'Y', caption: '<b>Holes in Y:</b>', type: 'int', initial: 2 },
	{ name: 'thickness', caption: '<b>Thickness (mm):</b>', type: 'float', initial: 1.2 },
	{ name: 'Shole', caption: '<i>Hole spacing (mm):</i>', type: 'float', initial: 14 },
	{ name: 'Dhole', caption: '<i>Hole diameter (mm):</i>', type: 'float', initial: 3.6 },
	{ name: 'Dcorner', caption: '<i>Corner diameter (mm):</i>', type: 'float', initial: 12 },
	{ name: 'quality', type: 'choice',
      values: ["8","16","32"],
      captions: ["Low","Medium", "High"],
      caption: '<i>Quality:</i>',
      initial: "16" }
  ];
}

function main(params) {
	
//	X = params.Y;    
	Y = params.X;  
	thickness = params.thickness;	
	Shole = params.Shole; 
	Dhole = params.Dhole; 
	Dcorner = params.Dcorner; 
	quality = params.quality;
	
	var plate = hullunion(
		CAG.circle({center: [0,0], radius: Dcorner/2, resolution: quality}), 
		CAG.circle({center: [Shole*(X-1),0], radius: Dcorner/2, resolution: quality}), 
		CAG.circle({center: [0,Shole*(Y-1)], radius: Dcorner/2, resolution: quality}), 
		CAG.circle({center: [Shole*(X-1),Shole*(Y-1)], radius: Dcorner/2, resolution: quality})
    );
	
	drills();
	
	return	[ translate([-(Shole*X)/2,-(Shole*Y)/2,0],
				color([0,0.65,1],
					linear_extrude({height: thickness},
						plate.subtract(w)
					)
				)
			)
	];

}

function drills() {
      for (var iy = 0; iy < (Y); iy++) {
		for (var ix = 0; ix < (X); ix++) {
			w.push( CAG.circle({center: [Shole*ix,Shole*iy], radius: Dhole/2, resolution: quality}) );
		}			
	}
}

function hullunion() {
   var o = Array.prototype.slice.call(arguments);
   return union(hull(o));
}  