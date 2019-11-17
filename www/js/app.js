angular.module('App', ['ionic', 'ngCordova', 'ngAnimate', "firebase"])

.run(['$ionicPlatform',
        '$window', '$wikitudeService', '$rootScope',
        function($ionicPlatform, $window, $wikitudeService, $rootScope) {
            $ionicPlatform.ready(function() {

                if ($window.StatusBar) {
                    StatusBar.styleDefault();
                }

                if ($window.cordova) {
                    var wikitudePlugin = $window.cordova.require('com.wikitude.phonegap.WikitudePlugin.WikitudePlugin');
                    $window.plugins = {};
                    $window.plugins.wikitudePlugin = wikitudePlugin;
                    $wikitudeService.onDeviceReady();

                }

            });
            $ionicPlatform.registerBackButtonAction(function(event) {
                event.preventDefault();
            }, 100);

            function onBackKeyDown(e) {
                e.preventDefault();
                e.stopPropagation();
            }
            $ionicPlatform.on('resume', function() {
                $rootScope.$broadcast('onResumeApp');
            });
        }
    ])
    .config(['$stateProvider',
        '$urlRouterProvider',
        '$ionicConfigProvider',
        '$compileProvider',
        function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $compileProvider) {

            $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob|content|ms-appx|x-wmapp0):|data:image\/|img\//);
            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|ghttps?|ms-appx|x-wmapp0):/);

            $ionicConfigProvider.scrolling.jsScrolling(ionic.Platform.isIOS());

            $stateProvider
                .state('login', {
                    url: "/login",
                    templateUrl: "templates/login.html",
                    controller: 'HomeController'
                })
                .state('error', {
                    url: "/error",
                    params: {
                        msg: '',
                    },
                    templateUrl: "templates/error.html",
                    controller: 'ErrorController'
                })
                .state('app', {
                    url: '/app',
                    abstract: true,
                    controller: 'AppController',
                    templateUrl: 'templates/menu.html'
                })
                .state('app.home', {
                    url: "/home",
                    params: {
                        round: null
                    },
                    cache: false,
                    views: {
                        viewContent: {
                            templateUrl: "templates/home.html",
                            controller: 'baseController'
                        }
                    }
                });

            $urlRouterProvider.otherwise(function($injector, $location) {
                var $state = $injector.get("$state");
                $state.go("login");
            });
        }
    ]);

(function() {
    'use strict';

    angular
        .module('App')
        .service('$authService', $authService);

    $authService.$inject = ["$firebaseObject", "$firebaseAuth", "$state"];

    function $authService($firebaseObject, $firebaseAuth, $state) {
        var self = this;
        var firebaseAuthObject = $firebaseAuth();
        var user = {};
        var round = null;

        self.checkConnection = function() {
            firebase.database().ref('.info/connected').on('value', function(connectedSnap) {
                if (connectedSnap.val() === true) {

                } else {
                    $state.go('error', {
                        msg: 'No internet connection'
                    });
                }
            });
        };
        self.getUser = function() {
                if (!user.$id && sessionStorage.userSession) {
                    var tmpUser = angular.fromJson(sessionStorage.userSession);
                    var userRef = this.checkUser(tmpUser.$id);
                    user = $firebaseObject(userRef);
                } else if (Object.keys(user).length == 0) {
                    $state.go("login");
                }
                return user;
            },

            self.setActiveRound = function(val) {
                round = val;
                sessionStorage.userActiveRound = val;
                var user = self.getUser().$loaded;
            },

            self.getActiveRound = function() {
                if (!round && sessionStorage.userActiveRound) {
                    var round = parseInt(sessionStorage.userActiveRound);
                }
                return round;
            },


            self.login = function(user) {
                return firebaseAuthObject.$signInWithEmailAndPassword(user.email, user.password);
            },

            self.signOut = function() {
                return firebase.auth().signOut()
                    .then(function() {
                        console.log('signed out')
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
            },
            self.checkUser = function(username) {
                return firebase.database().ref("Users/" + username.toLowerCase());
            },
            self.setUser = function(userObj) {
                user = $firebaseObject(userObj);
                user.$loaded().then(function(val) {
                    sessionStorage.userSession = angular.toJson(val);
                });
            },
            self.addUser = function(username) {
                var ref = firebase.database().ref("User").push();
                var UserRef = ref.child(username);

                // return it as a synchronized object
                return $firebaseObject(UserRef);
            }
    }
})();

(function() {
    'use strict';

    angular
        .module('App')
        .service('$dataService', $dataService);

    $dataService.$inject = ["$firebaseObject", "$firebaseAuth"];

    function $dataService($firebaseObject, $firebaseAuth) {
        var self = this;

        self.getQuestion = function(round) {
            return firebase.database().ref("Questions/" + round);
        }
        self.checkAnswer = function(round, ans) {
            return firebase.database().ref("Answers/" + round + "/" + ans.toLowerCase());
        }
        self.getUsers = function(team) {
            return firebase.database().ref("Users");
        }
        self.getQuestionsByUser = function(userRound) {
            return firebase.database().ref("Questions");
        }
        self.encodeImageUri = function(imageUri) {
            var c = document.createElement('canvas');
            var ctx = c.getContext("2d");
            var img = new Image();
            img.onload = function() {
                c.width = this.width;
                c.height = this.height;
                ctx.drawImage(img, 0, 0);
            };
            img.src = imageUri;
            var dataURL = c.toDataURL("image/jpeg");
            return dataURL;
        }
    }

})();

(function() {
    'use strict';

    angular
        .module('App')
        .service('$wikitudeService', $wikitudeService);

    $wikitudeService.$inject = ['$q', '$state', '$window', '$exceptionHandler', '$authService'];

    function $wikitudeService($q, $state, $window, $exceptionHandler, $authService) {
        var self = this;
        return {
            /**
             * internal listeners for success and error, they are invoked in cordova.exec() function
             */
            setInternalListeners: function() {
                $window.plugins.wikitudePlugin.prototype.onWikitudeOK = function(success) {
                    //success callback
                };

                $window.plugins.wikitudePlugin.prototype.onWikitudeError = function(error) {
                    // error callback
                    throw (error);
                };
            },
            onDeviceReady: function() {
                if ($window.cordova.platformId == "android") {
                    $window.plugins.wikitudePlugin.setBackButtonCallback(this.onBackButton);
                }
                $window.plugins.wikitudePlugin.setOnUrlInvokeCallback(this.onUrlInvoke.bind(this));
            },
            onUrlInvoke: function(url) {
                if (url.indexOf('captureScreen') > -1) {
                    this.captureScreen();
                } else if (url.indexOf('next') > -1) {
                    var round = this.getParameterByName('round', url);
                    var uid = this.getParameterByName('uid', url);
                    this.next(round, uid);
                } else if (url.indexOf('image') > -1) {
                    console.log(url);
                } else if (url.indexOf('close') > -1) {
                    this.close();
                }else {
                    alert(url + "not handled");
                }
            },
            getParameterByName: function(name, url) {
                var match = RegExp('[?&]' + name + '=([^&]*)').exec(url);
                return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
            },
            next: function(round, uid) {
                round = parseInt(round) + 1;
                $authService.setActiveRound(round, uid);
                var $userRef = $authService.checkUser(uid);
                $userRef.update({
                    round: round
                });
                $state.go('app.home', {
                    round: round
                });
                $window.plugins.wikitudePlugin.close();
            },
            onBackButton: function() {
                $window.plugins.wikitudePlugin.close();
                /* Android back button was pressed and the Wikitude PhoneGap Plugin is now closed */
            },
            /**
             * array of requiredFeatures for instance [ "2d_tracking", "geo" ]
             * if no argument is passed the default value is 2d tracking
             * @param requiredFeatures
             * @returns {*}
             */
            isDeviceSupported: function(requiredFeatures) {

                // set the internal listeners for success and error
                this.setInternalListeners();

                var self = this;
                var q = $q.defer();

                // store features in the $wikitudePlugin for accessing it in all methods
                self.features = requiredFeatures || ['2d_tracking'];

                $window.plugins.wikitudePlugin.isDeviceSupported(function() {
                    //device supported
                    q.resolve(self);
                }, function() {
                    //device not supported
                    q.reject('device not supported!');
                }, self.features);

                return q.promise;
            },

            /**
             *
             * @param worldPath
             * @param startupConfiguration
             */
            loadARchitectWorld: function(worldPath, startupConfiguration) {
                var q = $q.defer();

                // startup configuration converted to json
                var config = JSON.stringify(startupConfiguration || {
                    "requiredFeatures": [
                        "image_tracking"
                    ],
                    'camera_position': 'back'
                });

                if (typeof worldPath === 'string') {

                    $window.plugins.wikitudePlugin.loadARchitectWorld(function(loadedURL) {
                        // loadedSuccessful
                        q.resolve(loadedURL);
                    }, function(errorMessage) {
                        // error local path is wrong or the remote url returned an error code
                        q.reject(errorMessage);
                    }, worldPath, this.features, config);
                }

                return q.promise;
            },

            /**
             * inject a location into the Wikitude SDK
             * @param latitude
             * @param longitude
             * @param altitude
             * @param accuracy
             */
            setLocation: function(latitude, longitude, altitude, accuracy) {
                try {
                    //inject a location into the Wikitude SDK
                    $window.plugins.wikitudePlugin.setLocation(latitude, longitude, altitude, accuracy);
                } catch (e) {
                    // handle execption
                    $exceptionHandler(e.message);
                }
            },

            /**
             * The first argument Indicates if the ARchitect
             * web view should be included in the generated screenshot or not.
             * If a file path or file name is given in the second argument,
             * the generated screenshot will be saved in the application bundle.
             * Passing null will save the photo in the device photo library
             * @param includeWebView
             * @param imagePath
             * @returns {*}
             */
            captureScreen: function(includeWebView, imagePath) {
                var q = $q.defer();

                $window.plugins.wikitudePlugin.captureScreen(includeWebView, imagePath, function(bundlePath) {
                    //success
                    q.resolve(bundlePath);
                }, function(error) {
                    //error
                    q.reject(error);
                });

                return q.promise;
            },

            callJavaScript: function(js) {
                try {
                    $window.plugins.wikitudePlugin.callJavaScript(js);
                } catch (e) {
                    $exceptionHandler(e);
                }
            },

            setOnUrlInvokeCallback: function(onUrlInvokeCallback) {
                $window.plugins.wikitudePlugin.setOnUrlInvokeCallback(onUrlInvokeCallback);
            },

            close: function() {
                $window.plugins.wikitudePlugin.close();
            },

            show: function() {
                $window.plugins.wikitudePlugin.show();
            },

            hide: function() {
                $window.plugins.wikitudePlugin.hide();
            }

        }; // end of wikitudePlugin factory

    };

})();
(function() {
    'use strict';

    angular
        .module('App')
        .controller('AppController', AppController);

    AppController.$inject = ['$scope','$timeout', '$state', '$ionicPopover', 'Modals', '$dataService', '$authService', '$firebaseArray'];

    function AppController($scope, $timeout, $state, $ionicPopover, Modals, $dataService, $authService, $firebaseArray) {

        $scope.items = [{
            color: "#E47500",
            icon: "ion-ios-home-outline",
            title: "Holmes",
            onclick: function() {
                $state.go('app.home');
            }
        }, {
            color: "#E47500",
            icon: "ion-ios-lightbulb-outline",
            title: "Unlocked Clues",
            onclick: function() {
                $scope.curUser = $authService.getUser();
                $scope.colors = ['#E47500', '#5AD863', '#F8E548', '#AD5CE9', '#3DBEC9', '#D86B67', '#000', '#000'];
                $scope.clues = $firebaseArray($dataService.getQuestionsByUser($scope.curUser.round));
                $scope.clues.$loaded().then(function(val) {
                    console.log(val);
                });
                $scope.open = function(clue) {
                    Modals.closeModal();
                    $state.go('app.home', {
                        round: clue.round
                    });
                }
                Modals.openModal($scope, 'clues.html', 'animated rotateInDownLeft');
            }
        }, {
            color: "#E47500",
            icon: "ion-android-sunny",
            title: "Team list",
            onclick: function() {
                $scope.curUser = $authService.getUser();
                $scope.users = $firebaseArray($dataService.getUsers());
                $scope.users.$loaded().then(function(val) {
                    console.log(val);
                });
                Modals.openModal($scope, 'templates/modals/users.html', 'animated rotateInDownLeft');
            }
        }, {
            color: "#E47500",
            icon: "ion-ios-bookmarks-outline",
            title: "Case Story",
            onclick: function() {
                $scope.curUser = $authService.getUser();
                Modals.openModal($scope, 'story.html', 'animated rotateInDownLeft');
            }
        }, {
            color: "#E47500",
            icon: "ion-chatbubbles",
            title: "Dr.Watson",
            onclick: function() {
                $scope.curUser = $authService.getUser();
                $scope.curUser.$loaded().then(function(val) {
                    var ChatRef = firebase.database().ref('Chat/' + val.team);
                    $scope.messages = $firebaseArray(ChatRef);
                    $scope.data = {};
                    $scope.sendMessage = function() {
                        var msg = $scope.data.message ;
                        $scope.data.message = "";
                        $scope.messages.$add({
                            from: val.$id,
                            body: msg,
                            time: new Date().toString()
                        }).then(function(p) {
                            $timeout(function() {
                                var scroller = document.getElementById("chat-view");
                                scroller.scrollTop = scroller.scrollHeight;
                            }, 0, false);
                        });;
                    };
                    Modals.openModal($scope, 'templates/modals/chat.html', 'animated rotateInDownLeft');
                });
            }
        }, {
            color: "#E47500",
            icon: "ion-document",
            title: "Self Help",
            onclick: function() {
                Modals.openModal($scope, 'help.html', 'animated rotateInDownLeft');
            }
        }];
        $scope.closeModal = function() {
            Modals.closeModal();
            $scope.users = [];
        };

        $scope.exitApp = function() {
            ionic.Platform.exitApp();
        };

        $scope.$on('$destroy', function() {
            $scope.popover.remove();
        });
    }
})();
(function() {
    'use strict';

    angular
        .module('App')
        .controller('ErrorController', ErrorController);
    ErrorController.$inject = ['$scope', '$state', '$stateParams'];

    function ErrorController($scope, $state, $stateParams) {
        $scope.errorMsg = $stateParams.msg

    }

})();

(function() {
    'use strict';

    angular
        .module('App')
        .controller('baseController', BaseController);
    BaseController.$inject = ['$scope', '$rootScope', '$state', '$window', '$stateParams', '$timeout', '$authService', '$dataService', '$firebaseObject', '$ionicPopup', '$wikitudeService'];

    function BaseController($scope, $rootScope, $state, $window, $stateParams, $timeout, $authService, $dataService, $firebaseObject, $ionicPopup, $wikitudeService) {
        var self = this;
        $scope.enabled = true;
        self.clue = {};

        $rootScope.$on('onResumeApp', function(event) {
            $authService.getUser().$loaded().then(function(curUser) {
                if (curUser && curUser.active) {
                    var round = $authService.getActiveRound();

                    if (round > 0) {
                        $state.go('app.home', {
                            round: round
                        });
                        return;
                    }
                    $state.go('login');
                }
            });
        });
        $authService.getUser().$loaded().then(function(curUser) {
            if (curUser && !curUser.active) {
                $state.go('login');
            }
            var round = $stateParams.round;
            if (round == null || isNaN(round)) {
                var round = round || $authService.getActiveRound() || curUser.round || 1;
            }
            var round = curUser.round < round ? curUser.round : round;
            $authService.setActiveRound(round);

            var dataRef = $dataService.getQuestion(round);

            $scope.showPrev = round > 0;
            $scope.showNext = curUser.round > round;
            $scope.round = round;

            $scope.qn = $firebaseObject(dataRef);
            $scope.qn.$loaded().then(function(val) {
                if (val.$value === null) {
                    $state.go('error', {
                        'msg': 'Error occurs'
                    });
                } else {
                    self.clue = {
                        'uid': curUser.$id,
                        'round': val.round,
                        'img': (val.img),
                        'type': val.type,
                        'target': val.target || [],
                        'coords': val.coords || []
                    };
                }
            }).catch(function() {
                $state.go('error', {
                    'msg': 'No Internet Connection'
                });
            });

        }).catch(function() {
            $state.go('error', {
                'msg': 'No Internet Connection'
            });
        });
        $scope.loadAR = function(url) {

            $scope.enabled = false;
            var url = url || 'www/arworld.html';
            $wikitudeService.loadARchitectWorld(url, {
                'path': url
            }).then(function() {
                $wikitudeService.callJavaScript('World.init(' + JSON.stringify(self.clue) + ');');
                $scope.enabled = true;
            }, function() {
                $scope.enabled = true;
            }).catch(function() {
                $scope.enabled = true;
            });
        }

    }

})();
(function() {
    'use strict';

    angular
        .module('App')
        .controller('HomeController', HomeController);

    HomeController.$inject = ['$scope', '$ionicPopup', '$firebaseObject', "$authService", "$state"];

    function HomeController($scope, $ionicPopup, $firebaseObject, $authService, $state) {

        $scope.myForm = {
            uname: ''
        };
        $scope.wrongUserMsg = false;
        setTimeout($authService.checkConnection(), 3000);
        var user = $authService.getUser();
        console.log(user);
        if (user.$id && user.$id != "") {
            $state.go('app.home');
        }

        $scope.loading = false;

        $scope.signIn = function(uname) {
            uname = uname.replace(/[\.#\$\[\]]/g, "");

            var user = $authService.getUser();
            if (user.$id && user.$id == "uname") {
                $state.go('app.home');
            }
            var $userRef = $authService.checkUser(uname);
            $scope.loading = true;
            $firebaseObject($userRef).$loaded()
                .then(function(snapshot) {
                    $scope.loading = false;
                    if (snapshot != null && snapshot != false && snapshot.team != null) {
                        var uid = (window.device && window.device.uuid) || '';
                        var round = snapshot.round || 1;
                        if (snapshot.hash != "" && uid != snapshot.hash) {
                            $scope.wrongUserMsg = "User already login in another machine";
                            return false;
                        }
                        var user = {
                            'hash': uid,
                            'active': true
                        };
                        $userRef.update(user);
                        angular.extend(snapshot, user);
                        $authService.setUser($userRef);
                        $scope.wrongUserMsg = false;
                        $state.go('app.home', {
                            round: null
                        });
                        return true;
                    }
                    $scope.wrongUserMsg = "Invalid user";

                }, function(error) {
                    $scope.loading = false;
                    $state.go('error', {
                        'msg': 'No Internet Connection'
                    });
                });
            // calling $save() on the synchronized object syncs all data back to our database


            return false;
        };

    }
})();
(function() {
    'use strict';

    angular
        .module('App')
        .factory('Modals', Modals);

    Modals.$inject = ['$ionicModal'];

    function Modals($ionicModal) {

        var modals = [];

        var _openModal = function($scope, templateUrl, animation) {
            return $ionicModal.fromTemplateUrl(templateUrl, {
                scope: $scope,
                animation: animation || 'slide-in-up',
                backdropClickToClose: false
            }).then(function(modal) {
                modals.push(modal);
                modal.show();
            });
        };

        var _closeModal = function() {
            var currentModal = modals.splice(-1, 1)[0];
            currentModal.remove();
        };

        var _closeAllModals = function() {
            modals.map(function(modal) {
                modal.remove();
            });
            modals = [];
        };

        return {
            openModal: _openModal,
            closeModal: _closeModal,
            closeAllModals: _closeAllModals
        };
    }
})();