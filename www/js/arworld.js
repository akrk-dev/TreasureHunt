var World = {
    loaded: false,
    stepData: {},
    oldLoc: {
        lat: '',
        lon: '',
        alt: ''
    },
    round: 1,
    imageRecognized: false,
    init: function initFn(data) {
        console.log(data);
        this.createOverlays(data);
    },
    createOverlays: function(stepData) {
        World.round = stepData.round;
        World.create(stepData);
    },
    next: function(param, uid) {
        document.location = "architectsdk://button?action=next&round=" + param + "&uid=" + uid;
    },
    create: function createOverlaysFn(stepData) {
        if (!stepData) {
            return false;
        }

        var imgOne = new AR.ImageResource(stepData.img);

        var overlayOne = new AR.ImageDrawable(imgOne, 1, {
            translate: {
                x: -0.15,
            },
            onClick: function(test) {
                World.next(World.round, stepData.uid);
            }
        });

        if (stepData.type == 'img') {
            this.targetCollectionResource = new AR.TargetCollectionResource(stepData.target, {});
            this.tracker = new AR.ImageTracker(this.targetCollectionResource, {
                onTargetsLoaded: this.worldLoaded
            });
            var imgTracker = new AR.ImageTrackable(this.tracker, "*", {
                drawables: {
                    cam: [overlayOne]
                },
                onImageRecognized: function() {
                    if (!World.imageRecognized) {
                        var e = document.getElementById('loadingMessage');
                        e.innerHTML = "<div style='display: table-cell;vertical-align: middle; text-align: right; width: 70%; padding-right: 15px;'>Unlocked!!</div>" +
                            "<div style='display: table-cell;vertical-align: middle; text-align: right; padding-right:5px;'><img id='next' src='img/next.png' style='height: auto; width: auto; max-width: 30px; max-height: 30px;'></img></div>";
                        e.onclick = function() {
                            World.next(World.round, stepData.uid);
                        }
                        World.imageRecognized = true;
                    }
                }
            });

        } else {
            var markerDrawable_directionIndicator = new AR.ImageResource("img/indi.png");
            var directionIndicatorDrawable = new AR.ImageDrawable(markerDrawable_directionIndicator, 0.1, {
                enabled: true,
                verticalAnchor: AR.CONST.VERTICAL_ANCHOR.TOP
            });

            var markerLocation = new AR.GeoLocation(stepData.coords[0], stepData.coords[1], stepData.coords[2]);
            this.markerObject = new AR.GeoObject(markerLocation, {
                drawables: {
                    cam: [overlayOne],
                    indicator: directionIndicatorDrawable
                }
            });

            this.actionRange = new AR.ActionRange(markerLocation, 100);

            AR.context.onLocationChanged = World.locationChanged;

        }
    },
    locationChanged: function locationChangedFn(lat, lon, alt, acc) {
        World.worldLoaded();
        if (World.oldLoc.lat != lat || World.oldLoc.lon != lon || World.oldLoc.alt != alt) {
            alert("lat:" + lat + ", lon : " + lon + ", alt: " + alt);
            World.markerObject.enabled = true;
            var loc = new AR.GeoLocation(lat, lon, alt);
            if (World.actionRange.isInArea(loc)) {
                if (!World.imageRecognized) {
                        var e = document.getElementById('loadingMessage');
                        e.innerHTML = "<div style='display: table-cell;vertical-align: middle; text-align: right; width: 70%; padding-right: 15px;'>Unlocked!!</div>" +
                            "<div style='display: table-cell;vertical-align: middle; text-align: right; padding-right:5px;'><img id='next' src='img/next.png' style='height: auto; width: auto; max-width: 30px; max-height: 30px;'></img></div>";
                        e.onclick = function() {
                            World.next(World.round, stepData.uid);
                        }
                        World.imageRecognized = true;
                    }
            } else {
                World.markerObject.enabled = false;
            }
            World.oldLoc = {
                lat: lat,
                lon: lon,
                alt: alt
            };
        }
    },
    close:function(){
        document.location = "architectsdk://button?action=close";
    },
    worldLoaded: function worldLoadedFn() {
        var e = document.getElementById('loadingMessage');
        e.innerHTML = "<div style='display: table-cell;vertical-align: middle; text-align: left; width: 70%; padding-right: 15px;'>Clue #" + World.round + "</div>" +
            "<div style='display: table-cell;vertical-align: middle; text-align: right; padding-right:5px;'><img id='next' src='img/close.png' style='height: auto; width: auto; max-width: 30px; max-height: 30px;'></img></div>";
        e.onclick = World.close;
    }
};