(function () {
    'use strict';

    var app = angular.module('app', ['chart.js']);

    // directive
    app.directive("dropzone", function() {
        return {
            restrict : "A",
            link: function (scope, elem) {
                elem.bind('dragover', function(evt) {
                    evt.preventDefault();
                    angular.element(evt.target).addClass('dragover')
                });
                elem.bind('dragleave', function(evt) {
                    evt.preventDefault();
                    angular.element(evt.target).removeClass('dragover')
                });
                elem.bind('drop', function(evt) {
                    evt.stopPropagation();
                    evt.preventDefault();

                    angular.element(evt.target).removeClass('dragover')

                    var files = evt.dataTransfer.files;
                    for (var i = 0, f; f = files[i]; i++) {
                        var reader = new FileReader();
                        reader.readAsText(f);

                        reader.onload = function(evt) {
                            scope.onFileLoad(evt.target.result)
                        }
                    }
                });
            }
        }
    });

    // services
    app.constant('_', _); // lodash
    
    app.factory('parsers', function(){
        var service = {
            CSVToArray: CSVToArray,
            getDomainFromUrl: getDomainFromUrl
        }

        return service;

        function getDomainFromUrl(url){
            var matches = url.match(/([^\/?#]+)(?:[\/?#]|$)/i);
            return matches && matches[1]; 
        }

        function CSVToArray(strData, strDelimiter) {
            strDelimiter = (strDelimiter || ",");
            var objPattern = new RegExp((
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
            var arrData = [[]];
            var arrMatches = null;
            while (arrMatches = objPattern.exec(strData)) {
                var strMatchedDelimiter = arrMatches[1];
                if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
                    arrData.push([]);
                }
                if (arrMatches[2]) {
                    var strMatchedValue = arrMatches[2].replace(
                    new RegExp("\"\"", "g"), "\"");
                } else {
                    var strMatchedValue = arrMatches[3];
                }
                arrData[arrData.length - 1].push(strMatchedValue.trim());
            }
            return (arrData);
        }
    })


    // Controller
    app.controller('MainCtrl', MainCtrl);
    MainCtrl.$inject = ['$scope', '_','parsers', '$timeout'];

    function MainCtrl($scope, _, parsers, $timeout) {
        var collection = [];
        var domains = [];

        function activate() {
            domains = _.chain(collection).pluck('url').uniq().value();
            var users = _.chain(collection).pluck('user').uniq().value();
            var tasks = _.chain(collection).pluck('task').uniq().value();

            $scope.users = _.zipObject(users, _.map(new Array(users.length), function(item) {return true}));
            $scope.tasks = _.zipObject(tasks, _.map(new Array(tasks.length), function(item) {return true}));

            drawChart(domains, $scope.users, $scope.tasks);
            $scope.$digest();
        }

        $scope.onFileLoad = function(content) {
            var result = parsers.CSVToArray(content);
            collection = createCollection(result);
            activate();
        }

        $scope.$watch('users', function(new_val){
            drawChart(domains, new_val, $scope.tasks);
        }, true)

        $scope.$watch('tasks', function(new_val){
            drawChart(domains, $scope.users, new_val);
        }, true)

        
        function drawChart(domains, users, tasks) {
            var data = agregate(domains, users, tasks)
            $scope.chart = {
                labels: domains,
                series: ['Activities'],
                data: [
                    data
                ]
            };
        }

        function agregate(domains, users, tasks) {
            var result = [];
            _.forEach(domains, function(domain){
                var filtered = _.filter(collection, function(item){
                    return (item.url == domain && users[item.user] && tasks[item.task]);
                })
                var sum = 0;
                var data = _.reduce(filtered, function(sum, item){
                    return sum + item.ut_end - item.ut_start;
                }, sum)
                result.push(data)
            })
            return result;
        }

        function createCollection(list) {
            //ugly: delete last extra item (parser is not perfect)
            list.pop();
            var keys = list.shift();

            var collection = [];
            _.forEach(list, function(item) {
                var activity = {}
                _.forEach(keys, function(key, i){
                    key = key.toLowerCase();
                    if(key == 'url') {
                        item[i] = parsers.getDomainFromUrl(item[i]);
                    }
                    if(key == 'ut_start' || key == 'ut_end') {
                        item[i] = parseInt(item[i]);
                    }
                    activity[key] = item[i]
                })
                collection.push(activity)
            })
            return collection;
        }

    }

})();