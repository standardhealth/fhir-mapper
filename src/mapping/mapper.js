const fhirpath = require('fhirpath');
const {isTrue} = require('../utils/common');
// function to build the exec methods for FilterMappers.  The exec function modifies
// the resource.  If the value is a string it will try to require the function else {
// if it is a function it will simply pass back the value of the argument.

const buildProcessor = (arg) => {
  let processor = null;
  switch (typeof arg) {
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
const buildFilter = (arg, variables = {}) => {
  // if string create a filter out of it
  if (Array.isArray(arg)){
    const filters = arg.map( f => buildFilter(f));
    return (resource) => {return filters.find( filter => isTrue(filter(resource)));};
  }
  let filter = null;
  switch (typeof arg) {
    case 'string': {
      const path = fhirpath.compile(arg);
      filter = (resource) => isTrue(path(resource,variables));
      break;}
    case 'function':{
      filter = arg;
      break;}
  }
  return filter;
};

// Build mappers from the arguments that are passed in.  If the args are null/undefined
// return an empty array.
// if the args are an array return an array of mappers
// if the args are an object that represent either an aggregate or filter mapper
// create one and return it
// if the args are a json object with string: object mappings treat the strings as
// potential filters and or descriptions of the mapper and return an aggregate or filter
// mapper depending on the rest of the attributes in the json object.
const buildMappers = (args, variables = {}) =>{
  if (!args) {return [];}
  // if the args are an array build an array of mappers to return
  if (Array.isArray(args)){
    return args.map(m => buildMappers(m, variables));
  }
  // if the args are an object and it has a property called mappers
  // treat it like an aggregate mapper else like a filter mapper
  if (args.mappers){
    return new AggregateMapper(args, variables);
  } else if (args.exec){
    return new FilterMapper(args, variables);
  } else { // treat this like an object mapping of  {"filter" : {mapping attributes}}
    const mappers = [];
    for (var filter in args){
      const mapper = args[filter];
      if (typeof mapper === 'string'){
        mappers.push(require(mapper));
      } else if (typeof mapper === 'object' && !mapper.constructor.name === 'Object'){
        mappers.push(mapper);
      } else {
        if (!mapper.filter){ mapper.filter = filter;}
        if (!mapper.description){mapper.description = filter;}
        mappers.push(buildMappers(mapper, variables));
      }
    }
    return mappers;
  }
};

// Class to contain other mappers in a hierarchy.  In order for the contained
// mappers to be executed they the filter would have to match for the containing
// mapper.  This class can contain other aggregate mappers.
class AggregateMapper {

  constructor(args, variables = {}){
    this.args = args;
    this.filterFn = buildFilter(args.filter, variables);
    this.defaultFn = buildProcessor(args.default);
    this.ignoreFn = buildFilter(args.ignore, variables);
    this.excludeFn = buildFilter(args.exclude, variables);
    this.mappers = buildMappers(args.mappers, variables);
  }

  // if an ignore filter was provided execute it on the resource otherwise
  // return false
  ignore(resource, context){
    return this.ignoreFn ? this.ignoreFn(resource, context) : false;
  }

  // if an exclude filter was provided execute it on the resource otherwise return false
  exclude(resource, context){
    return this.excludeFn ? this.excludeFn(resource, context) : false;
  }

  // if a default function was provided execute that function on the resource otherwise
  // return the resource as is
  default(resource, context){
    return this.defaultFn ? this.defaultFn(resource, context) : resource;
  }

  // if a filter was provided execute that on the resource otherwise
  // return false
  filter(resource, context){
    return (this.filterFn) ? this.filterFn(resource, context) : false;
  }

  // This method executes the aggregate filters.  There is a set order of operations
  // for this method on a resource or set of resources passed in.
  // ignore the resource if it returns true from the ignore function or does not pass the filter
  // return null if the resource matches the exclude method
  // if the resource matches a mapper that this aggregate mapper contains apply that mapper
  // if the resource does not match a contained mapper run the default function on the resource
  //
  execute(resource, context){
    if (Array.isArray(resource)){
      return resource.map( r => this.execute(r, context)).filter(n => n);
    } else if (resource.resourceType === 'Bundle') {
      const additionalEntries = [];
      resource.entry = resource.entry.map(e => {
        const { fullUrl, request, resource: entryResource } = e;
        const mappedResources = this.execute(entryResource, context);
        if (!Array.isArray(mappedResources)) {
          return {
            fullUrl,
            resource: mappedResources,
            request
          };
        } else {
          additionalEntries.push(
            ...mappedResources.slice(1, mappedResources.length + 1)
              .map(mappedResource => {
                return {
                  fullUrl: `urn:uuid:${mappedResource.id}`,
                  resource: mappedResource
                };
              }));
          return {
            fullUrl,
            resource: mappedResources[0],
            request
          };
        }
      });
      resource.entry.push(...additionalEntries);
      resource.entry = resource.entry.filter(e => e.resource);
      return resource;
    } else {
      // If we're supposed to ignore this resource, or if the filter, just return unmodified resource
      if (this.ignore(resource, context) || !this.filter(resource, context)){return resource;}
      // If we're supposed to exclude this resource from the bundle, return null
      if (this.exclude(resource, context)){return null;}
      // Find the mapper whose filter returns this resource
      const mapper = this.mappers.find(map => map.filter(resource, context));
      if (mapper){
        // Use that mapper to transform the resource
        return mapper.execute(resource, context);
      } else {
        // If no mapper matches, use the default transform
        return this.default(resource, context);
      }
    }
  }
}

// Mapper that does the actual work of modifying a resource.  These are the leaf
// nodes of aggregate mappers.  The class contains a filter that must be matched by the
// aggregate mapper and an exec function that will modify the resource.
class FilterMapper {

  constructor(args, variables){
    this.args = args;
    this.filterFn = buildFilter(args.filter, variables);
    this.execfn = buildProcessor(args.exec);
  }

  // if a filter was provided execute that function on the resource otherwise
  // return false
  filter(resource, context){
    return (this.filterFn) ? this.filterFn(resource, context) : false;
  }

  execute(resource, context){
    if (Array.isArray(resource)){
      return resource.map( r => this.execute(r, context)).filter(n => n);
    }
    return this.execfn(resource, context);
  }
}

module.exports = {
  AggregateMapper,
  FilterMapper,
  buildFilter,
  buildMappers
};
