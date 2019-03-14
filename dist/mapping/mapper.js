'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fhirpath = require('fhirpath');
var _ = require('lodash');
// embdedded function to inspect the results of fhir path calls to tell if something
// returned an object or 'true'.  This is used to wrap the filter/ignore/exclude
// functions to dtermin the truthyness of the fhir path calls
var isTrue = function isTrue(arg) {
  if (Array.isArray(arg)) {
    return arg.find(function (i) {
      return isTrue(i);
    });
  } else if ((typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object') {
    return !_.isEmpty(arg);
  } else if (typeof arg === 'string' && arg === 'false') {
    return false;
  }
  return arg;
};

// function to build the exec methods for FilterMappers.  The exec function modifies
// the resource.  If the value is a string it will try to require the function else {
// if it is a function it will simply pass back the value of the argument.

var buildProcessor = function buildProcessor(arg) {
  var processor = null;
  switch (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) {
    case 'string':
      processor = require(arg);
      break;
    case 'function':
      processor = arg;
      break;
  }
  return processor;
};

// build a filter for use in the filter/ingnore/exclude operations
// the filter may be a string or a function.  If it is a string it is treated as
// a fhirpath expression and a filtering function will be built around that expression.
// if it is a function then it will simply be returned.
var buildFilter = function buildFilter(arg) {
  // if string create a filter out of it
  if (Array.isArray(arg)) {
    var filters = arg.map(function (f) {
      return buildFilter(f);
    });
    return function (resource) {
      return filters.find(function (filter) {
        return isTrue(filter(resource));
      });
    };
  }
  var filter = null;
  switch (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) {
    case 'string':
      {
        var path = fhirpath.compile(arg);
        filter = function filter(resource) {
          return isTrue(path(resource));
        };
        break;
      }
    case 'function':
      {
        filter = arg;
        break;
      }
  }
  return filter;
};

// Build mappers from the arguments that are passed in.  If the args are null/undefined
// return an empty array.
// if the args are an array return an array of mappers
// if the args are an object that represent either an aggregate or filter mapper
// create one and return it
// if the args are a json object with string: object mappings treate the strings as
// potential filters and or descriptions of the mapper and return an aggregate or filter
// mapper depending on the rest of the attributes in the json object.
var buildMappers = function buildMappers(args) {
  if (!args) {
    return [];
  }
  // if the args are an array build an array of mappers to return
  if (Array.isArray(args)) {
    return args.map(function (m) {
      return buildMappers(m);
    });
  }
  // if the args are an object and it has a property called mappers
  // treat it like an aggregate mapper else like a filter mapper
  if (args.mappers) {
    return new AggregateMapper(args);
  } else if (args.exec) {
    return new FilterMapper(args);
  } else {
    // treat this like an object mapping of  {"filter" : {mapping attributes}}
    var mappers = [];
    for (var filter in args) {
      var mapper = args[filter];
      if (typeof mapper === 'string') {
        mappers.push(require(mapper));
      } else if ((typeof mapper === 'undefined' ? 'undefined' : _typeof(mapper)) === 'object' && !mapper.constructor.name === 'Object') {
        mappers.push(mapper);
      } else {
        if (!mapper.filter) {
          mapper.filter = filter;
        }
        if (!mapper.description) {
          mapper.description = filter;
        }
        mappers.push(buildMappers(mapper));
      }
    }
    return mappers;
  }
};

// Class to contain other mappers in a heirachy.  In oder for the contained
// mappers to be executed they the filter would have to match for the containing
// mapper.  This class can contain other aggregate mappers.

var AggregateMapper = function () {
  function AggregateMapper(args) {
    _classCallCheck(this, AggregateMapper);

    this.args = args;
    this.filterFn = buildFilter(args.filter);
    this.defaultFn = buildProcessor(args.default);
    this.ignoreFn = buildFilter(args.ignore);
    this.excludeFn = buildFilter(args.exclude);
    this.mappers = buildMappers(args.mappers);
  }

  // if an ignore filter was provided execute it on the resource otherwise
  // return false


  _createClass(AggregateMapper, [{
    key: 'ignore',
    value: function ignore(resource) {
      return this.ignoreFn ? this.ignoreFn(resource) : false;
    }

    // if an exclude filter was provided execute it on the resource otherwise return false

  }, {
    key: 'exclude',
    value: function exclude(resource) {
      return this.excludeFn ? this.excludeFn(resource) : false;
    }

    // if a default function was provided execute that function on the resource otherwise
    // return the resource as is

  }, {
    key: 'default',
    value: function _default(resource) {
      return this.defaultFn ? this.defaultFn(resource) : resource;
    }

    // if a filter was provided execute that on the resource otherwise
    // return false

  }, {
    key: 'filter',
    value: function filter(resource) {
      return this.filterFn ? this.filterFn(resource) : false;
    }

    // This method executes the aggregate filters.  There is a set order of operations
    // for this method on a resource or set of resources passed in.
    // ignore the resource if it returns true from the ignore function or does not pass the filter
    // return null if the resource matches the exclude method
    // if the resource matches a mapper that this aggregate mapper contains apply that mapper
    // if the resource does not match a contained mapper run the default function on the resource
    //

  }, {
    key: 'execute',
    value: function execute(resource) {
      var _this = this;

      if (Array.isArray(resource)) {
        return resource.map(function (r) {
          return _this.execute(r);
        }).filter(function (n) {
          return n;
        });
      } else {
        if (this.ignore(resource) || !this.filter(resource)) {
          return resource;
        }
        if (this.exclude(resource)) {
          return null;
        }
        var mapper = this.mappers.find(function (map) {
          return map.filter(resource);
        });
        if (mapper) {
          return mapper.execute(resource);
        } else {
          return this.default(resource);
        }
      }
    }
  }]);

  return AggregateMapper;
}();

// Mapper that does the actual work of modifying a reasource.  These are the leaf
// nodes of aggregate mappers.  The class contains a filter that must be matched by the
// aggregate mapper and an exec function that will modify the resource.


var FilterMapper = function () {
  function FilterMapper(args) {
    _classCallCheck(this, FilterMapper);

    this.args = args;
    this.filterFn = buildFilter(args.filter);
    this.execfn = buildProcessor(args.exec);
  }

  // if a filter was provided execute that function on the resource otherwise
  // return false


  _createClass(FilterMapper, [{
    key: 'filter',
    value: function filter(resource) {
      return this.filterFn ? this.filterFn(resource) : false;
    }
  }, {
    key: 'execute',
    value: function execute(resource) {
      var _this2 = this;

      if (Array.isArray(resource)) {
        return resource.map(function (r) {
          return _this2.execute(r);
        }).filter(function (n) {
          return n;
        });
      }
      return this.execfn(resource);
    }
  }]);

  return FilterMapper;
}();

module.exports = {
  AggregateMapper: AggregateMapper,
  FilterMapper: FilterMapper,
  buildFilter: buildFilter,
  buildMappers: buildMappers
};